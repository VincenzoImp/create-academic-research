import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import YAML from "yaml";

import {
  assertKnownAgentTarget,
  AUTO_AGENT,
  DEFAULT_AGENT,
  normalizeAgentTarget,
  SUPPORTED_SKILL_AGENT_TARGETS
} from "./agents.js";
import { defaultRunner, type Runner } from "./runner.js";
import { AGENT_STACK, presetMcpServers, type McpToolCommandKey } from "./stack.js";
import { formatMcpDotenv, listMcpEnvironmentEntries } from "./mcp-env.js";
import { probeMcpServerList, type McpProbeResult as ProbeResult } from "./mcp-probe.js";
export { formatMcpDotenv, listMcpEnvironmentEntries };
export {
  mergeMcpEnvironment,
  readMcpEnvironmentFile,
  type McpEnvironmentEntry
} from "./mcp-env.js";
export {
  type McpProbeResult,
  type McpProbeServerResult,
  type McpProbeStatus
} from "./mcp-probe.js";

export { DEFAULT_AGENT, SUPPORTED_SKILL_AGENT_TARGETS };

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
  skills?: string[];
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

export interface McpDoctorOptions {
  env?: NodeJS.ProcessEnv;
}

export interface McpProbeOptions {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  clientVersion?: string;
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
    agent: assertKnownAgentTarget(state.agent),
    preset: state.preset ?? "default",
    scope: "project-local",
    mcp_servers: [...(state.mcp_servers ?? [])]
  };
  await writeFile(join(root, "configs/capabilities.yaml"), YAML.stringify(next), "utf8");
  await writeCapabilityProfile(root, next);
  await writeMcpSetup(root, next);
  await writeMcpSnippet(root, next);
  await appendCapabilityLog(root, next);
}

export async function writeMcpEnvironmentExample(root: string): Promise<void> {
  await writeFile(join(root, ".env.example"), formatMcpDotenv(Object.keys(AGENT_STACK.mcp_servers)), "utf8");
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
  const agent = assertKnownAgentTarget(options.agent ?? state.agent);
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

export async function buildExplicitSkillInstallCommands(
  root: string,
  skills: string[],
  options: SkillInstallOptions = {}
): Promise<string[][]> {
  const selectedSkills = normalizeSkillIds(skills);
  const state = await readCapabilities(root);
  const agent = assertKnownAgentTarget(options.agent ?? state.agent);
  const skillsBySource = new Map<string, string[]>();

  for (const skill of selectedSkills) {
    const source = skillSourceForId(skill);
    if (!source) throw new Error(`unknown skill id: ${skill}`);
    const sourceSkills = skillsBySource.get(source) ?? [];
    sourceSkills.push(skill);
    skillsBySource.set(source, sourceSkills);
  }

  return [...skillsBySource.entries()].map(([source, sourceSkills]) =>
    skillAddCommand(source, sourceSkills, agent)
  );
}

export async function installSkills(
  root: string,
  preset = "default",
  options: SkillInstallOptions = {},
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const state = await readCapabilities(root);
  const agent = assertKnownAgentTarget(options.agent ?? state.agent);
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

export async function installSkillIds(
  root: string,
  skills: string[],
  options: SkillInstallOptions = {},
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const state = await readCapabilities(root);
  const agent = assertKnownAgentTarget(options.agent ?? state.agent);
  const selectedSkills = normalizeSkillIds(skills);
  const commands = await buildExplicitSkillInstallCommands(root, selectedSkills, options);
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  if (state.agent !== agent) {
    await writeCapabilities(root, {
      ...state,
      agent
    });
  }
  return { ok: true, count: commands.length, skills: selectedSkills };
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
    agent: assertKnownAgentTarget(options.agent ?? state.agent),
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
    agent: assertKnownAgentTarget(options.agent ?? state.agent),
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

export async function doctorMcpServers(root: string, options: McpDoctorOptions = {}): Promise<McpDoctorResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = options.env ?? process.env;
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
    for (const envName of server.required_env) {
      if (!envHasValue(env, envName)) {
        errors.push(`${name}: missing required environment variable: ${envName}`);
      }
    }
    for (const envName of server.recommended_env) {
      if (!envHasValue(env, envName)) {
        warnings.push(`${name}: recommended environment variable not set: ${envName}`);
      }
    }
    if (server.local_service) {
      warnings.push(`${name}: requires local service: ${server.local_service}`);
    }
    if (!server.command) {
      warnings.push(`${name}: manual setup only; no generated client command`);
      continue;
    }
    if (!generatedServers.has(name)) {
      errors.push(`${name}: enabled but missing from generated MCP snippet`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, enabled };
}

export async function probeMcpServers(
  root: string,
  servers: string[],
  options: McpProbeOptions = {}
): Promise<ProbeResult> {
  const selected = servers.length > 0 ? servers : (await readCapabilities(root)).mcp_servers ?? [];
  const env = options.env ?? process.env;
  const timeoutMs = options.timeoutMs ?? 5000;
  return probeMcpServerList(root, selected, env, timeoutMs, options.clientVersion);
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
    `- Agent target: \`${assertKnownAgentTarget(state.agent)}\``,
    `- Preset: \`${state.preset ?? "default"}\``,
    "- Scope: `project-local`",
    "",
    "## Skills",
    "",
    `- Install with: \`academic-research skills install --preset ${state.preset ?? "default"}\``,
    "- Install selected skills with: `academic-research skills install <skill-id> [...]`",
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
      const status = server?.command ? server.execution_mode : "manual setup";
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

async function writeMcpSetup(root: string, state: CapabilityState): Promise<void> {
  const enabled = new Set(state.mcp_servers ?? []);
  const lines = [
    "# MCP Setup",
    "",
    "This file is generated from the project-local academic research capability stack.",
    "MCP records are configuration snippets and setup guidance; the active MCP client must load the generated snippet before these servers become live tools.",
    "",
    "## Enabled MCP Servers",
    ""
  ];
  if (enabled.size === 0) {
    lines.push("- None.");
  } else {
    for (const name of state.mcp_servers) {
      const server = AGENT_STACK.mcp_servers[name];
      if (!server) continue;
      lines.push(
        `- \`${name}\` (${server.readiness}, ${server.priority}): ${server.source_need}`,
        `  - Source: \`${server.source}\``,
        `  - Execution mode: \`${server.execution_mode}\``,
        ...(server.hosted_url ? [`  - Hosted endpoint: <${server.hosted_url}>`] : []),
        `  - Runtime: ${formatRuntime(server.command, server.args)}`,
        `  - Install command: ${server.install_command ? `\`${server.install_command}\`` : "none; runtime-only or manual setup"}`,
        ...server.setup_commands.map((command) => `  - Setup command: \`${command}\``),
        `  - Smoke test: ${server.smoke_test}`,
        `  - Risks: ${server.risks}`
      );
      appendMcpPrerequisiteLines(lines, server.required_env, server.recommended_env, server.local_service);
    }
  }

  lines.push("", "## Available MCP Catalog", "");
  for (const [name, server] of Object.entries(AGENT_STACK.mcp_servers)) {
    const status = enabled.has(name) ? "enabled" : "available";
    lines.push(
      `- \`${name}\` (${status}, ${server.readiness}, ${server.priority}): ${server.source_need}`,
      `  - Source: \`${server.source}\``,
      `  - Execution mode: \`${server.execution_mode}\``,
      ...(server.hosted_url ? [`  - Hosted endpoint: <${server.hosted_url}>`] : []),
      ...server.setup_commands.map((command) => `  - Setup command: \`${command}\``)
    );
    appendMcpPrerequisiteLines(lines, server.required_env, server.recommended_env, server.local_service);
  }

  lines.push(
    "",
    "## Operating Rules",
    "",
    "- Use `.env.example` as a committed reference and put filled secrets in `.env.local`, your shell, or your MCP client secret store.",
    "- Print a dotenv-style reference with `npx academic-research mcp env --dotenv --all`.",
    "- Regenerate a dotenv-style reference with `npx academic-research mcp env --write .env.example --all`.",
    "- Pass `--env-file .env.local` to `mcp doctor`, `mcp smoke`, or `mcp probe` when you want the CLI to read explicit local secrets.",
    "- Keep secrets in your shell, MCP client secret store, or local untracked files; do not commit tokens or API keys.",
    "- Prefer the smallest enabled MCP set that covers the current research question.",
    "- Treat MCP output as retrieval metadata. Promote claims into repository source records only after source ingestion and citation audit.",
    "- Run `npx academic-research mcp doctor` after changing MCP records or environment variables.",
    "- Run `npx academic-research mcp probe <server>` only when you intentionally want to start selected MCP server processes.",
    ""
  );
  await mkdir(join(root, "docs/agent"), { recursive: true });
  await writeFile(join(root, "docs/agent/mcp-setup.md"), lines.join("\n"), "utf8");
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

function envHasValue(env: NodeJS.ProcessEnv, name: string): boolean {
  return typeof env[name] === "string" && env[name] !== "";
}

function renderSkillCommand(command: string, agent: string): string {
  const normalized = assertKnownAgentTarget(agent);
  const agentFlag = normalized === AUTO_AGENT ? "" : `--agent '${normalized}'`;
  return command.replaceAll("{agent_flag}", agentFlag).replaceAll("{agent}", normalized);
}

function skillAddCommand(source: string, skills: string[], agent: string): string[] {
  return [
    "npm",
    "exec",
    "--yes",
    "--package",
    "skills",
    "--",
    "skills",
    "add",
    source,
    ...skillAgentArgs(agent),
    "--skill",
    ...skills,
    "--copy",
    "-y"
  ];
}

function skillAgentArgs(agent: string): string[] {
  const normalized = assertKnownAgentTarget(agent);
  return normalized === AUTO_AGENT ? [] : ["--agent", normalized];
}

function normalizeSkillIds(skills: string[]): string[] {
  if (skills.length === 0) throw new Error("no skills selected");
  const result: string[] = [];
  for (const skill of skills) {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(skill)) {
      throw new Error(`invalid skill id: ${skill}`);
    }
    if (!result.includes(skill)) result.push(skill);
  }
  return result;
}

function skillSourceForId(skill: string): string | undefined {
  for (const source of Object.values(AGENT_STACK.skill_sources)) {
    if (source.skills.includes(skill)) return source.source;
  }
  return undefined;
}

function appendMcpPrerequisiteLines(
  lines: string[],
  requiredEnv: string[],
  recommendedEnv: string[],
  localService: string
): void {
  if (requiredEnv.length > 0) lines.push(`  - Requires env: ${requiredEnv.map((name) => `\`${name}\``).join(", ")}`);
  if (recommendedEnv.length > 0) {
    lines.push(`  - Recommended env: ${recommendedEnv.map((name) => `\`${name}\``).join(", ")}`);
  }
  if (localService) lines.push(`  - Local prerequisite: ${localService}`);
}

function formatRuntime(command: string, args: string[]): string {
  if (!command) return "manual setup";
  return `\`${[command, ...args].join(" ")}\``;
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
    agent: assertKnownAgentTarget(typeof record.agent === "string" ? record.agent : undefined),
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

function mcpSnippetFileName(agent: string | undefined): string {
  const normalized = normalizeAgentTarget(agent);
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
