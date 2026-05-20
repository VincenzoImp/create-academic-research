import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import YAML from "yaml";

import { defaultRunner, type Runner } from "./runner.js";
import { AGENT_STACK, presetMcpServers, type McpToolCommandKey } from "./stack.js";

export const DEFAULT_AGENT = "universal";
const AUTO_AGENT = "auto";

export interface CapabilityState {
  agent: string;
  preset: string;
  scope: "project-local";
  mcp_servers: string[];
}

export interface InitializeCapabilitiesOptions {
  preset?: string;
  agent?: string;
  mcpServers?: string[];
}

export interface CapabilityCommandResult {
  ok: true;
  count?: number;
  servers?: string[];
}

export interface InstalledSkill {
  name: string;
  path: string;
  root: string;
}

export interface McpDoctorResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  enabled: string[];
}

interface SkillInstallOptions {
  agent?: string;
}

export async function readCapabilities(root: string): Promise<CapabilityState> {
  try {
    return readCapabilitiesFile(root);
  } catch (error) {
    if (isMissingFileError(error)) {
      return defaultCapabilities();
    }
    throw error;
  }
}

export async function writeCapabilities(root: string, state: Partial<CapabilityState>): Promise<void> {
  const next: CapabilityState = {
    agent: normalizeAgent(state.agent),
    preset: state.preset ?? "default",
    scope: "project-local",
    mcp_servers: [...(state.mcp_servers ?? [])]
  };
  await writeFile(join(root, "configs/capabilities.yaml"), YAML.stringify(next), "utf8");
  await writeCapabilityProfile(root, next);
  await writeMcpSnippet(root, next);
  await appendCapabilityLog(root, next);
}

export async function initializeCapabilities(
  root: string,
  options: InitializeCapabilitiesOptions = {}
): Promise<void> {
  const preset = options.preset ?? "default";
  const mcpServers = options.mcpServers ?? presetMcpServers(preset);
  await writeCapabilities(root, {
    agent: options.agent,
    preset,
    mcp_servers: mcpServers
  });
}

export async function buildSkillInstallCommands(
  root: string,
  preset = "default",
  options: SkillInstallOptions = {}
): Promise<string[][]> {
  const selected = AGENT_STACK.presets[preset];
  if (!selected) throw new Error(`unknown skill preset: ${preset}`);
  const state = await readCapabilities(root);
  const agent = normalizeAgent(options.agent ?? state.agent);
  const commands: string[][] = [];
  for (const bundleName of selected.skill_bundles) {
    const bundle = AGENT_STACK.skill_bundles[bundleName];
    if (!bundle) throw new Error(`unknown skill bundle: ${bundleName}`);
    for (const rawCommand of bundle.commands) {
      const command = splitCommand(renderSkillCommand(rawCommand, agent));
      const globalFlag = `--${"global"}`;
      if (command.includes(globalFlag) || command.includes("-g")) {
        throw new Error(`skill command is not project-local: ${rawCommand}`);
      }
      commands.push(command);
    }
  }
  return commands;
}

export async function installSkills(
  root: string,
  preset = "default",
  options: SkillInstallOptions = {},
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const state = await readCapabilities(root);
  const agent = normalizeAgent(options.agent ?? state.agent);
  const commands = await buildSkillInstallCommands(root, preset, options);
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  if (state.preset !== preset || state.agent !== agent) {
    await writeCapabilities(root, {
      ...state,
      agent,
      preset
    });
  }
  return { ok: true, count: commands.length };
}

export async function listInstalledSkills(root: string): Promise<InstalledSkill[]> {
  const roots = await discoverProjectSkillRoots(root);
  const skills: InstalledSkill[] = [];

  for (const skillsRoot of roots) {
    let entries;
    try {
      entries = await readdir(skillsRoot.absolute, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        await readFile(join(skillsRoot.absolute, entry.name, "SKILL.md"), "utf8");
      } catch {
        continue;
      }
      skills.push({
        name: entry.name,
        path: `${skillsRoot.relative}/${entry.name}`,
        root: skillsRoot.relative
      });
    }
  }
  return skills.sort((left, right) => {
    const byName = left.name.localeCompare(right.name);
    return byName === 0 ? left.path.localeCompare(right.path) : byName;
  });
}

export async function removeSkills(
  root: string,
  skills: string[],
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  if (skills.length === 0) throw new Error("no skills selected");
  await runner.run(
    [
      "npm",
      "exec",
      "--yes",
      "--package",
      "skills",
      "--",
      "skills",
      "remove",
      ...skills,
      "-y"
    ],
    { cwd: root }
  );
  await removeSkillsFromLock(root, skills);
  return { ok: true, count: skills.length };
}

export async function updateSkills(
  root: string,
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  await runner.run(
    ["npm", "exec", "--yes", "--package", "skills", "--", "skills", "update", "--project", "-y"],
    { cwd: root }
  );
  return { ok: true };
}

export async function enableMcpServers(
  root: string,
  servers: string[],
  options: { agent?: string } = {}
): Promise<CapabilityCommandResult> {
  assertKnownMcpServers(servers);
  const state = await readCapabilities(root);
  const selected = dedupe([...(state.mcp_servers ?? []), ...servers]);
  await writeCapabilities(root, {
    ...state,
    agent: options.agent ?? state.agent,
    mcp_servers: selected
  });
  return { ok: true, servers: selected };
}

export async function disableMcpServers(
  root: string,
  servers: string[],
  options: { agent?: string } = {}
): Promise<CapabilityCommandResult> {
  assertKnownMcpServers(servers);
  const state = await readCapabilities(root);
  const blocked = new Set(servers);
  const selected = (state.mcp_servers ?? []).filter((server: string) => !blocked.has(server));
  await writeCapabilities(root, {
    ...state,
    agent: options.agent ?? state.agent,
    mcp_servers: selected
  });
  return { ok: true, servers: selected };
}

export function mcpToolCommands(servers: string[], key: McpToolCommandKey = "install_command"): string[][] {
  assertKnownMcpServers(servers);
  const commands: string[][] = [];
  for (const server of servers) {
    const rawCommand = AGENT_STACK.mcp_servers[server]?.[key];
    if (rawCommand) commands.push(splitCommand(rawCommand));
  }
  return commands;
}

export function mcpToolCommandTexts(servers: string[], key: McpToolCommandKey = "install_command"): string[] {
  assertKnownMcpServers(servers);
  const commands: string[] = [];
  for (const server of servers) {
    const rawCommand = AGENT_STACK.mcp_servers[server]?.[key];
    if (rawCommand) commands.push(rawCommand);
  }
  return commands;
}

export async function installMcpTools(
  root: string,
  servers: string[],
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const selected = servers.length > 0 ? servers : (await readCapabilities(root)).mcp_servers ?? [];
  assertKnownMcpServers(selected);
  const commands = mcpToolCommands(selected, "install_command");
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  return { ok: true, count: commands.length };
}

export async function uninstallMcpTools(
  root: string,
  servers: string[],
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const selected = servers.length > 0 ? servers : (await readCapabilities(root)).mcp_servers ?? [];
  assertKnownMcpServers(selected);
  const commands = mcpToolCommands(selected, "uninstall_command");
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  return { ok: true, count: commands.length };
}

export async function doctorMcpServers(root: string): Promise<McpDoctorResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let state: CapabilityState;
  try {
    state = await readCapabilitiesFile(root);
  } catch (error) {
    return {
      ok: false,
      errors: [`invalid configs/capabilities.yaml: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
      enabled: []
    };
  }
  const enabled = state.mcp_servers ?? [];
  const unknown = enabled.filter((server) => !AGENT_STACK.mcp_servers[server]);
  if (unknown.length > 0) {
    errors.push(`unknown MCP server in capabilities: ${unknown.join(", ")}`);
  }

  const generatedServers = new Set<string>();
  const snippetPath = join(root, "docs", "agent", "generated", mcpSnippetFileName(state.agent));
  try {
    const rawSnippet = await readFile(snippetPath, "utf8");
    const snippet = JSON.parse(rawSnippet) as {
      mcpServers?: Record<string, unknown>;
    };
    for (const name of Object.keys(snippet.mcpServers ?? {})) {
      generatedServers.add(name);
    }
  } catch (error) {
    const hasGeneratedServer = enabled.some((server) => AGENT_STACK.mcp_servers[server]?.command);
    if (hasGeneratedServer && isMissingFileError(error)) {
      errors.push(`missing generated MCP snippet: ${snippetPath}`);
    } else if (hasGeneratedServer) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`invalid generated MCP snippet: ${snippetPath}: ${message}`);
    }
  }

  for (const name of enabled) {
    const server = AGENT_STACK.mcp_servers[name];
    if (!server) continue;
    if (!server.command) {
      warnings.push(`${name}: manual setup only; no generated client command`);
      continue;
    }
    if (!generatedServers.has(name)) {
      errors.push(`${name}: enabled but missing from generated MCP snippet`);
    }
    if (!server.install_command) {
      warnings.push(`${name}: no automated install command is defined`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, enabled };
}

async function writeMcpSnippet(root: string, state: CapabilityState): Promise<void> {
  const servers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};
  for (const name of state.mcp_servers ?? []) {
    const server = AGENT_STACK.mcp_servers[name];
    if (!server?.command) continue;
    servers[name] = {
      command: server.command,
      args: server.args
    };
    if (Object.keys(server.env).length > 0) servers[name].env = server.env;
  }
  const outputDir = join(root, "docs/agent/generated");
  const outputFile = mcpSnippetFileName(state.agent);
  await mkdir(outputDir, { recursive: true });
  await removeInactiveMcpSnippets(outputDir, outputFile);
  await writeFile(
    join(outputDir, outputFile),
    `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`,
    "utf8"
  );
}

async function writeCapabilityProfile(root: string, state: CapabilityState): Promise<void> {
  const lines = [
    "# Agent Capability Profile",
    "",
    `- Agent target: \`${normalizeAgent(state.agent)}\``,
    `- Preset: \`${state.preset ?? "default"}\``,
    "- Scope: `project-local`",
    "",
    "## Skills",
    "",
    `- Install with: \`academic-research skills install --preset ${state.preset ?? "default"}\``,
    "- List installed with: `academic-research skills list`",
    "- List presets with: `academic-research skills presets`",
    "- Remove with: `academic-research skills remove <skill>`",
    "- Update with: `academic-research skills update`",
    "",
    "## MCP Servers",
    ""
  ];
  if ((state.mcp_servers ?? []).length === 0) {
    lines.push("- No MCP servers enabled.");
  } else {
    for (const name of state.mcp_servers) {
      const server = AGENT_STACK.mcp_servers[name];
      const status = server?.command ? "generated config" : "manual setup";
      lines.push(`- \`${name}\` (${status}): ${server?.smoke_test ?? "Smoke-test before use."}`);
    }
  }
  lines.push(
    "",
    "## Rules",
    "",
    "- Skill installation is project-local by default.",
    "- Agent target `universal` installs one shared project-local `.agents/skills` copy.",
    "- MCP enable/disable changes project records; install/uninstall changes external tools.",
    "- Keep API keys, tokens, cookies, and browser sessions out of git.",
    "- Cite repository source records, not raw MCP output alone.",
    ""
  );
  await writeFile(join(root, "docs/agent/capability-profile.md"), lines.join("\n"), "utf8");
}

async function appendCapabilityLog(root: string, state: CapabilityState): Promise<void> {
  const logPath = join(root, "wiki/log.md");
  const date = new Date().toISOString().slice(0, 10);
  const servers = (state.mcp_servers ?? []).join(", ") || "none";
  await appendFile(
    logPath,
    `\n## [${date}] capability | Updated project-local agent capabilities\n\n- Preset: ${state.preset}\n- Agent: ${state.agent}\n- MCP servers: ${servers}\n`,
    "utf8"
  );
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function renderSkillCommand(command: string, agent: string): string {
  const normalized = normalizeAgent(agent);
  const agentFlag = normalized === AUTO_AGENT ? "" : `--agent '${normalized}'`;
  return command.replaceAll("{agent_flag}", agentFlag).replaceAll("{agent}", normalized);
}

async function readCapabilitiesFile(root: string): Promise<CapabilityState> {
  const path = join(root, "configs/capabilities.yaml");
  return normalizeCapabilityState(YAML.parse(await readFile(path, "utf8")));
}

export function assertKnownMcpServers(servers: string[]): void {
  const unknown = servers.filter((server) => !AGENT_STACK.mcp_servers[server]);
  if (unknown.length > 0) {
    throw new Error(`unknown MCP server: ${unknown.join(", ")}`);
  }
}

function splitCommand(command: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const char of command) {
    if ((char === "'" || char === '"') && quote === null) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && quote === null) {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) result.push(current);
  if (quote !== null) throw new Error(`unterminated quote in command: ${command}`);
  return result;
}

function normalizeCapabilityState(value: unknown): CapabilityState {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    agent: normalizeAgent(typeof record.agent === "string" ? record.agent : undefined),
    preset: typeof record.preset === "string" ? record.preset : "default",
    scope: "project-local",
    mcp_servers: Array.isArray(record.mcp_servers)
      ? record.mcp_servers.filter((item): item is string => typeof item === "string")
      : []
  };
}

function defaultCapabilities(): CapabilityState {
  return { agent: DEFAULT_AGENT, preset: "default", scope: "project-local", mcp_servers: [] };
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

async function removeSkillsFromLock(root: string, skills: string[]): Promise<void> {
  const path = join(root, "skills-lock.json");
  let lock: unknown;
  try {
    lock = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
  const record = typeof lock === "object" && lock !== null ? (lock as Record<string, unknown>) : {};
  const lockedSkills =
    typeof record.skills === "object" && record.skills !== null
      ? (record.skills as Record<string, unknown>)
      : undefined;
  if (!lockedSkills) return;
  let changed = false;
  for (const skill of skills) {
    if (Object.hasOwn(lockedSkills, skill)) {
      delete lockedSkills[skill];
      changed = true;
    }
  }
  if (changed) {
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }
}

function normalizeAgent(agent: string | undefined): string {
  const value = agent?.trim();
  return value ? value : DEFAULT_AGENT;
}

function mcpSnippetFileName(agent: string | undefined): string {
  const normalized = normalizeAgent(agent);
  return normalized === DEFAULT_AGENT || normalized === AUTO_AGENT ? "mcp.json" : `${normalized}-mcp.json`;
}

async function removeInactiveMcpSnippets(outputDir: string, activeFile: string): Promise<void> {
  const entries = await readdir(outputDir);
  await Promise.all(
    entries
      .filter((entry) => entry !== activeFile && (entry === "mcp.json" || entry.endsWith("-mcp.json")))
      .map((entry) => rm(join(outputDir, entry), { force: true }))
  );
}

interface ProjectSkillRoot {
  absolute: string;
  relative: string;
}

const SKILL_DISCOVERY_IGNORES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".venv",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".tox",
  "build",
  "dist",
  "node_modules",
  "__pycache__"
]);

async function discoverProjectSkillRoots(root: string): Promise<ProjectSkillRoot[]> {
  const candidates = new Set<string>(["skills"]);
  let topLevel;
  try {
    topLevel = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of topLevel) {
    if (!entry.isDirectory() || SKILL_DISCOVERY_IGNORES.has(entry.name)) continue;
    if (!entry.name.startsWith(".")) continue;

    candidates.add(`${entry.name}/skills`);

    let children;
    try {
      children = await readdir(join(root, entry.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      if (!child.isDirectory() || SKILL_DISCOVERY_IGNORES.has(child.name)) continue;
      candidates.add(`${entry.name}/${child.name}/skills`);
    }
  }

  const roots: ProjectSkillRoot[] = [];
  for (const candidate of candidates) {
    const absolute = join(root, candidate);
    if (await hasInstalledSkill(absolute)) {
      roots.push({ absolute, relative: toPosix(relative(root, absolute)) });
    }
  }
  return roots.sort((left, right) => left.relative.localeCompare(right.relative));
}

async function hasInstalledSkill(skillsRoot: string): Promise<boolean> {
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await readFile(join(skillsRoot, entry.name, "SKILL.md"), "utf8");
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function toPosix(value: string): string {
  return value.split(/[\\/]/).join("/");
}
