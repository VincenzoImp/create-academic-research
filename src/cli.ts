import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  disableMcpServers,
  doctorMcpServers,
  enableMcpServers,
  DEFAULT_AGENT,
  installMcpTools,
  installSkills,
  listInstalledSkills,
  mcpToolCommandTexts,
  readCapabilities,
  removeSkills,
  uninstallMcpTools,
  updateSkills
} from "./capabilities.js";
import { createProject, doctorProject, renameProject } from "./project.js";
import { askCreateOptions } from "./prompts.js";
import type { CreatePromptAnswers, CreatePromptDefaults } from "./prompts.js";
import { AGENT_STACK, presetMcpServers } from "./stack.js";
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
  ["yes", "help", "version", "install-skills", "no-install-skills", "install-mcp-tools"],
  ["title", "slug", "package", "preset", "profile", "agent"]
);

const ROOT_FLAGS = flagSchema(["help"], ["root"]);
const RENAME_FLAGS = flagSchema(["help"], ["root", "title", "slug", "package"]);
const SKILLS_FLAGS = flagSchema(["help"], ["root", "preset", "agent"]);
const MCP_FLAGS = flagSchema(["help"], ["root", "agent"]);

export async function main(argv: string[] = process.argv.slice(2), mode: CliMode = "create"): Promise<number> {
  try {
    if (mode === "create") return createMain(argv);
    return lifecycleMain(argv);
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
  const installMcpToolsLock = flagBool(parsed.flags, "install-mcp-tools") ? true : undefined;
  const answers: CreatePromptAnswers = interactive
    ? await askCreateOptions(defaults, {
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
  console.log("Next: cd into the project and run `npx academic-research doctor`.");
  return 0;
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
  if (command === "rename") return renameCommand(argv.slice(1));
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
  if (result.ok) console.log(`OK: ${root}`);
  return result.ok ? 0 : 1;
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
    assertNoArguments(parsed.positionals, "skills install");
    const preset = flagString(parsed.flags, "preset") ?? "default";
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
    for (const [name, server] of Object.entries(AGENT_STACK.mcp_servers)) {
      const status = enabled.has(name) ? "enabled" : "available";
      const installer = mcpInstallMode(server.install_command, server.command);
      console.log(`${status}\t${name}\t${server.source_need}\t${installer}`);
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
    for (const [name, server] of Object.entries(AGENT_STACK.mcp_servers)) {
      const installer = mcpInstallMode(server.install_command, server.command);
      console.log(`${name}\t${server.source_need}\t${installer}`);
    }
    return 0;
  }
  if (subcommand === "commands") {
    assertOnlyOptions(parsed.flags, "mcp commands", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const selected = parsed.positionals.length > 0 ? parsed.positionals : (await readCapabilities(root)).mcp_servers;
    const commands = mcpToolCommandTexts(selected, "install_command");
    for (const command of commands) console.log(command);
    return 0;
  }
  if (subcommand === "enable") {
    assertOnlyOptions(parsed.flags, "mcp enable", ["root", "agent"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertSomeArguments(parsed.positionals, "mcp enable");
    const agent = flagString(parsed.flags, "agent");
    await enableMcpServers(root, parsed.positionals, agent ? { agent } : {});
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
    return 0;
  }
  if (subcommand === "uninstall") {
    assertOnlyOptions(parsed.flags, "mcp uninstall", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    const result = await uninstallMcpTools(root, parsed.positionals);
    console.log(`Ran ${result.count ?? 0} MCP uninstall command(s).`);
    return 0;
  }
  if (subcommand === "doctor") {
    assertOnlyOptions(parsed.flags, "mcp doctor", ["root"]);
    const root = resolve(flagString(parsed.flags, "root") ?? ".");
    assertNoArguments(parsed.positionals, "mcp doctor");
    const result = await doctorMcpServers(root);
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
    if (result.ok) console.log(`OK: ${result.enabled.length} MCP server(s) enabled.`);
    return result.ok ? 0 : 1;
  }
  throw new Error(`unknown mcp command: ${subcommand}`);
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

function mcpInstallMode(installCommand: string, runtimeCommand: string): string {
  if (installCommand) return installCommand;
  return runtimeCommand ? "runtime-only" : "manual";
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
      "  --agent <name>            Agent target. Default: universal.",
      "  --install-skills          Install project-local skills without prompting.",
      "  --no-install-skills       Skip project-local skill installation.",
      "  --install-mcp-tools       Run finite external MCP install commands after creation.",
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
      "Usage: academic-research <doctor|rename|skills|mcp>",
      "",
      "Manage a generated academic research repository after creation.",
      "",
      "Options:",
      "  -h, --help               Show this help.",
      "  -v, --version            Show package version."
    ].join("\n")
  );
}

function printSkillsHelp(): void {
  console.log(
    [
      "Usage: academic-research skills <list|status|presets|install|remove|uninstall|update> [options]",
      "",
      "Manage project-local skill installs for a generated research repository.",
      "",
      "Options:",
      "  --root <path>            Project root for list, status, install, remove, uninstall, update.",
      "  --preset <name>          Capability preset for install.",
      "  --agent <name>           Agent selector for install. Default: project capability agent.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
}

function printMcpHelp(): void {
  console.log(
    [
      "Usage: academic-research mcp <list|enabled|available|commands|enable|disable|install|uninstall|doctor> [servers...]",
      "",
      "Manage MCP records and finite external MCP tool installs.",
      "",
      "Options:",
      "  --root <path>            Project root for project-state commands.",
      "  --agent <name>           Agent for enable/disable generated snippets.",
      "  -h, --help               Show this help."
    ].join("\n")
  );
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
