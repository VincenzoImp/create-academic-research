import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import {
  buildSkillInstallCommands,
  disableMcpServers,
  doctorMcpServers,
  enableMcpServers,
  installMcpTools,
  installSkills,
  mcpToolCommandTexts,
  readCapabilities,
  removeSkills,
  SUPPORTED_SKILL_AGENT_TARGETS,
  uninstallMcpTools,
  updateSkills
} from "../dist/src/capabilities.js";
import { createProject } from "../dist/src/project.js";

test("skill install commands are project-local and executable from the project root", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-"));
  const target = join(root, "skills-project");
  await createProject({ target, title: "Skills Project", preset: "default", installSkills: false });

  const commands = await buildSkillInstallCommands(target, "default");
  const rendered = commands.map((command) => command.join(" ")).join("\n");

  assert.equal(commands.length, 1);
  assert.match(rendered, /VincenzoImp\/academic-research-skills/);
  assert.doesNotMatch(rendered, /obra\/superpowers/);
  assert.doesNotMatch(rendered, /anthropics\/skills/);
  assert.doesNotMatch(rendered, /existential-birds\/beagle/);
  assert.doesNotMatch(rendered, /--global|\s-g\s/);
  assert.ok(commands.every((command) => command.includes("--copy")));
  assert.ok(commands.every((command) => command.includes("-y")));
  assert.ok(commands.every((command) => command.includes("--agent")));
  assert.ok(commands.every((command) => command.includes("universal")));
  assert.ok(commands.every((command) => !command.includes("--all")));
  assert.ok(
    commands.every(
      (command) => command.slice(0, 7).join(" ") === "npm exec --yes --package skills -- skills"
    )
  );
  assert.doesNotMatch(rendered, /--agent \*/);

  const calls = [];
  await installSkills(target, "default", {}, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  await removeSkills(target, ["source-ingestion"], {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  await updateSkills(target, { run: async (command, options) => calls.push({ command, cwd: options.cwd }) });

  assert.ok(calls.length >= 2);
  assert.ok(calls.every((call) => call.cwd === target));
  assert.deepEqual(calls.at(-2).command, [
    "npm",
    "exec",
    "--yes",
    "--package",
    "skills",
    "--",
    "skills",
    "remove",
    "source-ingestion",
    "-y"
  ]);
});

test("enhanced preset includes complementary external skill bundles explicitly", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-enhanced-"));
  const target = join(root, "skills-enhanced-project");
  await createProject({ target, title: "Skills Enhanced Project", preset: "enhanced", installSkills: false });

  const commands = await buildSkillInstallCommands(target, "enhanced");
  const rendered = commands.map((command) => command.join(" ")).join("\n");

  assert.equal(commands.length, 4);
  assert.match(rendered, /VincenzoImp\/academic-research-skills/);
  assert.match(rendered, /obra\/superpowers/);
  assert.match(rendered, /anthropics\/skills/);
  assert.match(rendered, /existential-birds\/beagle/);
  assert.ok(commands.every((command) => command.includes("--copy")));
});

test("skill install records the active preset and agent after a successful install", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-state-"));
  const target = join(root, "skills-state-project");
  await createProject({ target, title: "Skills State Project", preset: "default", installSkills: false });

  const calls = [];
  await installSkills(target, "minimal", { agent: "claude-code" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const profile = await readFile(join(target, "docs/agent/capability-profile.md"), "utf8");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].command.includes("--agent"));
  assert.ok(calls[0].command.includes("claude-code"));
  assert.equal(capabilities.preset, "minimal");
  assert.equal(capabilities.agent, "claude-code");
  assert.match(profile, /Agent target: `claude-code`/);
  assert.match(profile, /Preset: `minimal`/);
});

test("skill install normalizes aliases and validates agent targets before running commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-agent-target-"));
  const target = join(root, "skills-agent-target-project");
  await createProject({ target, title: "Skills Agent Target Project", preset: "default", installSkills: false });

  const calls = [];
  await installSkills(target, "minimal", { agent: "claude" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.ok(calls[0].command.includes("--agent"));
  assert.ok(calls[0].command.includes("claude-code"));
  assert.equal(capabilities.agent, "claude-code");
  assert.ok(SUPPORTED_SKILL_AGENT_TARGETS.includes("claude-code"));
  assert.ok(SUPPORTED_SKILL_AGENT_TARGETS.includes("codex"));
  assert.ok(SUPPORTED_SKILL_AGENT_TARGETS.includes("cursor"));

  await assert.rejects(
    installSkills(target, "minimal", { agent: "not-real-agent" }, {
      run: async () => {
        throw new Error("runner should not be called");
      }
    }),
    /unknown agent target: not-real-agent/
  );
});

test("auto agent target delegates agent selection to the skills CLI", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-auto-agent-"));
  const target = join(root, "skills-auto-agent-project");
  await createProject({
    target,
    title: "Skills Auto Agent Project",
    preset: "minimal",
    agent: "auto",
    installSkills: false
  });

  const commands = await buildSkillInstallCommands(target, "minimal");
  const rendered = commands.map((command) => command.join(" ")).join("\n");

  assert.doesNotMatch(rendered, /--agent/);
  assert.match(rendered, /VincenzoImp\/academic-research-skills/);
});

test("default capability state is agent-neutral and uses the universal skill target", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-agent-neutral-"));
  const target = join(root, "agent-neutral-project");
  await createProject({ target, title: "Agent Neutral Project", preset: "minimal", installSkills: false });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const profile = await readFile(join(target, "docs/agent/capability-profile.md"), "utf8");
  assert.equal(capabilities.agent, "universal");
  assert.match(profile, /Agent target: `universal`/);
});

test("skill removal prunes the project lock so updates do not restore removed skills", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-lock-"));
  const target = join(root, "skills-lock-project");
  await createProject({ target, title: "Skills Lock Project", preset: "default", installSkills: false });
  await writeFile(
    join(target, "skills-lock.json"),
    `${JSON.stringify(
      {
        version: 1,
        skills: {
          "source-ingestion": { source: "VincenzoImp/academic-research-skills" },
          "sota-literature-review": { source: "VincenzoImp/academic-research-skills" }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  await removeSkills(target, ["source-ingestion"], {
    run: async () => ({ code: 0 })
  });

  const lock = JSON.parse(await readFile(join(target, "skills-lock.json"), "utf8"));
  assert.deepEqual(Object.keys(lock.skills), ["sota-literature-review"]);
});

test("capability commands do not silently overwrite invalid capability state", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-invalid-state-"));
  const target = join(root, "skills-invalid-state-project");
  await createProject({ target, title: "Skills Invalid State Project", preset: "default", installSkills: false });
  const path = join(target, "configs/capabilities.yaml");
  const invalidYaml = "agent: [\n";
  await writeFile(path, invalidYaml, "utf8");

  await assert.rejects(readCapabilities(target));
  await assert.rejects(enableMcpServers(target, ["arxiv"], { agent: "codex" }));
  assert.equal(await readFile(path, "utf8"), invalidYaml);
});

test("MCP enable and disable update project-local records and snippets", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-"));
  const target = join(root, "mcp-project");
  await createProject({ target, title: "MCP Project", preset: "minimal", installSkills: false });

  await stat(join(target, "docs/agent/generated/mcp.json"));
  await enableMcpServers(target, ["arxiv", "openalex"], { agent: "cursor" });
  let capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  let snippet = JSON.parse(
    await readFile(join(target, "docs/agent/generated/cursor-mcp.json"), "utf8")
  );

  assert.deepEqual(capabilities.mcp_servers, ["arxiv", "openalex"]);
  assert.equal(capabilities.agent, "cursor");
  assert.deepEqual(Object.keys(snippet.mcpServers).sort(), ["arxiv", "openalex"]);
  await assert.rejects(stat(join(target, "docs/agent/generated/mcp.json")));

  await disableMcpServers(target, ["arxiv"], { agent: "cursor" });
  capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/cursor-mcp.json"), "utf8"));

  assert.deepEqual(capabilities.mcp_servers, ["openalex"]);
  assert.deepEqual(Object.keys(snippet.mcpServers), ["openalex"]);
});

test("MCP commands reject unknown server ids", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-unknown-"));
  const target = join(root, "mcp-unknown-project");
  await createProject({ target, title: "MCP Unknown Project", preset: "minimal", installSkills: false });

  await assert.rejects(
    enableMcpServers(target, ["made-up-server"], { agent: "example-agent" }),
    /unknown MCP server/
  );
  await assert.rejects(installMcpTools(target, ["made-up-server"]), /unknown MCP server/);
});

test("MCP doctor reports invalid generated snippets distinctly from missing snippets", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-invalid-snippet-"));
  const target = join(root, "mcp-invalid-snippet-project");
  await createProject({ target, title: "MCP Invalid Snippet Project", preset: "default", installSkills: false });
  await writeFile(join(target, "docs/agent/generated/mcp.json"), "{not-json", "utf8");

  const result = await doctorMcpServers(target);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /invalid generated MCP snippet/);
  assert.doesNotMatch(result.errors.join("\n"), /missing generated MCP snippet/);
});

test("MCP install and uninstall are explicit external tool operations", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-install-"));
  const target = join(root, "mcp-install-project");
  await createProject({ target, title: "MCP Install Project", preset: "minimal", installSkills: false });

  const calls = [];
  const runner = { run: async (command, options) => calls.push({ command, cwd: options.cwd }) };
  await installMcpTools(target, ["arxiv"], runner);
  await uninstallMcpTools(target, ["arxiv"], runner);

  assert.deepEqual(calls[0].command.slice(0, 3), ["uv", "tool", "install"]);
  assert.deepEqual(mcpToolCommandTexts(["arxiv"]), ["uv tool install 'arxiv-mcp-server[pdf]'"]);
  assert.deepEqual(calls[1].command.slice(0, 3), ["uv", "tool", "uninstall"]);
  assert.ok(calls.every((call) => call.cwd === target));
});

test("MCP install skips runtime-only servers that would launch over stdio", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-runtime-only-"));
  const target = join(root, "mcp-runtime-only-project");
  await createProject({ target, title: "MCP Runtime Only Project", preset: "minimal", installSkills: false });
  const runtimeOnly = ["semantic-scholar", "openalex", "pubmed", "zotero"];

  const calls = [];
  const result = await installMcpTools(target, runtimeOnly, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });

  assert.equal(result.count, 0);
  assert.deepEqual(calls, []);
  assert.deepEqual(mcpToolCommandTexts(runtimeOnly), []);
});

test("full preset MCP install runs only finite installers", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-full-install-"));
  const target = join(root, "mcp-full-install-project");
  await createProject({ target, title: "MCP Full Install Project", preset: "full", installSkills: false });

  const calls = [];
  const result = await installMcpTools(target, [], {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  const rendered = calls.map((call) => call.command.join(" ")).join("\n");

  assert.equal(result.count, 2);
  assert.match(rendered, /uv tool install arxiv-mcp-server/);
  assert.match(rendered, /uv tool install overleaf-mcp-server/);
  assert.doesNotMatch(rendered, /semantic-scholar-mcp/);
  assert.doesNotMatch(rendered, /openalex-mcp-server/);
  assert.doesNotMatch(rendered, /pubmed-mcp-server/);
  assert.doesNotMatch(rendered, /zoty/);
});
