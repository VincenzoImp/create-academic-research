import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertKnownMcpServers,
  clientAddMcpServer,
  clientRemoveMcpServer,
  disableMcpServers,
  doctorMcpServers,
  enableMcpServers,
  DEFAULT_AGENT,
  getMcpLifecycleStatus,
  installMcpTools,
  installSkillIds,
  installSkills,
  formatMcpDotenv,
  listInstalledSkills,
  listMcpEnvironmentEntries,
  mergeMcpEnvironment,
  mcpToolCommandTexts,
  probeMcpServers,
  readCapabilities,
  readMcpEnvironmentFile,
  removeSkills,
  resolveMcpServerForState,
  setupMcpServer,
  uninstallMcpTools,
  updateSkills
} from "./capabilities.js";
import { createProject, doctorProject, initProject, renameProject, updateProject } from "./project.js";
import { askCreateOptions } from "./prompts.js";
import type { CreatePromptAnswers, CreatePromptDefaults } from "./prompts.js";
import {
  AGENT_STACK,
  mcpModeLabel,
  mcpRecommendedMode,
  mcpServerModeKeys,
  mcpSupportedModeLabels,
  presetMcpServers,
  resolveMcpServer
} from "./stack.js";
import { formatAgentAliasLines, formatAgentTargetList, formatSupportedAgentTargetLines } from "./agents.js";
import { packageify, slugify, titleFromSlug } from "./names.js";

type CliMode = "create" | "lifecycle";
type FlagValue = string | boolean | undefined;

interface ParsedArgs {
  flags: Record<string, FlagValue>;
  positionals: string[];
}

interface FlagSchema {
  boolean: Set<string>;
  string: Set<string>;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageVersion = readPackageVersion();

const CREATE_FLAGS = flagSchema(
  [
    "yes",
    "help",
    "version",
    "install-skills",
    "no-install-skills",
    "install-mcp-tools",
    "no-install-mcp-tools"
  ],
  ["title", "slug", "package", "preset", "profile", "agent"]
);

const ROOT_FLAGS = flagSchema(["help"], ["root"]);
const UPDATE_FLAGS = flagSchema(["help", "dry-run", "apply"], ["root"]);
const INIT_FLAGS = flagSchema(
  ["help", "install-skills"],
  ["root", "title", "slug", "package", "preset", "profile", "agent"]
);
const RENAME_FLAGS = flagSchema(["help"], ["root", "title", "slug", "package"]);
const SKILLS_FLAGS = flagSchema(["help"], ["root", "preset", "agent"]);
const MCP_FLAGS = flagSchema(
  ["help", "all", "dotenv", "required", "recommended", "dry-run", "verbose"],
  ["root", "agent", "env-file", "write", "timeout-ms", "mode", "url", "url-env", "bearer-token-env-var"]
);

export async function main(argv: string[] = process.argv.slice(2), mode: CliMode = "create"): Promise<number> {
  try {
    if (mode === "create") return await createMain(argv);
    return await lifecycleMain(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function createMain(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, CREATE_FLAGS);
  const target = parsed.positionals[0];
  if (flagBool(parsed.flags, "help")) {
    printCreateHelp();
    return 0;
  }
  if (flagBool(parsed.flags, "version")) {
    console.log(packageVersion);
    return 0;
  }
  if (!target) {
    printMissingTargetHelp();
    return 1;
  }
  if (flagBool(parsed.flags, "install-skills") && flagBool(parsed.flags, "no-install-skills")) {
    throw new Error("cannot use --install-skills and --no-install-skills together");
  }
  if (flagBool(parsed.flags, "install-mcp-tools") && flagBool(parsed.flags, "no-install-mcp-tools")) {
    throw new Error("cannot use --install-mcp-tools and --no-install-mcp-tools together");
  }
  if (parsed.positionals.length > 1) {
    throw new Error(`unexpected argument: ${parsed.positionals[1]}`);
  }
  const targetName = basename(resolve(target));
  const defaults: CreatePromptDefaults = {
    title: flagString(parsed.flags, "title") ?? titleFromSlug(targetName),
    slug: flagString(parsed.flags, "slug") ?? slugify(targetName),
    packageName: flagString(parsed.flags, "package") ?? packageify(targetName),
    preset: flagString(parsed.flags, "preset") ?? "default",
    agent: flagString(parsed.flags, "agent") ?? DEFAULT_AGENT,
    installSkills: !flagBool(parsed.flags, "no-install-skills"),
    installMcpTools: flagBool(parsed.flags, "install-mcp-tools")
  };
  const interactive = !flagBool(parsed.flags, "yes") && process.stdin.isTTY;
  const installSkillsLock =
    flagBool(parsed.flags, "install-skills") || flagBool(parsed.flags, "no-install-skills")
      ? defaults.installSkills
      : undefined;
  const installMcpToolsLock =
    flagBool(parsed.flags, "install-mcp-tools") || flagBool(parsed.flags, "no-install-mcp-tools")
      ? defaults.installMcpTools
      : undefined;
  const answers: CreatePromptAnswers = interactive
    ? await askInteractiveCreateOptions(defaults, {
        installSkills: installSkillsLock,
        installMcpTools: installMcpToolsLock
      })
    : defaults;
  const result = await createProject({
    target,
    title: answers.title,
    slug: answers.slug,
    packageName: answers.packageName,
    profile: flagString(parsed.flags, "profile") ?? "academic-general",
    preset: answers.preset,
    agent: answers.agent,
    installSkills: answers.installSkills
  });
  if (answers.installMcpTools) {
    await installMcpTools(result.root, presetMcpServers(answers.preset));
  }
  console.log(`Created ${result.slug} at ${result.root}`);
  console.log("Next: cd into the project and run `npm run doctor`.");
  return 0;
}

async function askInteractiveCreateOptions(
  defaults: CreatePromptDefaults,
  locks: { installSkills?: boolean; installMcpTools?: boolean }
): Promise<CreatePromptAnswers> {
  console.log(formatInteractiveCreateGuide());
  return askCreateOptions(defaults, locks);
}

async function lifecycleMain(argv: string[]): Promise<number> {
  const command = argv[0] ?? "help";
  if (command === "--help" || command === "-h") {
    printLifecycleHelp();
    return 0;
  }
  if (command === "--version" || command === "-v") {
    console.log(packageVersion);
    return 0;
  }
  if (command === "doctor") return doctorCommand(argv.slice(1));
  if (command === "update") return updateCommand(argv.slice(1));
  if (command === "init") return initCommand(argv.slice(1));
  if (command === "setup") return setupCommand(argv.slice(1));
  if (command === "rename") return renameCommand(argv.slice(1));
  if (command === "agents") return agentsCommand(argv.slice(1));
  if (command === "skills") return skillsCommand(argv.slice(1));
  if (command === "mcp") return mcpCommand(argv.slice(1));
  printLifecycleHelp();
  return command === "help" ? 0 : 1;
}

async function doctorCommand(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, ROOT_FLAGS);
  if (flagBool(parsed.flags, "help")) {
    printLifecycleHelp();
    return 0;
  }
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const result = await doctorProject(root);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  if (result.ok) console.log(`OK: ${root}`);
  return result.ok ? 0 : 1;
}

async function updateCommand(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, UPDATE_FLAGS);
  if (flagBool(parsed.flags, "help")) {
    printUpdateHelp();
    return 0;
  }
  assertNoArguments(parsed.positionals, "update");
  if (flagBool(parsed.flags, "dry-run") && flagBool(parsed.flags, "apply")) {
    throw new Error("update cannot use --dry-run and --apply together");
  }
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const apply = flagBool(parsed.flags, "apply");
  const result = await updateProject(root, { apply });
  console.log(`${apply ? "UPDATED" : "DRY-RUN"}: ${root}`);
  if (result.changes.length === 0) {
    console.log("No managed file changes.");
  } else {
    for (const change of result.changes) {
      console.log(`${change.action}\t${change.path}${change.reason ? `\t${change.reason}` : ""}`);
    }
  }
  if (!apply && result.changes.length > 0) {
    console.log("Run `npm run update -- --apply` from a generated project to write these managed changes.");
  }
  return 0;
}

async function initCommand(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, INIT_FLAGS);
  if (flagBool(parsed.flags, "help")) {
    printInitHelp();
    return 0;
  }
  assertNoArguments(parsed.positionals, "init");
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const result = await initProject({
    target: root,
    title: flagString(parsed.flags, "title"),
    slug: flagString(parsed.flags, "slug"),
    packageName: flagString(parsed.flags, "package"),
    profile: flagString(parsed.flags, "profile") ?? "academic-general",
    preset: flagString(parsed.flags, "preset") ?? "default",
    agent: flagString(parsed.flags, "agent") ?? DEFAULT_AGENT,
    installSkills: flagBool(parsed.flags, "install-skills")
  });
  console.log(`Initialized ${result.slug} at ${result.root}`);
  console.log("Next: run `npm run doctor`.");
  return 0;
}

async function setupCommand(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, ROOT_FLAGS);
  if (flagBool(parsed.flags, "help")) {
    printSetupHelp();
    return 0;
  }
  assertNoArguments(parsed.positionals, "setup");
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const project = await doctorProject(root);
  const state = await readCapabilities(root);
  const skills = await listInstalledSkills(root);
  const skillIds = new Set(skills.map((skill) => skill.name));

  console.log("Project Setup");
  console.log(`root\t${root}`);
  console.log(`doctor\t${project.ok ? "ok" : "error"}`);
  console.log(`agent\t${state.agent}`);
  console.log(`preset\t${state.preset}`);
  console.log(`scope\t${state.scope}`);
  console.log(`installed_skill_ids\t${skillIds.size}`);
  console.log(`installed_skill_copies\t${skills.length}`);
  console.log(`mcp_enabled\t${state.mcp_servers.length > 0 ? state.mcp_servers.join(",") : "none"}`);
  console.log(`mcp_selected\t${state.mcp_servers.length > 0 ? state.mcp_servers.join(",") : "none"}`);
  if (!project.ok) {
    for (const error of project.errors) console.error(`ERROR: ${error}`);
  }
  for (const warning of project.warnings) console.warn(`WARN: ${warning}`);
  const lifecycle = await getMcpLifecycleStatus(root);
  console.log("");
  console.log("Next Commands");
  console.log(`npm run skills:install -- --preset ${state.preset}`);
  console.log("npm run skills:status");
  console.log("npm run mcp:list");
  console.log("npm run mcp:status");
  console.log("npm run mcp:env");
  console.log("npm run mcp:dotenv");
  console.log("npm run mcp:smoke");
  for (const item of lifecycle.servers.filter((server) => server.selected)) {
    for (const command of setupNextCommands(item)) {
      console.log(command);
    }
  }
  console.log("npm run doctor");
  return project.ok ? 0 : 1;
}

async function renameCommand(argv: string[]): Promise<number> {
  const parsed = parseFlags(argv, RENAME_FLAGS);
  if (flagBool(parsed.flags, "help")) {
    printLifecycleHelp();
    return 0;
  }
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const result = await renameProject(root, {
    title: flagString(parsed.flags, "title"),
    slug: flagString(parsed.flags, "slug"),
    packageName: flagString(parsed.flags, "package")
  });
  console.log(`Renamed project to ${result.slug}`);
  return 0;
}

async function agentsCommand(argv: string[]): Promise<number> {
  const subcommand = argv[0] ?? "list";
  const parsed = parseFlags(argv.slice(1), ROOT_FLAGS);
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h" || flagBool(parsed.flags, "help")) {
    printAgentsHelp();
    return 0;
  }
  if (subcommand === "list") {
    assertOnlyOptions(parsed.flags, "agents list", []);
    assertNoArguments(parsed.positionals, "agents list");
    process.stdout.write(formatAgentTargetList());
    return 0;
  }
  throw new Error(`unknown agents command: ${subcommand}`);
}

async function skillsCommand(argv: string[]): Promise<number> {
  const subcommand = argv[0] ?? "list";
  const parsed = parseFlags(argv.slice(1), SKILLS_FLAGS);
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h" || flagBool(parsed.flags, "help")) {
    printSkillsHelp();
    return 0;
  }
  if (subcommand === "list") {
    assertOnlyOptions(parsed.flags, "skills list", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "skills list");
    const skills = await listInstalledSkills(root);
    if (skills.length === 0) {
      console.log("No project-local skills installed.");
    } else {
      for (const skill of skills) console.log(`${skill.name}\t${skill.path}`);
    }
    return 0;
  }
  if (subcommand === "status") {
    assertOnlyOptions(parsed.flags, "skills status", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "skills status");
    const state = await readCapabilities(root);
    const skills = await listInstalledSkills(root);
    const skillRoots = new Set(skills.map((skill) => skill.root));
    const skillIds = new Set(skills.map((skill) => skill.name));
    console.log(`agent\t${state.agent}`);
    console.log(`project_preset\t${state.preset}`);
    console.log(`scope\t${state.scope}`);
    console.log(`skill_roots\t${skillRoots.size}`);
    console.log(`installed_skill_ids\t${skillIds.size}`);
    console.log(`installed_skill_copies\t${skills.length}`);
    return 0;
  }
  if (subcommand === "presets") {
    assertOnlyOptions(parsed.flags, "skills presets", []);
    assertNoArguments(parsed.positionals, "skills presets");
    for (const [name, preset] of Object.entries(AGENT_STACK.presets)) {
      console.log(`${name}: ${preset.description}`);
    }
    return 0;
  }
  if (subcommand === "install") {
    assertOnlyOptions(parsed.flags, "skills install", ["root", "preset", "agent"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const explicitSkills = parsed.positionals;
    const explicitPreset = flagString(parsed.flags, "preset");
    if (explicitSkills.length > 0) {
      if (explicitPreset) throw new Error("skills install does not accept --preset when skill ids are provided");
      const result = await installSkillIds(root, explicitSkills, {
        agent: flagString(parsed.flags, "agent")
      });
      console.log(
        `Installed ${result.skills?.length ?? explicitSkills.length} skill(s) with ${result.count ?? 0} command(s).`
      );
      return 0;
    }
    const preset = explicitPreset ?? "default";
    const result = await installSkills(root, preset, {
      agent: flagString(parsed.flags, "agent")
    });
    console.log(`Installed skill preset ${preset} with ${result.count ?? 0} command(s).`);
    return 0;
  }
  if (subcommand === "remove" || subcommand === "uninstall") {
    if (flagString(parsed.flags, "agent")) {
      throw new Error("skills remove is project-local and does not take --agent");
    }
    assertOnlyOptions(parsed.flags, `skills ${subcommand}`, ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const result = await removeSkills(root, parsed.positionals);
    console.log(`Removed ${result.count ?? 0} skill(s).`);
    return 0;
  }
  if (subcommand === "update") {
    assertOnlyOptions(parsed.flags, "skills update", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "skills update");
    await updateSkills(root);
    console.log("Updated project-local skills.");
    return 0;
  }
  throw new Error(`unknown skills command: ${subcommand}`);
}

async function mcpCommand(argv: string[]): Promise<number> {
  const subcommand = argv[0] ?? "list";
  const parsed = parseFlags(argv.slice(1), MCP_FLAGS);
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h" || flagBool(parsed.flags, "help")) {
    printMcpHelp();
    return 0;
  }
  if (subcommand === "list") {
    assertOnlyOptions(parsed.flags, "mcp list", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "mcp list");
    const state = await readCapabilities(root);
    const enabled = new Set(state.mcp_servers ?? []);
    console.log("status\tid\treadiness\texecution_mode\tdescription");
    for (const [name, server] of Object.entries(AGENT_STACK.mcp_servers)) {
      const status = enabled.has(name) ? "enabled" : "available";
      console.log(`${status}\t${name}\t${server.readiness}\t${server.execution_mode}\t${server.source_need}`);
    }
    return 0;
  }
  if (subcommand === "modes") {
    assertOnlyOptions(parsed.flags, "mcp modes", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const state = await readCapabilities(root);
    if (parsed.positionals.length > 1) {
      throw new Error(`mcp modes accepts at most one server: ${parsed.positionals.join(" ")}`);
    }
    if (parsed.positionals.length === 1) {
      assertKnownMcpServers(parsed.positionals);
      printMcpModeDetail(parsed.positionals[0], state);
      return 0;
    }
    printMcpModesTable(state);
    return 0;
  }
  if (subcommand === "status") {
    assertOnlyOptions(parsed.flags, "mcp status", ["root", "env-file", "verbose"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "mcp status");
    const env = await mcpCommandEnvironment(root, parsed.flags);
    const status = await getMcpLifecycleStatus(root, { env });
    if (flagBool(parsed.flags, "verbose")) {
      console.log("id\tselected\tmode\tconnection_mode\tenv\tinstall\tsnippet\tclient\tprobe\tnext");
      for (const item of status.servers) {
        console.log(
          `${item.id}\t${item.selected ? "yes" : "no"}\t${item.mode}\t${item.connection_mode}\t${item.env}\t${item.install}\t${item.snippet}\t${item.client}\t${item.probe}\t${item.next}`
        );
      }
    } else {
      console.log("id\tselected\tmode\tstate\tnext");
      for (const item of status.servers) {
        console.log(`${item.id}\t${item.selected ? "yes" : "no"}\t${item.mode}\t${item.state}\t${friendlyNext(item.next)}`);
      }
    }
    return 0;
  }
  if (subcommand === "enabled") {
    assertOnlyOptions(parsed.flags, "mcp enabled", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "mcp enabled");
    const state = await readCapabilities(root);
    for (const name of state.mcp_servers ?? []) console.log(name);
    return 0;
  }
  if (subcommand === "available") {
    assertOnlyOptions(parsed.flags, "mcp available", []);
    assertNoArguments(parsed.positionals, "mcp available");
    console.log("id\treadiness\texecution_mode\tdescription");
    for (const [name, server] of Object.entries(AGENT_STACK.mcp_servers)) {
      console.log(`${name}\t${server.readiness}\t${server.execution_mode}\t${server.source_need}`);
    }
    return 0;
  }
  if (subcommand === "commands") {
    assertOnlyOptions(parsed.flags, "mcp commands", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const state = await readCapabilities(root);
    const selected = parsed.positionals.length > 0 ? parsed.positionals : state.mcp_servers;
    const modes = Object.fromEntries(selected.map((server) => [server, state.mcp_server_modes[server]]));
    const commands = mcpToolCommandTexts(selected, "install_command", modes);
    for (const command of commands) console.log(command);
    return 0;
  }
  if (subcommand === "env") {
    assertOnlyOptions(parsed.flags, "mcp env", ["root", "all", "dotenv", "required", "recommended", "write", "mode"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    if (flagBool(parsed.flags, "required") && flagBool(parsed.flags, "recommended")) {
      throw new Error("mcp env cannot use --required and --recommended together");
    }
    const state = await readCapabilities(root);
    const selected = flagBool(parsed.flags, "all")
      ? Object.keys(AGENT_STACK.mcp_servers)
      : parsed.positionals.length > 0
        ? parsed.positionals
        : state.mcp_servers;
    assertKnownMcpServers(selected);
    const mode = flagString(parsed.flags, "mode");
    const modes = mode ? undefined : Object.fromEntries(selected.map((server) => [server, state.mcp_server_modes[server]]));
    const filters = {
      requiredOnly: flagBool(parsed.flags, "required"),
      recommendedOnly: flagBool(parsed.flags, "recommended"),
      mode,
      modes,
      remote: state.mcp_server_remote
    };
    const writePath = flagString(parsed.flags, "write");
    if (writePath) {
      const outputPath = resolve(root, writePath);
      writeFileSync(outputPath, formatMcpDotenvWithRemote(selected, filters), "utf8");
      console.log(`Wrote MCP dotenv environment reference: ${outputPath}`);
      return 0;
    }
    if (flagBool(parsed.flags, "dotenv")) {
      process.stdout.write(formatMcpDotenvWithRemote(selected, filters));
      return 0;
    }
    console.log("id\ttype\tvalue");
    printMcpEnvironment(selected, filters);
    return 0;
  }
  if (subcommand === "enable") {
    assertOnlyOptions(parsed.flags, "mcp enable", ["root", "agent", "mode", "url", "url-env", "bearer-token-env-var"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertSomeArguments(parsed.positionals, "mcp enable");
    const agent = flagString(parsed.flags, "agent");
    await enableMcpServers(root, parsed.positionals, {
      ...(agent ? { agent } : {}),
      mode: flagString(parsed.flags, "mode"),
      remote: mcpRemoteOptions(parsed.flags)
    });
    return 0;
  }
  if (subcommand === "disable") {
    assertOnlyOptions(parsed.flags, "mcp disable", ["root", "agent"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertSomeArguments(parsed.positionals, "mcp disable");
    const agent = flagString(parsed.flags, "agent");
    await disableMcpServers(root, parsed.positionals, agent ? { agent } : {});
    return 0;
  }
  if (subcommand === "install") {
    assertOnlyOptions(parsed.flags, "mcp install", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const result = await installMcpTools(root, parsed.positionals);
    console.log(`Ran ${result.count ?? 0} MCP install command(s).`);
    for (const skipped of result.skipped ?? []) {
      console.log(`Skipped ${skipped.server}: ${skipped.reason}; ${skipped.next ?? "no install action needed"}.`);
    }
    return 0;
  }
  if (subcommand === "uninstall") {
    assertOnlyOptions(parsed.flags, "mcp uninstall", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const result = await uninstallMcpTools(root, parsed.positionals);
    console.log(`Ran ${result.count ?? 0} MCP uninstall command(s).`);
    for (const skipped of result.skipped ?? []) {
      console.log(`Skipped ${skipped.server}: ${skipped.reason}; ${skipped.next ?? "no uninstall action needed"}.`);
    }
    return 0;
  }
  if (subcommand === "setup") {
    assertOnlyOptions(parsed.flags, "mcp setup", ["root", "mode", "env-file", "dry-run"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertSomeArguments(parsed.positionals, "mcp setup");
    if (parsed.positionals.length > 1) throw new Error(`mcp setup accepts one server at a time: ${parsed.positionals.join(" ")}`);
    const env = await mcpCommandEnvironment(root, parsed.flags);
    const result = await setupMcpServer(root, parsed.positionals[0], {
      mode: flagString(parsed.flags, "mode"),
      envFile: flagString(parsed.flags, "env-file"),
      env,
      dryRun: flagBool(parsed.flags, "dry-run")
    });
    printMcpSetupResult(result);
    return result.ok ? 0 : 1;
  }
  if (subcommand === "client") {
    return mcpClientCommand(parsed);
  }
  if (subcommand === "smoke") {
    assertOnlyOptions(parsed.flags, "mcp smoke", ["root", "env-file", "mode"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const env = await mcpCommandEnvironment(root, parsed.flags);
    const state = await readCapabilities(root);
    const explicitSelection = parsed.positionals.length > 0;
    const selected = explicitSelection ? parsed.positionals : state.mcp_servers;
    assertKnownMcpServers(selected);
    const mode = flagString(parsed.flags, "mode");
    const modes = Object.fromEntries(selected.map((server) => [server, mode ?? state.mcp_server_modes[server]]));
    const failed = printMcpSmokeDiagnostics(root, selected, env, modes, state);
    if (!explicitSelection) {
      const result = await doctorMcpServers(root, { env });
      for (const error of result.errors) console.error(`ERROR: ${error}`);
      for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
      return result.ok && !failed ? 0 : 1;
    }
    return failed ? 1 : 0;
  }
  if (subcommand === "doctor") {
    assertOnlyOptions(parsed.flags, "mcp doctor", ["root", "env-file"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "mcp doctor");
    const env = await mcpCommandEnvironment(root, parsed.flags);
    const result = await doctorMcpServers(root, { env });
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
    if (result.ok) console.log(`OK: ${result.enabled.length} MCP server(s) enabled.`);
    return result.ok ? 0 : 1;
  }
  if (subcommand === "probe") {
    assertOnlyOptions(parsed.flags, "mcp probe", ["root", "all", "env-file", "timeout-ms", "mode"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const selected = flagBool(parsed.flags, "all")
      ? Object.keys(AGENT_STACK.mcp_servers)
      : parsed.positionals.length > 0
        ? parsed.positionals
        : (await readCapabilities(root)).mcp_servers;
    assertKnownMcpServers(selected);
    const timeoutMs = parseTimeoutMs(flagString(parsed.flags, "timeout-ms"));
    const env = await mcpCommandEnvironment(root, parsed.flags);
    const result = await probeMcpServers(root, selected, {
      env,
      timeoutMs,
      clientVersion: packageVersion,
      mode: flagString(parsed.flags, "mode")
    });
    console.log("id\tstatus\tdetail");
    for (const item of result.results) console.log(`${item.server}\t${item.status}\t${item.detail}`);
    return result.ok ? 0 : 1;
  }
  throw new Error(`unknown mcp command: ${subcommand}`);
}

async function mcpClientCommand(parsed: ParsedArgs): Promise<number> {
  const action = parsed.positionals[0];
  const server = parsed.positionals[1];
  if (!action || action === "help" || action === "--help" || action === "-h") {
    printMcpHelp();
    return 0;
  }
  if (action !== "add" && action !== "remove") throw new Error(`unknown mcp client command: ${action}`);
  if (!server) throw new Error(`mcp client ${action} requires a server`);
  if (parsed.positionals.length > 2) {
    throw new Error(`mcp client ${action} accepts one server: ${parsed.positionals.slice(1).join(" ")}`);
  }
  assertOnlyOptions(parsed.flags, `mcp client ${action}`, ["root", "agent", "mode", "dry-run"]);
  const root = resolve(flagString(parsed.flags, "root") ?? ".");
  const options = {
    agent: flagString(parsed.flags, "agent"),
    mode: flagString(parsed.flags, "mode"),
    dryRun: flagBool(parsed.flags, "dry-run")
  };
  const result = action === "add"
    ? await clientAddMcpServer(root, server, options)
    : await clientRemoveMcpServer(root, server, options);
  if (result.command.length > 0) {
    console.log(result.command.join(" "));
  }
  for (const instruction of result.instructions) console.log(instruction);
  return result.ok || options.dryRun ? 0 : 1;
}

function setupNextCommands(item: {
  id: string;
  env: string;
  install: string;
  client: string;
  probe: string;
  next: string;
  connection_mode: string;
}): string[] {
  const commands: string[] = [];
  if (item.next === "ready") return commands;
  if (item.connection_mode === "manual-local") {
    if (item.env === "missing-required") commands.push("fill OVERLEAF_TOKEN, PROJECT_ID in .env.local");
    if (item.install !== "ready") {
      commands.push("npm run mcp:setup -- overleaf --mode local --env-file .env.local");
      return dedupeStrings(commands);
    }
    if (item.client.endsWith(":not-added")) commands.push("npm run mcp:client:add -- overleaf --agent codex");
    if (item.probe === "unknown") commands.push("npm run mcp:probe -- overleaf --env-file .env.local");
    return dedupeStrings(commands);
  }
  commands.push(item.next.replace(/^run /, ""));
  return dedupeStrings(commands);
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function printMcpModesTable(state: Awaited<ReturnType<typeof readCapabilities>>): void {
  const selected = new Set(state.mcp_servers ?? []);
  console.log("id\tselected\trecommended\tsupported\tenv\tnext");
  for (const name of Object.keys(AGENT_STACK.mcp_servers)) {
    const required = modeEnvSummary(name);
    const recommended = modeKeyDisplay(mcpRecommendedMode(name));
    const supported = orderedModeLabels(name).join(", ");
    const next = selected.has(name) ? "ready" : `enable ${name}`;
    console.log(`${name}\t${selected.has(name) ? "yes" : "no"}\t${recommended}\t${supported}\t${required}\t${next}`);
  }
}

function printMcpModeDetail(serverName: string, state: Awaited<ReturnType<typeof readCapabilities>>): void {
  const selected = new Set(state.mcp_servers ?? []);
  const uniqueLabels = orderedModeLabels(serverName);
  console.log(`${serverName} supports ${formatHumanList(uniqueLabels)}.`);
  console.log(`Selected: ${selected.has(serverName) ? "yes" : "no"}`);
  console.log(`Recommended: ${mcpModeLabel(serverName, mcpRecommendedMode(serverName))}`);
  console.log(`Env: ${modeEnvSummary(serverName)}`);
  console.log(`Next: ${selected.has(serverName) ? "npm run mcp:status" : `npm run mcp:enable -- ${serverName} --mode ${mcpRecommendedMode(serverName)}`}`);
  for (const mode of mcpServerModeKeys(serverName)) {
    const resolved = resolveMcpServer(serverName, mode);
    const details = [
      `mode ${mode}: ${mcpModeLabel(serverName, mode)}`,
      resolved.hosted_url ? `endpoint ${resolved.hosted_url}` : "",
      resolved.command ? `runtime ${[resolved.command, ...resolved.args].join(" ")}` : "",
      resolved.local_service ? `requires ${resolved.local_service}` : ""
    ].filter(Boolean);
    console.log(details.join("; "));
  }
}

function modeEnvSummary(serverName: string): string {
  const names = new Set<string>();
  for (const mode of mcpServerModeKeys(serverName)) {
    const server = resolveMcpServer(serverName, mode);
    for (const name of server.required_env) names.add(name);
    for (const name of server.recommended_env) names.add(name);
  }
  return names.size > 0 ? [...names].join(", ") : "none";
}

function orderedModeLabels(serverName: string): string[] {
  const recommended = mcpModeLabel(serverName, mcpRecommendedMode(serverName));
  const labels = mcpSupportedModeLabels(serverName);
  return [recommended, ...labels.filter((label) => label !== recommended)];
}

function modeKeyDisplay(mode: string): string {
  if (mode === "remote-custom") return "custom remote";
  if (mode === "remote") return "remote";
  if (mode === "manual") return "manual setup";
  return "local";
}

function formatHumanList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function friendlyNext(next: string): string {
  return next.replace(/^run /, "");
}

function mcpRemoteOptions(flags: Record<string, FlagValue>) {
  const url = flagString(flags, "url");
  const urlEnv = flagString(flags, "url-env");
  const bearerTokenEnvVar = flagString(flags, "bearer-token-env-var");
  if (!url && !urlEnv && !bearerTokenEnvVar) return undefined;
  return {
    ...(url ? { url } : {}),
    ...(urlEnv ? { url_env: urlEnv } : {}),
    transport: "streamable-http" as const,
    ...(bearerTokenEnvVar ? { bearer_token_env_var: bearerTokenEnvVar } : {})
  };
}

function parseFlags(argv: string[], schema: FlagSchema): ParsedArgs {
  const flags: Record<string, FlagValue> = {};
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (arg === "-h") {
      if (!schema.boolean.has("help")) throw new Error("unknown option: -h");
      flags.help = true;
      continue;
    }
    if (arg === "-v") {
      if (!schema.boolean.has("version")) throw new Error("unknown option: -v");
      flags.version = true;
      continue;
    }
    if (arg.startsWith("-") && !arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    }
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const raw = arg.slice(2);
    const equals = raw.indexOf("=");
    const key = equals === -1 ? raw : raw.slice(0, equals);
    const inlineValue = equals === -1 ? undefined : raw.slice(equals + 1);
    if (!schema.boolean.has(key) && !schema.string.has(key)) {
      throw new Error(`unknown option: --${key}`);
    }
    if (schema.boolean.has(key)) {
      if (inlineValue !== undefined) throw new Error(`option does not take a value: --${key}`);
      flags[key] = true;
      continue;
    }
    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for option: --${key}`);
    }
    flags[key] = value;
    if (inlineValue === undefined) {
      index += 1;
    }
  }
  return { flags, positionals };
}

function flagSchema(booleanFlags: string[], stringFlags: string[]): FlagSchema {
  return { boolean: new Set(booleanFlags), string: new Set(stringFlags) };
}

function flagString(flags: Record<string, FlagValue>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function flagBool(flags: Record<string, FlagValue>, key: string): boolean {
  return flags[key] === true;
}

function assertNoArguments(positionals: string[], command: string): void {
  if (positionals.length > 0) {
    throw new Error(`${command} does not take arguments: ${positionals.join(" ")}`);
  }
}

function assertSomeArguments(positionals: string[], command: string): void {
  if (positionals.length === 0) {
    throw new Error(`${command} requires at least one argument`);
  }
}

function assertOnlyOptions(
  flags: Record<string, FlagValue>,
  command: string,
  allowedOptions: string[]
): void {
  const allowed = new Set([...allowedOptions, "help"]);
  const unexpected = Object.entries(flags)
    .filter(([, value]) => value !== undefined)
    .map(([name]) => name)
    .filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    throw new Error(`${command} does not accept ${unexpected.map((name) => `--${name}`).join(", ")}`);
  }
}

async function mcpCommandEnvironment(root: string, flags: Record<string, FlagValue>): Promise<NodeJS.ProcessEnv> {
  const envFile = flagString(flags, "env-file");
  if (!envFile) return process.env;
  const fileEnv = await readMcpEnvironmentFile(resolve(root, envFile));
  return mergeMcpEnvironment(process.env, fileEnv);
}

function parseTimeoutMs(value: string | undefined): number {
  if (value === undefined) return 5000;
  if (!/^[0-9]+$/.test(value)) throw new Error(`--timeout-ms must be a positive integer, got: ${value}`);
  const timeoutMs = Number(value);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
    throw new Error("--timeout-ms must be between 100 and 120000");
  }
  return timeoutMs;
}

export function formatInteractiveCreateGuide(): string {
  const presetLines = Object.entries(AGENT_STACK.presets).map(
    ([name, preset]) => `  ${name.padEnd(10)} ${preset.description}`
  );
  return [
    "Setup choices:",
    "",
    "Capability presets:",
    ...presetLines,
    "",
    "Agent target:",
    "  universal  Recommended. One shared project-local .agents/skills copy.",
    "  auto       Let the skills CLI detect installed agents; may create multiple agent-specific copies.",
    "  <id>       Any supported skills.sh agent id.",
    "",
    "Supported specific agent ids:",
    ...formatSupportedAgentTargetLines(),
    "",
    "Aliases:",
    ...formatAgentAliasLines(),
    "",
    "Skill and MCP behavior:",
    "  Skills are copied into the project, not installed globally.",
    "  MCP records are written into configs/capabilities.yaml and docs/agent/generated/.",
    "  docs/agent/mcp-setup.md records enabled servers, optional catalog entries, env vars, and smoke tests.",
    "  default enables only low-friction arXiv; credentialed/local services are opt-in.",
    "  MCP installers are optional and run only finite installer commands.",
    "  MCP execution modes are explicit: uvx-runtime, npx-runtime, local-service, manual, or fallback.",
    "  Use `npm run mcp:env -- <server>` to inspect env vars and local prerequisites.",
    "  Use `npm run mcp:status` to see selected mode, setup, client, probe, and next action.",
    "  Use `npm run mcp:enable -- <server> --mode remote` for hosted endpoints where supported.",
    "  Use `npm run mcp:setup -- overleaf --mode local --env-file .env.local` for manual-local setup.",
    "  Use `npm run mcp:env -- --dotenv --all` to print a committed env example.",
    "  Use `npm run mcp:dotenv` to regenerate a committed env example.",
    "  Use `npm run mcp:doctor -- --env-file .env.local` to check explicit local secrets.",
    ""
  ].join("\n");
}

function printCreateHelp(): void {
  console.log(
    [
      "Usage: create-academic-research <project-name> [options]",
      "",
      "Create an agent-ready academic research repository.",
      "",
      "Options:",
      "  --yes                    Use defaults without prompts.",
      "  --title <name>           Project title. Default: title-cased project name.",
      "  --slug <name>            Repository/package slug. Default: normalized project name.",
      "  --package <name>         Python package name. Default: normalized project name.",
      "  --preset <name>           Capability preset: minimal, default, enhanced, literature, writing, full.",
      "  --profile <name>          Project profile metadata. Default: academic-general.",
      "  --agent <id>              Agent target: universal, auto, or a supported skills.sh id.",
      "  --install-skills          Install project-local skills without prompting.",
      "  --no-install-skills       Skip project-local skill installation.",
      "  --install-mcp-tools       Run finite external MCP install commands after creation.",
      "  --no-install-mcp-tools    Skip finite external MCP install commands.",
      "  -h, --help               Show this help.",
      "  -v, --version            Show package version."
    ].join("\n")
  );
}

function printMissingTargetHelp(): void {
  console.error(
    [
      "Please specify the project directory.",
      "",
      "Usage:",
      "  npm create academic-research@latest my-research-project",
      "  npx create-academic-research@latest my-research-project"
    ].join("\n")
  );
}

function printLifecycleHelp(): void {
  console.log(
    [
      "Usage: academic-research <doctor|update|init|setup|rename|agents|skills|mcp>",
      "",
      "Manage a generated academic research repository after creation.",
      "",
      "Options:",
      "  -h, --help               Show this help.",
      "  -v, --version            Show package version."
    ].join("\n")
  );
}

function printUpdateHelp(): void {
  console.log(
    [
      "Usage: academic-research update [options]",
      "",
      "Preview or apply non-destructive updates to managed project files.",
      "",
      "Options:",
      "  --root <path>            Project root. Default: current directory.",
      "  --dry-run                Preview managed changes without writing. Default.",
      "  --apply                  Write managed changes.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printInitHelp(): void {
  console.log(
    [
      "Usage: academic-research init [options]",
      "",
      "Initialize an existing repository without overwriting existing files.",
      "",
      "Options:",
      "  --root <path>            Project root. Default: current directory.",
      "  --title <name>           Project title. Default: title-cased directory name.",
      "  --slug <name>            Repository/package slug. Default: normalized directory name.",
      "  --package <name>         Python package name. Default: normalized directory name.",
      "  --preset <name>          Capability preset: minimal, default, enhanced, literature, writing, full.",
      "  --profile <name>         Project profile metadata. Default: academic-general.",
      "  --agent <id>             Agent target: universal, auto, or a supported skills.sh id.",
      "  --install-skills         Install project-local skills after initialization.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printSetupHelp(): void {
  console.log(
    [
      "Usage: academic-research setup [options]",
      "",
      "Print project onboarding status and next commands without changing files.",
      "",
      "Options:",
      "  --root <path>            Project root. Default: current directory.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printAgentsHelp(): void {
  console.log(
    [
      "Usage: academic-research agents <list>",
      "",
      "List supported project-local agent targets.",
      "",
      "Targets:",
      "  universal                 Recommended shared project-local .agents/skills copy.",
      "  auto                      Let the skills CLI detect installed agents.",
      "  <id>                      A supported skills.sh agent id.",
      "",
      "Options:",
      "  -h, --help                Show this help."
    ].join("\n")
  );
}

function printSkillsHelp(): void {
  console.log(
    [
      "Usage: academic-research skills <list|status|presets|install|remove|uninstall|update> [skill-id...] [options]",
      "",
      "Manage project-local skill installs for a generated research repository.",
      "",
      "Examples:",
      "  academic-research skills install --preset default",
      "  academic-research skills install source-ingestion sota-literature-review",
      "",
      "Options:",
      "  --root <path>            Project root for list, status, install, remove, uninstall, update.",
      "  --preset <name>          Capability preset for install when no skill ids are provided.",
      "  --agent <id>             Agent selector for install. Default: project capability agent.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printMcpHelp(): void {
  console.log(
    [
      "Usage: academic-research mcp <list|modes|status|enabled|available|commands|env|enable|disable|setup|client|install|uninstall|smoke|doctor|probe> [servers...]",
      "",
      "Manage MCP records, readiness checks, and finite external MCP tool installs.",
      "",
      "Examples:",
      "  academic-research mcp modes",
      "  academic-research mcp modes openalex",
      "  academic-research mcp env openalex semantic-scholar",
      "  academic-research mcp enable openalex --mode remote",
      "  academic-research mcp enable openalex --mode remote-custom --url https://example.com/mcp",
      "  academic-research mcp status",
      "  academic-research mcp status --verbose",
      "  academic-research mcp setup overleaf --mode local --env-file .env.local",
      "  academic-research mcp client add overleaf --agent codex",
      "  academic-research mcp env --dotenv --all > .env.example",
      "  academic-research mcp env --write .env.example --all",
      "  academic-research mcp doctor --env-file .env.local",
      "  academic-research mcp smoke",
      "  academic-research mcp probe arxiv --timeout-ms 5000",
      "",
      "Options:",
      "  --root <path>            Project root for project-state commands.",
      "  --agent <id>             Agent for enable/disable snippets or client registration.",
      "  --mode <mode>            Connection mode: local, remote, remote-custom, or manual where supported.",
      "  --url <url>              Custom remote MCP endpoint URL for --mode remote-custom.",
      "  --url-env <name>         Env var that contains a custom remote MCP endpoint URL.",
      "  --bearer-token-env-var <name>",
      "                           Env var that contains a custom remote bearer token; value is not stored.",
      "  --all                    Select all catalog MCP servers for mcp env.",
      "  --verbose                Show technical MCP lifecycle fields for mcp status.",
      "  --dotenv                Print mcp env as dotenv content.",
      "  --write <path>           Write mcp env dotenv content to a file.",
      "  --env-file <path>        Read local env values for mcp setup, smoke, doctor, and probe.",
      "  --timeout-ms <ms>        Per-server probe timeout. Default: 5000.",
      "  --required              Print only required env vars for mcp env.",
      "  --recommended           Print only recommended/default env vars for mcp env.",
      "  --dry-run               Print setup or client registration actions without changing external state.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printMcpSmokeDiagnostics(
  root: string,
  servers: string[],
  env: NodeJS.ProcessEnv = process.env,
  modes: Record<string, string | undefined> = {},
  state?: Awaited<ReturnType<typeof readCapabilities>>
): boolean {
  let failed = false;
  console.log("id\tstatus\truntime\tcheck");
  for (const name of servers) {
    const server = state ? resolveMcpServerForState(state, name, modes[name]) : resolveMcpServer(name, modes[name]);
    const missingRequired = server.required_env.filter((envName) => !envHasValue(env, envName));
    if (missingRequired.length > 0) failed = true;
    const runtime = mcpSmokeRuntime(name, server, state);
    let status = "manual";
    if (missingRequired.length > 0) {
      status = `missing-required-env:${missingRequired.join(",")}`;
    } else if (server.connection_mode === "remote-custom" && !server.remote_configured) {
      failed = true;
      status = "missing-remote-url";
    } else if (server.connection_mode === "remote-curated" || server.connection_mode === "remote-custom") {
      status = "remote-endpoint";
    } else if (server.command && commandExists(commandForRuntime(root, server.command), env)) {
      status = "runtime-found";
    } else if (server.command) {
      status = "runtime-missing";
    } else if (server.local_service) {
      status = "manual-local-service";
    }
    console.log(`${name}\t${status}\t${runtime}\t${server.smoke_test}`);
  }
  return failed;
}

function mcpSmokeRuntime(
  name: string,
  server: ReturnType<typeof resolveMcpServer>,
  state?: Awaited<ReturnType<typeof readCapabilities>>
): string {
  if (server.connection_mode === "remote-custom") {
    const urlEnv = state?.mcp_server_remote?.[name]?.url_env;
    if (!server.remote_configured) return "custom remote endpoint not configured";
    return urlEnv ? `custom remote endpoint from ${urlEnv}` : "custom remote endpoint";
  }
  if (server.hosted_url && !server.command) return server.hosted_url;
  if (server.command) return [server.command, ...server.args].join(" ");
  return "manual setup";
}

function envHasValue(env: NodeJS.ProcessEnv, name: string): boolean {
  return typeof env[name] === "string" && env[name] !== "";
}

function printMcpSetupResult(result: Awaited<ReturnType<typeof setupMcpServer>>): void {
  const title = result.server === "overleaf" ? "Overleaf setup plan" : `MCP setup plan: ${result.server}`;
  console.log(title);
  console.log(`server\t${result.server}`);
  console.log(`mode\t${result.mode}`);
  console.log(`status\t${result.ok ? "ok" : "blocked"}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  if (result.commands.length > 0) {
    console.log("");
    console.log("Commands");
    for (const command of result.commands) console.log(command);
  }
  if (result.created.length > 0) {
    console.log("");
    console.log("Created");
    for (const path of result.created) console.log(path);
  }
  if (result.next.length > 0) {
    console.log("");
    console.log("Next");
    for (const command of result.next) console.log(command);
  }
}

function printMcpEnvironment(
  servers: string[],
  options: {
    requiredOnly?: boolean;
    recommendedOnly?: boolean;
    mode?: string;
    modes?: Record<string, string | undefined>;
    remote?: Record<string, { url?: string; url_env?: string; bearer_token_env_var?: string }>;
  } = {}
): void {
  const grouped = new Map<string, ReturnType<typeof listMcpEnvironmentEntries>>();
  for (const entry of listMcpEnvironmentEntries(servers, options)) {
    const entries = grouped.get(entry.server) ?? [];
    entries.push(entry);
    grouped.set(entry.server, entries);
  }
  for (const name of servers) {
    const modeServer = flagModeServer(name, options.mode ?? options.modes?.[name]);
    const entries = grouped.get(name) ?? [];
    let wroteLine = false;
    for (const entry of entries) {
      console.log(`${name}\t${entry.kind}\t${entry.name}${entry.value ? `=${entry.value}` : ""}`);
      wroteLine = true;
    }
    if (!options.requiredOnly && !options.recommendedOnly && modeServer.hosted_url) {
      console.log(`${name}\thosted-endpoint\t${modeServer.hosted_url}`);
      wroteLine = true;
    }
    const remote = options.remote?.[name];
    if (!options.requiredOnly && !options.recommendedOnly && remote?.url) {
      console.log(`${name}\tcustom-remote-url\t${remote.url}`);
      wroteLine = true;
    }
    if (!options.recommendedOnly && remote?.url_env) {
      console.log(`${name}\trequired\t${remote.url_env}`);
      wroteLine = true;
    }
    if (!options.requiredOnly && remote?.bearer_token_env_var) {
      console.log(`${name}\trecommended\t${remote.bearer_token_env_var}`);
      wroteLine = true;
    }
    if (!options.requiredOnly && !options.recommendedOnly && modeServer.local_service) {
      console.log(`${name}\tlocal-service\t${modeServer.local_service}`);
      wroteLine = true;
    }
    if (!options.requiredOnly && !options.recommendedOnly) {
      for (const command of modeServer.setup_commands) {
        console.log(`${name}\tsetup-command\t${command}`);
        wroteLine = true;
      }
    }
    if (!wroteLine) console.log(`${name}\tnone\t-`);
  }
}

function formatMcpDotenvWithRemote(
  servers: string[],
  options: {
    requiredOnly?: boolean;
    recommendedOnly?: boolean;
    mode?: string;
    modes?: Record<string, string | undefined>;
    remote?: Record<string, { url_env?: string; bearer_token_env_var?: string }>;
  } = {}
): string {
  const base = formatMcpDotenv(servers, options);
  const lines: string[] = [];
  for (const name of servers) {
    const remote = options.remote?.[name];
    if (!remote) continue;
    if (!options.recommendedOnly && remote.url_env) lines.push(`${remote.url_env}=`);
    if (!options.requiredOnly && remote.bearer_token_env_var) lines.push(`${remote.bearer_token_env_var}=`);
  }
  if (lines.length === 0) return base;
  return `${base.trimEnd()}\n\n# Custom remote MCP endpoint environment\n${lines.join("\n")}\n`;
}

function commandExists(command: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!command) return false;
  if (command.includes("/") || command.includes("\\")) return existsSync(command);
  const pathValue = env.PATH ?? "";
  const extensions = process.platform === "win32"
    ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const hasExtension = extension && command.toLowerCase().endsWith(extension.toLowerCase());
      const candidate = join(directory, hasExtension ? command : `${command}${extension}`);
      if (existsSync(candidate)) return true;
    }
  }
  return false;
}

function commandForRuntime(root: string, command: string): string {
  if (!command.includes("/") && !command.includes("\\")) return command;
  return resolve(root, command);
}

function flagModeServer(name: string, mode: string | undefined) {
  return resolveMcpServer(name, mode);
}

function readPackageVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      version?: string;
    };
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
