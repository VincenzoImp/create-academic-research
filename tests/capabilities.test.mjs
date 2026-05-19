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

  assert.match(rendered, /VincenzoImp\/academic-research-skills/);
  assert.doesNotMatch(rendered, /--global|\s-g\s/);
  assert.ok(commands.every((command) => command.includes("--copy")));
  assert.ok(commands.every((command) => command.includes("-y")));
  assert.ok(commands.every((command) => !command.includes("--agent")));
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

test("default capability state is agent-neutral and uses auto-detection", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-agent-neutral-"));
  const target = join(root, "agent-neutral-project");
  await createProject({ target, title: "Agent Neutral Project", preset: "minimal", installSkills: false });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const profile = await readFile(join(target, "docs/agent/capability-profile.md"), "utf8");
  assert.equal(capabilities.agent, "auto");
  assert.match(profile, /Agent target: `auto`/);
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
  await assert.rejects(enableMcpServers(target, ["arxiv"], { agent: "example-agent" }));
  assert.equal(await readFile(path, "utf8"), invalidYaml);
});

test("MCP enable and disable update project-local records and snippets", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-"));
  const target = join(root, "mcp-project");
  await createProject({ target, title: "MCP Project", preset: "minimal", installSkills: false });

  await stat(join(target, "docs/agent/generated/mcp.json"));
  await enableMcpServers(target, ["arxiv", "openalex"], { agent: "example-agent" });
  let capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  let snippet = JSON.parse(
    await readFile(join(target, "docs/agent/generated/example-agent-mcp.json"), "utf8")
  );

  assert.deepEqual(capabilities.mcp_servers, ["arxiv", "openalex"]);
  assert.deepEqual(Object.keys(snippet.mcpServers).sort(), ["arxiv", "openalex"]);
  await assert.rejects(stat(join(target, "docs/agent/generated/mcp.json")));

  await disableMcpServers(target, ["arxiv"], { agent: "example-agent" });
  capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/example-agent-mcp.json"), "utf8"));

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
