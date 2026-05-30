import { existsSync } from "node:fs";
import { appendFile, chmod, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  assertKnownAgentTarget,
  AUTO_AGENT,
  DEFAULT_AGENT,
  normalizeAgentTarget,
  SUPPORTED_SKILL_AGENT_TARGETS
} from "./agents.js";
import { defaultRunner, type Runner } from "./runner.js";
import {
  AGENT_STACK,
  mcpModeLabel,
  mcpRecommendedMode,
  mcpServerModeKeys,
  mcpSupportedModeLabels,
  normalizeMcpMode,
  presetMcpServers,
  resolveMcpServer,
  type McpToolCommandKey,
  type ResolvedMcpServer
} from "./stack.js";
import { formatMcpDotenv, listMcpEnvironmentEntries } from "./mcp-env.js";
import { probeMcpServerList, type McpProbeResult as ProbeResult } from "./mcp-probe.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
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
  mcp_server_modes: Record<string, string>;
  mcp_server_remote: Record<string, McpRemoteConfig>;
}

export interface McpRemoteConfig {
  url?: string;
  url_env?: string;
  transport: "streamable-http";
  bearer_token_env_var?: string;
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
  skipped?: McpSkippedTool[];
}

export interface McpSkippedTool {
  server: string;
  reason: string;
  next?: string;
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
  mode?: string;
}

export interface RenderedMcpSnippet {
  fileName: string;
  content: string;
}

export interface CapabilityLock {
  version: number;
  generator: {
    name: "create-academic-research";
    version?: string;
    updated_at?: string;
  };
  mcp: Record<string, CapabilityLockMcpServer>;
  skills: CapabilityLockSkills;
}

export interface CapabilityLockSkills {
  preset?: string;
  agent?: string;
  explicit_skill_ids?: string[];
  last_action?: "install" | "update" | "remove";
  status?: "ready" | "updated" | "removed";
  updated_at?: string;
  sources: Record<string, CapabilityLockSkillSource>;
  skills: Record<string, CapabilityLockSkillEntry>;
}

export interface CapabilityLockSkillSource {
  source: string;
  skill_ids?: string[];
  action: "install" | "update" | "remove";
  status: "ready" | "updated" | "removed";
  updated_at?: string;
}

export interface CapabilityLockSkillEntry extends CapabilityLockSkillSource {
  root?: string;
  path?: string;
}

export interface CapabilityLockMcpServer {
  selected_mode?: string;
  connection_mode?: string;
  setup?: {
    status: "ready" | "planned" | "missing" | "skipped";
    server_path?: string;
    wrapper_path?: string;
    env_file?: string;
    updated_at?: string;
  };
  clients?: Record<string, { status: "registered" | "removed" | "manual" | "unsupported"; updated_at?: string }>;
  probe?: { status: string; detail: string; updated_at?: string };
}

export interface McpLifecycleStatus {
  servers: McpLifecycleServerStatus[];
}

export interface McpLifecycleServerStatus {
  id: string;
  selected: boolean;
  mode: string;
  mode_key: string;
  connection_mode: string;
  state: string;
  env: "ok" | "missing-required" | "missing-recommended" | "n/a";
  install: string;
  snippet: "available" | "missing" | "none";
  client: string;
  probe: string;
  next: string;
}

export interface McpLifecycleOptions {
  env?: NodeJS.ProcessEnv;
}

export interface McpSetupOptions {
  mode?: string;
  envFile?: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
}

export interface McpSetupResult {
  ok: boolean;
  server: string;
  mode: string;
  commands: string[];
  created: string[];
  warnings: string[];
  errors: string[];
  next: string[];
}

export interface McpClientOptions {
  agent?: string;
  mode?: string;
  dryRun?: boolean;
}

export interface McpClientResult {
  ok: boolean;
  server: string;
  agent: string;
  command: string[];
  instructions: string[];
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
  const next = normalizeCapabilityWriteState(state);
  await writeCapabilityConfig(root, next);
  await writeCapabilityGeneratedFiles(root, next);
  await appendCapabilityLog(root, next);
}

export async function writeCapabilityGeneratedFiles(root: string, state: CapabilityState): Promise<void> {
  await writeCapabilityProfile(root, state);
  await writeMcpSetup(root, state);
  await writeMcpSnippet(root, state);
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
    mcp_servers: mcpServers,
    mcp_server_modes: {},
    mcp_server_remote: {}
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
  await recordSkillPresetLock(root, preset, agent, "install");
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
  await recordExplicitSkillLock(root, selectedSkills, agent, "install");
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
  await recordRemovedSkillLock(root, skills);
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
  await recordSkillUpdateLock(root);
  return { ok: true };
}

export async function enableMcpServers(
  root: string,
  servers: string[],
  options: { agent?: string; mode?: string; remote?: Partial<McpRemoteConfig> } = {}
): Promise<CapabilityCommandResult> {
  assertKnownMcpServers(servers);
  const state = await readCapabilities(root);
  const selected = dedupe([...(state.mcp_servers ?? []), ...servers]);
  const mcpServerModes = { ...(state.mcp_server_modes ?? {}) };
  const mcpServerRemote = { ...(state.mcp_server_remote ?? {}) };
  for (const server of servers) {
    const mode = normalizeMcpMode(server, options.mode ?? state.mcp_server_modes?.[server]);
    if (options.mode) mcpServerModes[server] = mode;
    if (mode === "remote-custom") {
      mcpServerRemote[server] = normalizeRemoteConfig(server, options.remote ?? state.mcp_server_remote?.[server]);
    } else {
      delete mcpServerRemote[server];
    }
  }
  await writeCapabilities(root, {
    ...state,
    agent: assertKnownAgentTarget(options.agent ?? state.agent),
    mcp_servers: selected,
    mcp_server_modes: mcpServerModes,
    mcp_server_remote: mcpServerRemote
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
  const mcpServerModes = { ...(state.mcp_server_modes ?? {}) };
  const mcpServerRemote = { ...(state.mcp_server_remote ?? {}) };
  for (const server of servers) delete mcpServerModes[server];
  for (const server of servers) delete mcpServerRemote[server];
  await writeCapabilities(root, {
    ...state,
    agent: assertKnownAgentTarget(options.agent ?? state.agent),
    mcp_servers: selected,
    mcp_server_modes: mcpServerModes,
    mcp_server_remote: mcpServerRemote
  });
  return { ok: true, servers: selected };
}

export function mcpToolCommands(
  servers: string[],
  key: McpToolCommandKey = "install_command",
  modes: Record<string, string | undefined> = {}
): string[][] {
  assertKnownMcpServers(servers);
  const commands: string[][] = [];
  for (const server of servers) {
    const rawCommand = resolveMcpServer(server, modes[server])?.[key];
    if (rawCommand) commands.push(splitCommand(rawCommand));
  }
  return commands;
}

export function mcpToolCommandTexts(
  servers: string[],
  key: McpToolCommandKey = "install_command",
  modes: Record<string, string | undefined> = {}
): string[] {
  assertKnownMcpServers(servers);
  const commands: string[] = [];
  for (const server of servers) {
    const rawCommand = resolveMcpServer(server, modes[server])?.[key];
    if (rawCommand) commands.push(rawCommand);
  }
  return commands;
}

export async function installMcpTools(
  root: string,
  servers: string[],
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const state = await readCapabilities(root);
  const selected = servers.length > 0 ? servers : state.mcp_servers ?? [];
  assertKnownMcpServers(selected);
  const modes = selectedMcpServerModes(state, selected);
  const skipped: McpSkippedTool[] = [];
  const commands = mcpToolCommands(selected, "install_command", modes);
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  for (const serverName of selected) {
    const server = resolveMcpServer(serverName, modes[serverName]);
    if (!server.install_command) skipped.push(mcpInstallSkip(serverName, server));
  }
  return { ok: true, count: commands.length, skipped };
}

export async function uninstallMcpTools(
  root: string,
  servers: string[],
  runner: Runner = defaultRunner
): Promise<CapabilityCommandResult> {
  const state = await readCapabilities(root);
  const selected = servers.length > 0 ? servers : state.mcp_servers ?? [];
  assertKnownMcpServers(selected);
  const modes = selectedMcpServerModes(state, selected);
  const skipped: McpSkippedTool[] = [];
  const commands = mcpToolCommands(selected, "uninstall_command", modes);
  for (const command of commands) {
    await runner.run(command, { cwd: root });
  }
  for (const serverName of selected) {
    const server = resolveMcpServer(serverName, modes[serverName]);
    if (!server.uninstall_command) skipped.push(mcpUninstallSkip(serverName, server));
  }
  return { ok: true, count: commands.length, skipped };
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
  const modes = selectedMcpServerModes(state, enabled);
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
    const hasGeneratedServer = enabled.some((server) => isSnippetCapable(resolveMcpServerForState(state, server, modes[server])));
    if (hasGeneratedServer && isMissingFileError(error)) {
      errors.push(`missing generated MCP snippet: ${snippetPath}`);
    } else if (hasGeneratedServer) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`invalid generated MCP snippet: ${snippetPath}: ${message}`);
    }
  }

  const lock = await readCapabilityLock(root);
  const hasManualLocal = enabled.some((name) => {
    if (!AGENT_STACK.mcp_servers[name]) return false;
    const server = resolveMcpServerForState(state, name, modes[name]);
    return server.connection_mode === "manual-local";
  });
  if (hasManualLocal) {
    const gitignoreWarning = await mcpLocalSetupGitignoreWarning(root);
    if (gitignoreWarning) warnings.push(gitignoreWarning);
  }

  for (const name of enabled) {
    const server = resolveMcpServerForState(state, name, modes[name]);
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
    if (server.connection_mode === "manual-local") {
      if (lock.mcp[name]?.setup?.status !== "ready") {
        warnings.push(`${name}: local setup not complete; run npm run mcp:setup -- ${name} --mode local --env-file .env.local`);
      }
    }
    if (!isSnippetCapable(server)) {
      warnings.push(`${name}: manual setup only; no generated client command`);
      continue;
    }
    if (!generatedServers.has(name)) {
      errors.push(mcpMissingGeneratedSnippetMessage(name, server, env));
      continue;
    }
    if (
      state.agent === "codex" &&
      server.connection_mode === "manual-local" &&
      lock.mcp[name]?.setup?.status === "ready" &&
      lock.mcp[name]?.clients?.codex?.status !== "registered"
    ) {
      warnings.push(`${name} is setup locally but not registered in Codex\nNEXT: npm run mcp:client:add -- ${name} --agent codex`);
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
  const state = await readCapabilities(root);
  const modes = Object.fromEntries(
    selected.map((serverName) => [
      serverName,
      normalizeMcpMode(serverName, options.mode ?? state.mcp_server_modes?.[serverName])
    ])
  );
  const resolvedServers = Object.fromEntries(
    selected.map((serverName) => [serverName, resolveMcpServerForState(state, serverName, modes[serverName])])
  );
  const result = await probeMcpServerList(
    root,
    selected,
    env,
    timeoutMs,
    options.clientVersion,
    modes,
    resolvedServers
  );
  await updateCapabilityLock(root, (lock) => {
    for (const item of result.results) {
      const server = resolveMcpServerForState(state, item.server, modes[item.server]);
      const entry = ensureLockMcpEntry(lock, item.server, server);
      entry.probe = { status: item.status, detail: item.detail, updated_at: nowIso() };
    }
  });
  return result;
}

async function writeMcpSnippet(root: string, state: CapabilityState): Promise<void> {
  const snippet = renderMcpSnippet(state);
  const outputDir = join(root, "docs/agent/generated");
  await mkdir(outputDir, { recursive: true });
  await removeInactiveMcpSnippets(outputDir, snippet.fileName);
  await writeFile(join(outputDir, snippet.fileName), snippet.content, "utf8");
}

export function renderMcpSnippet(state: CapabilityState): RenderedMcpSnippet {
  const servers: Record<string, {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    urlEnv?: string;
    type?: string;
    bearerTokenEnvVar?: string;
  }> = {};
  const modes = selectedMcpServerModes(state, state.mcp_servers ?? []);
  for (const name of state.mcp_servers ?? []) {
    const server = resolveMcpServerForState(state, name, modes[name]);
    if (server.connection_mode === "remote-curated" && server.hosted_url) {
      servers[name] = { url: server.hosted_url, type: "streamable-http" };
      continue;
    }
    if (server.connection_mode === "remote-custom") {
      const remote = state.mcp_server_remote?.[name];
      if (remote?.url) servers[name] = { url: remote.url, type: remote.transport };
      if (remote?.url_env) servers[name] = { urlEnv: remote.url_env, type: remote.transport };
      if (remote?.bearer_token_env_var && servers[name]) {
        servers[name].bearerTokenEnvVar = remote.bearer_token_env_var;
      }
      continue;
    }
    if (!server.command) continue;
    servers[name] = { command: server.command, args: server.args };
    if (Object.keys(server.env).length > 0) servers[name].env = server.env;
  }
  return {
    fileName: mcpSnippetFileName(state.agent),
    content: `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`
  };
}

async function writeCapabilityProfile(root: string, state: CapabilityState): Promise<void> {
  await writeFile(join(root, "docs/agent/capability-profile.md"), renderCapabilityProfile(state), "utf8");
}

export function renderCapabilityProfile(state: CapabilityState): string {
  const lines = [
    "# Agent Capability Profile",
    "",
    `- Agent target: \`${assertKnownAgentTarget(state.agent)}\``,
    `- Preset: \`${state.preset ?? "default"}\``,
    "- Scope: `project-local`",
    "",
    "## Skills",
    "",
    `- Install with: \`npm run skills:install -- --preset ${state.preset ?? "default"}\``,
    "- Install selected skills with: `npm run skills:install -- <skill-id> [...]`",
    "- List installed with: `npm run skills:list`",
    "- List presets with: `npm run skills:presets`",
    "- Remove with: `npm run skills:remove -- <skill>`",
    "- Update with: `npm run skills:update`",
    "",
    "## MCP Servers",
    ""
  ];
  if ((state.mcp_servers ?? []).length === 0) {
    lines.push("- No MCP servers enabled.");
  } else {
    const modes = selectedMcpServerModes(state, state.mcp_servers);
    for (const name of state.mcp_servers) {
      const server = resolveMcpServerForState(state, name, modes[name]);
      const status = mcpModeLabel(name, modes[name]);
      lines.push(`- \`${name}\` (${status}): ${server?.smoke_test ?? "Smoke-test before use."}`);
    }
  }
  lines.push(
    "",
    "## Rules",
    "",
    "- Skill installation is project-local by default.",
    "- Agent target `universal` installs one shared project-local `.agents/skills` copy.",
    "- MCP enable/disable changes selected project records; setup/install/client/probe commands change operational state.",
    "- Keep API keys, tokens, cookies, and browser sessions out of git.",
    "- Cite repository source records, not raw MCP output alone.",
    ""
  );
  return lines.join("\n");
}

async function writeMcpSetup(root: string, state: CapabilityState): Promise<void> {
  await mkdir(join(root, "docs/agent"), { recursive: true });
  await writeFile(join(root, "docs/agent/mcp-setup.md"), renderMcpSetup(state), "utf8");
}

export function renderMcpSetup(state: CapabilityState): string {
  const enabled = new Set(state.mcp_servers ?? []);
  const modes = selectedMcpServerModes(state, state.mcp_servers ?? []);
  const lines = [
    "# MCP Setup",
    "",
    "This file is generated from the project-local academic research capability stack.",
    "MCP records are configuration snippets and setup guidance; the active MCP client must load the generated snippet before these servers become live tools.",
    "Default CLI output uses plain mode labels: local, remote, custom remote, requires local app, and manual setup. Use `npm run mcp:status -- --verbose` for technical transport details.",
    "",
    "## Enabled MCP Servers",
    ""
  ];
  if (enabled.size === 0) {
    lines.push("- None.");
  } else {
    for (const name of state.mcp_servers) {
      const server = resolveMcpServerForState(state, name, modes[name]);
      if (!server) continue;
      lines.push(
        `- \`${name}\` (${server.readiness}, ${server.priority}): ${server.source_need}`,
        `  - Source: \`${server.source}\``,
        `  - Selected mode: \`${mcpModeLabel(name, modes[name])}\``,
        `  - Technical mode: \`${server.connection_mode}\``,
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
    const resolved = enabled.has(name) ? resolveMcpServerForState(state, name, modes[name]) : resolveMcpServer(name, mcpRecommendedMode(name));
    lines.push(
      `- \`${name}\` (${status}, ${resolved.readiness}, ${resolved.priority}): ${resolved.source_need}`,
      `  - Source: \`${resolved.source}\``,
      `  - Recommended mode: \`${mcpModeLabel(name, mcpRecommendedMode(name))}\``,
      `  - Default mode: \`${mcpModeLabel(name)}\``,
      ...(server.modes ? [`  - Supported modes: ${mcpSupportedModeLabels(name).join(", ")}`] : []),
      `  - Execution mode: \`${resolved.execution_mode}\``,
      ...(resolved.hosted_url ? [`  - Hosted endpoint: <${resolved.hosted_url}>`] : []),
      ...mcpModeEndpointLines(name),
      ...resolved.setup_commands.map((command) => `  - Setup command: \`${command}\``)
    );
    appendMcpPrerequisiteLines(lines, resolved.required_env, resolved.recommended_env, resolved.local_service);
  }

  lines.push(
    "",
    "## Operating Rules",
    "",
    "- Use `.env.example` as a committed reference and put filled secrets in `.env.local`, your shell, or your MCP client secret store.",
    "- Print a dotenv-style reference with `npm run mcp:env -- --dotenv --all`.",
    "- Regenerate a dotenv-style reference with `npm run mcp:dotenv`.",
    "- Discover supported modes with `npm run mcp:modes` or `npm run mcp:modes -- openalex`.",
    "- Inspect selected-vs-ready lifecycle state with `npm run mcp:status`.",
    "- Select explicit modes with `npm run mcp:enable -- <server> --mode local` or `--mode remote` where supported.",
    "- Select a custom remote endpoint with `npm run mcp:enable -- <server> --mode remote-custom --url https://example.com/mcp`; use `--url-env <NAME>` for private URLs.",
    "- Codex automatic registration supports custom remote `--url`; if you use `--url-env`, register manually because Codex CLI has no `--url-env` option.",
    "- Explicit `--mode remote-custom` still needs `--url` or `--url-env`; otherwise smoke/probe report `missing-remote-url`.",
    "- Run manual setup with `npm run mcp:setup -- <server> --mode local --env-file .env.local`.",
    "- Register supported clients with `npm run mcp:client:add -- <server> --agent codex`; use `--dry-run` to print the command first.",
    "- Pass `--env-file .env.local` to `mcp doctor`, `mcp smoke`, or `mcp probe` when you want the CLI to read explicit local secrets.",
    "- Keep secrets in your shell, MCP client secret store, or local untracked files; do not commit tokens or API keys.",
    "- Non-secret observed setup facts are recorded in `docs/agent/capability-lock.json` when setup, client registration, or probes run.",
    "- Prefer the smallest enabled MCP set that covers the current research question.",
    "- Treat MCP output as retrieval metadata. Promote claims into repository source records only after source ingestion and citation audit.",
    "- Run `npm run mcp:doctor` after changing MCP records or environment variables.",
    "- Run `npm run mcp:probe -- <server>` only when you intentionally want to start selected local stdio MCP server processes; remote endpoints report configured status without a network probe.",
    ""
  );
  return lines.join("\n");
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

function normalizeRemoteConfig(server: string, config: Partial<McpRemoteConfig> | undefined): McpRemoteConfig {
  if (!config || (!config.url && !config.url_env)) {
    throw new Error(`${server}: remote-custom requires --url or --url-env`);
  }
  if (config.url && config.url_env) {
    throw new Error(`${server}: remote-custom accepts either --url or --url-env, not both`);
  }
  const result: McpRemoteConfig = { transport: "streamable-http" };
  if (config.url) {
    try {
      const parsed = new URL(config.url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("expected http or https URL");
      }
    } catch (error) {
      throw new Error(`${server}: invalid remote MCP URL: ${error instanceof Error ? error.message : String(error)}`);
    }
    result.url = config.url;
  }
  if (config.url_env) {
    assertEnvVarName(config.url_env, `${server}: invalid URL env var name`);
    result.url_env = config.url_env;
  }
  if (config.bearer_token_env_var) {
    assertEnvVarName(config.bearer_token_env_var, `${server}: invalid bearer token env var name`);
    result.bearer_token_env_var = config.bearer_token_env_var;
  }
  return result;
}

function assertEnvVarName(name: string, message: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`${message}: ${name}`);
  }
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

function mcpModeEndpointLines(serverName: string): string[] {
  const lines: string[] = [];
  for (const mode of mcpServerModeKeys(serverName)) {
    const server = resolveMcpServer(serverName, mode);
    if (server.hosted_url) lines.push(`  - Hosted endpoint: <${server.hosted_url}>`);
  }
  return lines;
}

function formatRuntime(command: string, args: string[]): string {
  if (!command) return "manual setup";
  return `\`${[command, ...args].join(" ")}\``;
}

export async function getMcpLifecycleStatus(
  root: string,
  options: McpLifecycleOptions = {}
): Promise<McpLifecycleStatus> {
  const state = await readCapabilities(root);
  const lock = await readCapabilityLock(root);
  const env = options.env ?? process.env;
  const generatedServers = await readGeneratedMcpServers(root, state);
  const selected = new Set(state.mcp_servers ?? []);
  const rows: McpLifecycleServerStatus[] = [];

  for (const id of Object.keys(AGENT_STACK.mcp_servers)) {
    const modeKey = selected.has(id) ? selectedMcpServerModes(state, [id])[id] : mcpRecommendedMode(id);
    const server = selected.has(id) ? resolveMcpServerForState(state, id, modeKey) : resolveMcpServer(id, modeKey);
    const envStatus = selected.has(id) ? lifecycleEnvStatus(server, env) : "n/a";
    const install = selected.has(id) ? lifecycleInstallStatus(root, id, server, lock) : "n/a";
    const snippet = selected.has(id)
      ? generatedServers.has(id)
        ? "available"
        : isSnippetCapable(server)
          ? "missing"
          : "none"
      : "none";
    const client = lifecycleClientStatus(id, server, selected.has(id), state.agent, lock);
    const probe = selected.has(id) ? lock.mcp[id]?.probe?.status ?? "unknown" : "n/a";
    rows.push({
      id,
      selected: selected.has(id),
      mode: mcpModeLabel(id, modeKey),
      mode_key: modeKey,
      connection_mode: server.connection_mode,
      state: lifecycleState(selected.has(id), envStatus, install, snippet, client, probe),
      env: envStatus,
      install,
      snippet,
      client,
      probe,
      next: lifecycleNextAction(id, server, selected.has(id), envStatus, install, snippet, client, probe)
    });
  }

  return { servers: rows };
}

export async function readCapabilityLock(root: string): Promise<CapabilityLock> {
  try {
    const parsed = JSON.parse(await readFile(capabilityLockPath(root), "utf8")) as unknown;
    const record = typeof parsed === "object" && parsed !== null ? parsed as Partial<CapabilityLock> : {};
    return {
      version: typeof record.version === "number" ? record.version : 1,
      generator: normalizeCapabilityLockGenerator(record.generator),
      mcp: typeof record.mcp === "object" && record.mcp !== null ? record.mcp as Record<string, CapabilityLockMcpServer> : {},
      skills: normalizeCapabilityLockSkills(record.skills)
    };
  } catch (error) {
    if (isMissingFileError(error)) return defaultCapabilityLock();
    throw error;
  }
}

export async function setupMcpServer(
  root: string,
  serverName: string,
  options: McpSetupOptions = {},
  runner: Runner = defaultRunner
): Promise<McpSetupResult> {
  assertKnownMcpServers([serverName]);
  const state = await readCapabilities(root);
  const mode = normalizeMcpMode(serverName, options.mode ?? state.mcp_server_modes?.[serverName]);
  const nextState = normalizeCapabilityWriteState({
    ...state,
    mcp_servers: dedupe([...(state.mcp_servers ?? []), serverName]),
    mcp_server_modes: { ...(state.mcp_server_modes ?? {}), [serverName]: mode },
    mcp_server_remote: state.mcp_server_remote ?? {}
  });
  const server = resolveMcpServerForState(nextState, serverName, mode);
  if (serverName !== "overleaf") {
    const commands = server.setup_commands.length > 0 ? server.setup_commands : [];
    return {
      ok: true,
      server: serverName,
      mode,
      commands,
      created: [],
      warnings: commands.length === 0 ? [`${serverName}: no finite setup command is defined`] : [],
      errors: [],
      next: commands.length > 0 ? commands : [`run npm run mcp:status`]
    };
  }

  const env = options.env ?? process.env;
  const required = ["OVERLEAF_TOKEN", "PROJECT_ID"];
  const missing = required.filter((name) => !envHasValue(env, name));
  const paths = overleafPaths(root);
  const commands = [
    `git clone --depth 1 https://github.com/YounesBensafia/overleaf-mcp-server.git ${paths.relativeServer}`,
    `cd ${paths.relativeServer} && uv sync`,
    `write wrapper ${paths.relativeWrapper}`
  ];
  const gitignoreWarning = await mcpLocalSetupGitignoreWarning(root);
  if (missing.length > 0) {
    return {
      ok: false,
      server: serverName,
      mode,
      commands,
      created: [],
      warnings: gitignoreWarning ? [gitignoreWarning] : [],
      errors: [`overleaf: missing required environment variable(s): ${missing.join(", ")}`],
      next: [`fill ${missing.join(", ")} in ${options.envFile ?? ".env.local"}`]
    };
  }
  if (options.dryRun) {
    return {
      ok: true,
      server: serverName,
      mode,
      commands,
      created: [],
      warnings: gitignoreWarning ? [gitignoreWarning] : [],
      errors: [],
      next: [`run npm run mcp:setup -- overleaf --mode local --env-file ${options.envFile ?? ".env.local"}`]
    };
  }

  await mkdir(paths.wrapperDir, { recursive: true });
  if (!existsSync(paths.serverDir)) {
    await runner.run(["git", "clone", "--depth", "1", "https://github.com/YounesBensafia/overleaf-mcp-server.git", paths.serverDir], {
      cwd: root
    });
  }
  await runner.run(["uv", "sync"], { cwd: paths.serverDir });
  await writeFile(paths.wrapper, renderOverleafWrapper(), "utf8");
  await writeFile(paths.launcher, renderOverleafLauncher(), "utf8");
  await chmod(paths.wrapper, 0o755);
  await chmod(paths.launcher, 0o755);
  await updateCapabilityLock(root, (lock) => {
    const entry = ensureLockMcpEntry(lock, "overleaf", server);
    entry.setup = {
      status: "ready",
      server_path: paths.relativeServer,
      wrapper_path: paths.relativeWrapper,
      env_file: mcpEnvFileRecord(root, options.envFile),
      updated_at: nowIso()
    };
  });
  await writeCapabilityConfig(root, nextState);
  await writeCapabilityGeneratedFiles(root, nextState);

  return {
    ok: true,
    server: serverName,
    mode,
    commands,
    created: [paths.relativeWrapper, paths.relativeLauncher],
    warnings: gitignoreWarning ? [gitignoreWarning] : [],
    errors: [],
    next: [
      "npm run mcp:client:add -- overleaf --agent codex",
      "npm run mcp:probe -- overleaf --env-file .env.local"
    ]
  };
}

export async function clientAddMcpServer(
  root: string,
  serverName: string,
  options: McpClientOptions = {},
  runner: Runner = defaultRunner
): Promise<McpClientResult> {
  return clientMcpServer(root, serverName, "add", options, runner);
}

export async function clientRemoveMcpServer(
  root: string,
  serverName: string,
  options: McpClientOptions = {},
  runner: Runner = defaultRunner
): Promise<McpClientResult> {
  return clientMcpServer(root, serverName, "remove", options, runner);
}

async function clientMcpServer(
  root: string,
  serverName: string,
  action: "add" | "remove",
  options: McpClientOptions,
  runner: Runner
): Promise<McpClientResult> {
  assertKnownMcpServers([serverName]);
  const state = await readCapabilities(root);
  const agent = assertKnownAgentTarget(options.agent ?? state.agent);
  const mode = normalizeMcpMode(serverName, options.mode ?? state.mcp_server_modes[serverName]);
  const server = resolveMcpServerForState(state, serverName, mode);
  if (agent !== "codex") {
    return {
      ok: false,
      server: serverName,
      agent,
      command: [],
      instructions: [`${agent} client registration is manual; load docs/agent/generated/${mcpSnippetFileName(agent)} in the client.`]
    };
  }
  const command = action === "remove"
    ? ["codex", "mcp", "remove", serverName]
    : codexAddCommand(root, serverName, server, state);
  if (action === "add") {
    const readiness = await clientRegistrationReadiness(root, serverName, server, mode, state);
    if (!readiness.ready) {
      return {
        ok: false,
        server: serverName,
        agent,
        command,
        instructions: readiness.instructions
      };
    }
  }
  if (!options.dryRun) {
    try {
      await runner.run(command, { cwd: root });
      await updateCapabilityLock(root, (lock) => {
        const entry = ensureLockMcpEntry(lock, serverName, server);
        entry.clients = entry.clients ?? {};
        entry.clients.codex = { status: action === "add" ? "registered" : "removed", updated_at: nowIso() };
      });
    } catch (error) {
      return {
        ok: false,
        server: serverName,
        agent,
        command,
        instructions: [
          `Codex CLI registration failed: ${error instanceof Error ? error.message : String(error)}`,
          `Run manually: ${command.join(" ")}`
        ]
      };
    }
  }
  return {
    ok: true,
    server: serverName,
    agent,
    command,
    instructions: options.dryRun ? [`Dry run only; no client config was changed.`] : []
  };
}

function serializeCapabilityState(state: CapabilityState): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    agent: state.agent,
    preset: state.preset,
    scope: state.scope,
    mcp_servers: state.mcp_servers
  };
  if (Object.keys(state.mcp_server_modes).length > 0) serialized.mcp_server_modes = state.mcp_server_modes;
  if (Object.keys(state.mcp_server_remote).length > 0) serialized.mcp_server_remote = state.mcp_server_remote;
  return serialized;
}

function normalizeCapabilityWriteState(state: Partial<CapabilityState>): CapabilityState {
  const mcpServers = [...(state.mcp_servers ?? [])];
  return {
    agent: assertKnownAgentTarget(state.agent),
    preset: state.preset ?? "default",
    scope: "project-local",
    mcp_servers: mcpServers,
    mcp_server_modes: normalizeMcpServerModeMap(state.mcp_server_modes ?? {}, mcpServers),
    mcp_server_remote: normalizeMcpServerRemoteMap(state.mcp_server_remote ?? {}, mcpServers, state.mcp_server_modes ?? {})
  };
}

async function writeCapabilityConfig(root: string, state: CapabilityState): Promise<void> {
  await writeFile(join(root, "configs/capabilities.yaml"), YAML.stringify(serializeCapabilityState(state)), "utf8");
}

function normalizeMcpServerModeMap(modes: Record<string, string>, servers: string[]): Record<string, string> {
  const selected = new Set(servers);
  const result: Record<string, string> = {};
  for (const [server, mode] of Object.entries(modes)) {
    if (selected.has(server)) result[server] = normalizeMcpMode(server, mode);
  }
  return result;
}

function normalizeMcpServerRemoteMap(
  remote: Record<string, McpRemoteConfig>,
  servers: string[],
  modes: Record<string, string>
): Record<string, McpRemoteConfig> {
  const selected = new Set(servers);
  const result: Record<string, McpRemoteConfig> = {};
  for (const [server, config] of Object.entries(remote)) {
    if (!selected.has(server)) continue;
    const mode = normalizeMcpMode(server, modes[server]);
    if (mode === "remote-custom") result[server] = normalizeRemoteConfig(server, config);
  }
  return result;
}

function selectedMcpServerModes(state: CapabilityState, servers: string[]): Record<string, string> {
  const modes: Record<string, string> = {};
  for (const server of servers) {
    modes[server] = normalizeMcpMode(server, state.mcp_server_modes?.[server]);
  }
  return modes;
}

export function resolveMcpServerForState(
  state: CapabilityState,
  serverName: string,
  mode?: string
): ResolvedMcpServer {
  const server = resolveMcpServer(serverName, mode ?? state.mcp_server_modes?.[serverName]);
  if (server.selected_mode !== "remote-custom") return server;
  const remote = state.mcp_server_remote?.[serverName];
  const remoteConfigured = Boolean(remote?.url || remote?.url_env);
  return {
    ...server,
    hosted_url: remote?.url ?? "",
    remote_url_env: remote?.url_env,
    remote_configured: remoteConfigured,
    required_env: remote?.url_env ? [...server.required_env, remote.url_env] : server.required_env,
    recommended_env: remote?.bearer_token_env_var
      ? [...server.recommended_env, remote.bearer_token_env_var]
      : server.recommended_env
  };
}

async function readGeneratedMcpServers(root: string, state: CapabilityState): Promise<Set<string>> {
  const generated = new Set<string>();
  try {
    const rawSnippet = await readFile(join(root, "docs", "agent", "generated", mcpSnippetFileName(state.agent)), "utf8");
    const snippet = JSON.parse(rawSnippet) as { mcpServers?: Record<string, unknown> };
    for (const name of Object.keys(snippet.mcpServers ?? {})) generated.add(name);
  } catch {
    return generated;
  }
  return generated;
}

function lifecycleEnvStatus(
  server: ResolvedMcpServer,
  env: NodeJS.ProcessEnv
): Exclude<McpLifecycleServerStatus["env"], "n/a"> {
  if (server.required_env.some((name) => !envHasValue(env, name))) return "missing-required";
  if (server.recommended_env.some((name) => !envHasValue(env, name))) return "missing-recommended";
  return "ok";
}

function lifecycleState(
  selected: boolean,
  envStatus: McpLifecycleServerStatus["env"],
  install: string,
  snippet: string,
  client: string,
  probe: string
): string {
  if (!selected) return "not selected";
  if (envStatus === "missing-required") return "missing env";
  if (install === "setup needed" || install === "requires local app" || install === "manual setup") return install;
  if (snippet === "missing") return "setup needed";
  if (client.endsWith(":not-added")) return "setup needed";
  if (probe === "unknown") return "probe needed";
  if (!isSuccessfulProbeStatus(probe)) return "probe failed";
  return "ready";
}

function lifecycleInstallStatus(
  root: string,
  serverName: string,
  server: ResolvedMcpServer,
  lock: CapabilityLock
): string {
  if (server.connection_mode === "remote-curated" || server.connection_mode === "remote-custom") return "remote";
  if (server.connection_mode === "manual-local") {
    const entry = lock.mcp[serverName];
    const setup = entry?.setup;
    if (
      setup?.status === "ready" &&
      entry?.selected_mode === server.selected_mode &&
      entry?.connection_mode === server.connection_mode &&
      setup.wrapper_path &&
      existsSync(join(root, setup.wrapper_path))
    ) {
      return "ready";
    }
    return "setup needed";
  }
  if (server.connection_mode === "local-service") return "requires local app";
  if (server.install_command) return "finite-installer";
  if (server.command) return "runtime-only";
  return "manual setup";
}

function lifecycleClientStatus(
  serverName: string,
  server: ResolvedMcpServer,
  selected: boolean,
  agent: string,
  lock: CapabilityLock
): string {
  if (!selected) return "none";
  if (!isSnippetCapable(server)) return "unsupported";
  const normalizedAgent = assertKnownAgentTarget(agent);
  if (normalizedAgent === "universal") return "snippet";
  if (normalizedAgent === "codex") {
    const status = lock.mcp[serverName]?.clients?.codex?.status;
    return status === "registered" ? "codex:registered" : "codex:not-added";
  }
  if (normalizedAgent === "claude-code" || normalizedAgent === "cursor") return `${normalizedAgent}:manual`;
  return "unknown";
}

function lifecycleNextAction(
  serverName: string,
  server: ResolvedMcpServer,
  selected: boolean,
  envStatus: string,
  install: string,
  snippet: string,
  client: string,
  probe: string
): string {
  if (!selected) {
    const recommended = mcpRecommendedMode(serverName);
    const alternatives = mcpServerModeKeys(serverName).filter((mode) => mode !== recommended);
    const altText = alternatives.length > 0
      ? `, alternative: ${alternatives.map((mode) => mcpModeKeyLabelForAction(mode)).join(", ")}`
      : "";
    return `enable ${serverName}, recommended: ${mcpModeKeyLabelForAction(recommended)}${altText}`;
  }
  if (envStatus === "missing-required") {
    if (server.connection_mode === "manual-local") {
      return `fill ${server.required_env.join(", ")} in .env.local; then run npm run mcp:setup -- ${serverName} --mode local --env-file .env.local`;
    }
    return `fill ${server.required_env.join(", ")} in .env.local`;
  }
  if (install === "setup needed" && server.connection_mode === "manual-local") {
    return `run npm run mcp:setup -- ${serverName} --mode local --env-file .env.local`;
  }
  if (install === "requires local app") {
    return server.setup_commands[0] ?? `start local service for ${serverName}`;
  }
  if (snippet === "missing") return "run npm run update -- --apply";
  if (client.endsWith(":not-added")) return `run npm run mcp:client:add -- ${serverName} --agent codex`;
  if (!isSuccessfulProbeStatus(probe)) return `run npm run mcp:probe -- ${serverName} --env-file .env.local`;
  return "ready";
}

function isSuccessfulProbeStatus(probe: string): boolean {
  return probe === "ok" || probe === "remote-configured";
}

function mcpModeKeyLabelForAction(mode: string): string {
  if (mode === "remote-custom") return "custom remote";
  if (mode === "remote") return "remote";
  if (mode === "manual") return "manual setup";
  return "local";
}

export function mcpMissingGeneratedSnippetMessage(
  serverName: string,
  server: ResolvedMcpServer,
  env: NodeJS.ProcessEnv = process.env
): string {
  const lines = [`${serverName}: enabled but missing from generated MCP snippet`];
  if (server.connection_mode === "manual-local") {
    lines.push(`NEXT: npm run mcp:setup -- ${serverName} --mode local --env-file .env.local`);
    const missing = server.required_env.filter((name) => !envHasValue(env, name));
    if (missing.length > 0) lines.push(`Missing env vars: ${missing.join(", ")}`);
  } else {
    lines.push("NEXT: npm run update -- --apply");
  }
  return lines.join("\n");
}

function mcpInstallSkip(serverName: string, server: ResolvedMcpServer): McpSkippedTool {
  if (server.connection_mode === "manual-local") {
    return {
      server: serverName,
      reason: "manual setup",
      next: `run npm run mcp:setup -- ${serverName} --mode local --env-file .env.local`
    };
  }
  if (server.connection_mode === "remote-curated" || server.connection_mode === "remote-custom") {
    return { server: serverName, reason: "remote", next: "no local installer; register the hosted endpoint with the MCP client" };
  }
  if (server.connection_mode === "local-service") {
    return {
      server: serverName,
      reason: "requires local app",
      next: server.setup_commands[0] ? `run ${server.setup_commands[0]}` : "satisfy the local service prerequisite"
    };
  }
  if (server.command) {
    return { server: serverName, reason: "runtime-only", next: "the MCP client launches it on demand" };
  }
  return { server: serverName, reason: "manual", next: "follow docs/agent/mcp-setup.md" };
}

function mcpUninstallSkip(serverName: string, server: ResolvedMcpServer): McpSkippedTool {
  const skipped = mcpInstallSkip(serverName, server);
  return { ...skipped, next: skipped.reason === "runtime-only" ? "no persistent tool was installed" : skipped.next };
}

function isSnippetCapable(server: ResolvedMcpServer): boolean {
  return Boolean(
    server.command ||
    (server.connection_mode === "remote-curated" && server.hosted_url) ||
    server.connection_mode === "remote-custom"
  );
}

function capabilityLockPath(root: string): string {
  return join(root, "docs", "agent", "capability-lock.json");
}

async function updateCapabilityLock(root: string, update: (lock: CapabilityLock) => void): Promise<void> {
  const lock = await readCapabilityLock(root);
  lock.generator = {
    name: "create-academic-research",
    version: await currentPackageVersion(),
    updated_at: nowIso()
  };
  update(lock);
  await mkdir(dirname(capabilityLockPath(root)), { recursive: true });
  await writeFile(capabilityLockPath(root), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

function defaultCapabilityLock(): CapabilityLock {
  return {
    version: 1,
    generator: { name: "create-academic-research" },
    mcp: {},
    skills: { sources: {}, skills: {} }
  };
}

function normalizeCapabilityLockGenerator(value: unknown): CapabilityLock["generator"] {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    name: "create-academic-research",
    ...(typeof record.version === "string" ? { version: record.version } : {}),
    ...(typeof record.updated_at === "string" ? { updated_at: record.updated_at } : {})
  };
}

function normalizeCapabilityLockSkills(value: unknown): CapabilityLockSkills {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    ...(typeof record.preset === "string" ? { preset: record.preset } : {}),
    ...(typeof record.agent === "string" ? { agent: record.agent } : {}),
    ...(Array.isArray(record.explicit_skill_ids)
      ? { explicit_skill_ids: record.explicit_skill_ids.filter((item): item is string => typeof item === "string") }
      : {}),
    ...(record.last_action === "install" || record.last_action === "update" || record.last_action === "remove"
      ? { last_action: record.last_action }
      : {}),
    ...(record.status === "ready" || record.status === "updated" || record.status === "removed"
      ? { status: record.status }
      : {}),
    ...(typeof record.updated_at === "string" ? { updated_at: record.updated_at } : {}),
    sources: normalizeCapabilityLockEntryMap(record.sources),
    skills: normalizeCapabilityLockEntryMap(record.skills)
  };
}

function normalizeCapabilityLockEntryMap(value: unknown): Record<string, CapabilityLockSkillEntry> {
  if (typeof value !== "object" || value === null) return {};
  const result: Record<string, CapabilityLockSkillEntry> = {};
  for (const [name, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawEntry !== "object" || rawEntry === null) continue;
    const entry = rawEntry as Record<string, unknown>;
    if (typeof entry.source !== "string") continue;
    result[name] = {
      source: entry.source,
      ...(Array.isArray(entry.skill_ids)
        ? { skill_ids: entry.skill_ids.filter((item): item is string => typeof item === "string") }
        : {}),
      action: entry.action === "update" || entry.action === "remove" ? entry.action : "install",
      status: entry.status === "updated" || entry.status === "removed" ? entry.status : "ready",
      ...(typeof entry.updated_at === "string" ? { updated_at: entry.updated_at } : {}),
      ...(typeof entry.root === "string" ? { root: entry.root } : {}),
      ...(typeof entry.path === "string" ? { path: entry.path } : {})
    };
  }
  return result;
}

function ensureLockMcpEntry(lock: CapabilityLock, serverName: string, server: ResolvedMcpServer): CapabilityLockMcpServer {
  const entry = lock.mcp[serverName] ?? {};
  entry.selected_mode = server.selected_mode;
  entry.connection_mode = server.connection_mode;
  lock.mcp[serverName] = entry;
  return entry;
}

export async function mcpLocalSetupGitignoreWarning(root: string): Promise<string | undefined> {
  if (await mcpLocalSetupPathIsIgnored(root)) return undefined;
  return [
    ".academic-research/mcp/ is not ignored",
    "NEXT: add .academic-research/mcp/ to .gitignore before committing local MCP server files"
  ].join("\n");
}

async function mcpLocalSetupPathIsIgnored(root: string): Promise<boolean> {
  try {
    const gitignore = await readFile(join(root, ".gitignore"), "utf8");
    return gitignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .some((line) => {
        const normalized = line.replaceAll("\\", "/").replace(/^\/+/, "");
        return normalized === ".academic-research/mcp/" || normalized === ".academic-research/mcp";
      });
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

function mcpEnvFileRecord(root: string, envFile: string | undefined): string {
  if (!envFile) return ".env.local";
  const resolved = resolve(root, envFile);
  const relativePath = relative(root, resolved);
  if (!relativePath.startsWith("..") && !isAbsolute(relativePath)) return toPosix(relativePath);
  return ".env.local";
}

function overleafPaths(root: string): {
  wrapperDir: string;
  serverDir: string;
  wrapper: string;
  launcher: string;
  relativeServer: string;
  relativeWrapper: string;
  relativeLauncher: string;
} {
  const relativeBase = ".academic-research/mcp/overleaf";
  const wrapperDir = join(root, relativeBase);
  return {
    wrapperDir,
    serverDir: join(wrapperDir, "server"),
    wrapper: join(wrapperDir, "run-overleaf-mcp.sh"),
    launcher: join(wrapperDir, "run-overleaf-mcp.mjs"),
    relativeServer: `${relativeBase}/server`,
    relativeWrapper: `${relativeBase}/run-overleaf-mcp.sh`,
    relativeLauncher: `${relativeBase}/run-overleaf-mcp.mjs`
  };
}

function renderOverleafWrapper(): string {
  return [
    "#!/bin/sh",
    "set -eu",
    "WRAPPER_DIR=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)",
    "# .env.local is parsed by the Node launcher; this shell wrapper never evaluates it.",
    "exec node \"$WRAPPER_DIR/run-overleaf-mcp.mjs\"",
    ""
  ].join("\n");
}

function renderOverleafLauncher(): string {
  return [
    "#!/usr/bin/env node",
    "import { existsSync, readFileSync } from 'node:fs';",
    "import { dirname, join, resolve } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "import { spawn } from 'node:child_process';",
    "",
    "const wrapperDir = dirname(fileURLToPath(import.meta.url));",
    "const projectRoot = resolve(wrapperDir, '../../..');",
    "const serverDir = process.env.OVERLEAF_MCP_SERVER_PATH || join(projectRoot, '.academic-research/mcp/overleaf/server');",
    "const envFile = process.env.ACADEMIC_RESEARCH_MCP_ENV_FILE || join(projectRoot, '.env.local');",
    "const env = { ...process.env };",
    "if (existsSync(envFile)) {",
    "  for (const [name, value] of Object.entries(parseDotenv(readFileSync(envFile, 'utf8'), envFile))) {",
    "    if (value || !(name in env)) env[name] = value;",
    "  }",
    "}",
    "env.PYTHONPATH = env.PYTHONPATH || '.';",
    "const child = spawn('uv', ['run', 'src/main.py'], { cwd: serverDir, env, stdio: 'inherit' });",
    "child.on('error', (error) => {",
    "  console.error(`Failed to launch Overleaf MCP server: ${error.message}`);",
    "  process.exitCode = 1;",
    "});",
    "child.on('exit', (code, signal) => {",
    "  if (signal) process.kill(process.pid, signal);",
    "  process.exit(code ?? 1);",
    "});",
    "",
    "function parseDotenv(raw, path) {",
    "  const env = {};",
    "  const lines = raw.split(/\\r?\\n/);",
    "  for (const [index, line] of lines.entries()) {",
    "    let text = line.trim();",
    "    if (!text || text.startsWith('#')) continue;",
    "    if (text.startsWith('export ')) text = text.slice('export '.length).trimStart();",
    "    const equals = text.indexOf('=');",
    "    if (equals === -1) throw new Error(`${path}:${index + 1}: expected KEY=value`);",
    "    const key = text.slice(0, equals).trim();",
    "    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {",
    "      throw new Error(`${path}:${index + 1}: invalid environment variable name: ${key}`);",
    "    }",
    "    env[key] = parseDotenvValue(text.slice(equals + 1).trim(), path, index + 1);",
    "  }",
    "  return env;",
    "}",
    "",
    "function parseDotenvValue(value, path, line) {",
    "  if (!value) return '';",
    "  const quote = value[0];",
    "  if (quote === \"'\" || quote === '\"') {",
    "    if (!value.endsWith(quote) || value.length === 1) throw new Error(`${path}:${line}: unterminated quoted value`);",
    "    const unquoted = value.slice(1, -1);",
    "    if (quote === \"'\") return unquoted;",
    "    return unquoted",
    "      .replaceAll('\\\\n', '\\n')",
    "      .replaceAll('\\\\r', '\\r')",
    "      .replaceAll('\\\\t', '\\t')",
    "      .replaceAll('\\\\\"', '\"')",
    "      .replaceAll('\\\\\\\\', '\\\\');",
    "  }",
    "  return value.replace(/\\s+#.*$/, '').trimEnd();",
    "}",
    ""
  ].join("\n");
}

async function clientRegistrationReadiness(
  root: string,
  serverName: string,
  server: ResolvedMcpServer,
  mode: string,
  state: CapabilityState
): Promise<{ ready: boolean; instructions: string[] }> {
  const remote = state.mcp_server_remote?.[serverName];
  if (server.connection_mode === "remote-custom" && remote?.url_env) {
    return {
      ready: false,
      instructions: [
        "Codex CLI does not support URL env vars for remote MCP endpoints.",
        `Either re-enable this server with \`npm run mcp:enable -- ${serverName} --mode remote-custom --url <url>\` if the endpoint URL may be stored in Codex config, or register it manually with \`codex mcp add ${serverName} --url "$${remote.url_env}"\` from a shell where the env var is set.`
      ]
    };
  }
  if (serverName !== "overleaf") return { ready: true, instructions: [] };
  const lock = await readCapabilityLock(root);
  const setup = lock.mcp.overleaf?.setup;
  const wrapperPath = setup?.wrapper_path ? join(root, setup.wrapper_path) : "";
  const ready =
    setup?.status === "ready" &&
    lock.mcp.overleaf?.selected_mode === mode &&
    lock.mcp.overleaf?.connection_mode === server.connection_mode &&
    Boolean(wrapperPath) &&
    existsSync(wrapperPath);
  if (ready) return { ready: true, instructions: [] };
  return {
    ready: false,
    instructions: [
      "Overleaf setup is not ready. Next: npm run mcp:setup -- overleaf --mode local --env-file .env.local"
    ]
  };
}

function codexAddCommand(
  root: string,
  serverName: string,
  server: ResolvedMcpServer,
  state: CapabilityState
): string[] {
  if ((server.connection_mode === "remote-curated" || server.connection_mode === "remote-custom") && server.hosted_url) {
    const command = ["codex", "mcp", "add", serverName, "--url", server.hosted_url];
    const tokenEnv = state.mcp_server_remote?.[serverName]?.bearer_token_env_var;
    if (tokenEnv) command.push("--bearer-token-env-var", tokenEnv);
    return command;
  }
  if (server.connection_mode === "remote-custom" && state.mcp_server_remote?.[serverName]?.url_env) {
    return [];
  }
  if (!server.command) throw new Error(`${serverName} does not have a command or hosted URL for client registration`);
  const command = commandForClient(root, server.command);
  return ["codex", "mcp", "add", serverName, "--", command, ...server.args];
}

function commandForClient(root: string, command: string): string {
  if (!command.includes("/") && !command.includes("\\")) return command;
  return isAbsolute(command) ? command : join(root, command);
}

async function recordSkillPresetLock(
  root: string,
  preset: string,
  agent: string,
  action: "install"
): Promise<void> {
  const selected = AGENT_STACK.presets[preset];
  if (!selected) return;
  await updateCapabilityLock(root, (lock) => {
    lock.skills.preset = preset;
    lock.skills.agent = agent;
    delete lock.skills.explicit_skill_ids;
    lock.skills.last_action = action;
    lock.skills.status = "ready";
    lock.skills.updated_at = nowIso();
    for (const bundleName of selected.skill_bundles) {
      for (const source of skillSourcesForBundle(bundleName)) {
        lock.skills.sources[source.key] = {
          source: source.source,
          skill_ids: source.skillIds,
          action,
          status: "ready",
          updated_at: nowIso()
        };
      }
    }
  });
}

async function recordExplicitSkillLock(
  root: string,
  skills: string[],
  agent: string,
  action: "install"
): Promise<void> {
  await updateCapabilityLock(root, (lock) => {
    lock.skills.agent = agent;
    lock.skills.explicit_skill_ids = skills;
    lock.skills.last_action = action;
    lock.skills.status = "ready";
    lock.skills.updated_at = nowIso();
    for (const skill of skills) {
      const source = skillSourceForId(skill);
      if (!source) continue;
      lock.skills.skills[skill] = {
        source,
        action,
        status: "ready",
        updated_at: nowIso()
      };
    }
  });
}

async function recordSkillUpdateLock(root: string): Promise<void> {
  await updateCapabilityLock(root, (lock) => {
    lock.skills.last_action = "update";
    lock.skills.status = "updated";
    lock.skills.updated_at = nowIso();
    for (const entry of Object.values(lock.skills.sources)) {
      entry.action = "update";
      entry.status = "updated";
      entry.updated_at = nowIso();
    }
    for (const entry of Object.values(lock.skills.skills)) {
      entry.action = "update";
      entry.status = "updated";
      entry.updated_at = nowIso();
    }
  });
}

async function recordRemovedSkillLock(root: string, skills: string[]): Promise<void> {
  await updateCapabilityLock(root, (lock) => {
    lock.skills.last_action = "remove";
    lock.skills.status = "removed";
    lock.skills.updated_at = nowIso();
    for (const skill of normalizeSkillIds(skills)) {
      const source = skillSourceForId(skill) ?? lock.skills.skills[skill]?.source ?? "unknown";
      lock.skills.skills[skill] = {
        source,
        action: "remove",
        status: "removed",
        updated_at: nowIso()
      };
    }
  });
}

interface SkillSourceSelection {
  key: string;
  source: string;
  skillIds: string[];
}

function skillSourcesForBundle(bundleName: string): SkillSourceSelection[] {
  const bundle = AGENT_STACK.skill_bundles[bundleName];
  if (!bundle) return [];
  const selections = new Map<string, SkillSourceSelection>();
  for (const command of bundle.commands) {
    const match = /\bskills\s+add\s+(\S+)/.exec(command);
    const source = match?.[1];
    if (!source) continue;
    const knownSource = skillSourceEntryForSource(source);
    const key = knownSource?.key ?? bundleName;
    const skillIds = skillIdsForBundleCommand(command, source);
    const existing = selections.get(key);
    selections.set(key, {
      key,
      source,
      skillIds: [...new Set([...(existing?.skillIds ?? []), ...skillIds])]
    });
  }
  return [...selections.values()];
}

function skillSourceEntryForSource(source: string): { key: string; skills: string[] } | undefined {
  for (const [key, entry] of Object.entries(AGENT_STACK.skill_sources)) {
    if (entry.source === source) return { key, skills: entry.skills };
  }
  return undefined;
}

function skillIdsForBundleCommand(command: string, source: string): string[] {
  const known = skillSourceEntryForSource(source);
  const tokens = splitCommand(command);
  const skillFlag = tokens.indexOf("--skill");
  if (skillFlag === -1) return known?.skills ?? [];
  const selected: string[] = [];
  for (let index = skillFlag + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith("-")) break;
    if (token === "*") return known?.skills ?? [];
    selected.push(token);
  }
  return selected.length > 0 ? selected : known?.skills ?? [];
}

function nowIso(): string {
  return new Date().toISOString();
}

async function currentPackageVersion(): Promise<string | undefined> {
  try {
    const parsed = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : undefined;
  } catch {
    return undefined;
  }
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
  const servers = Array.isArray(record.mcp_servers)
    ? record.mcp_servers.filter((item): item is string => typeof item === "string")
    : [];
  const modeRecord =
    typeof record.mcp_server_modes === "object" && record.mcp_server_modes !== null
      ? record.mcp_server_modes as Record<string, unknown>
      : {};
  const mcpServerModes: Record<string, string> = {};
  for (const [server, mode] of Object.entries(modeRecord)) {
    if (typeof mode === "string" && servers.includes(server)) {
      mcpServerModes[server] = normalizeMcpMode(server, mode);
    }
  }
  const remoteRecord =
    typeof record.mcp_server_remote === "object" && record.mcp_server_remote !== null
      ? record.mcp_server_remote as Record<string, unknown>
      : {};
  const mcpServerRemote: Record<string, McpRemoteConfig> = {};
  for (const [server, config] of Object.entries(remoteRecord)) {
    if (!servers.includes(server)) continue;
    if (normalizeMcpMode(server, mcpServerModes[server]) !== "remote-custom") continue;
    if (typeof config === "object" && config !== null) {
      mcpServerRemote[server] = normalizeRemoteConfig(server, config as Partial<McpRemoteConfig>);
    }
  }
  return {
    agent: assertKnownAgentTarget(typeof record.agent === "string" ? record.agent : undefined),
    preset: typeof record.preset === "string" ? record.preset : "default",
    scope: "project-local",
    mcp_servers: servers,
    mcp_server_modes: mcpServerModes,
    mcp_server_remote: mcpServerRemote
  };
}

function defaultCapabilities(): CapabilityState {
  return {
    agent: DEFAULT_AGENT,
    preset: "default",
    scope: "project-local",
    mcp_servers: [],
    mcp_server_modes: {},
    mcp_server_remote: {}
  };
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
