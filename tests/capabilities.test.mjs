import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import {
  buildSkillInstallCommands,
  buildExplicitSkillInstallCommands,
  clientAddMcpServer,
  clientRemoveMcpServer,
  disableMcpServers,
  doctorMcpServers,
  enableMcpServers,
  getMcpLifecycleStatus,
  installMcpTools,
  installSkillIds,
  installSkills,
  mcpToolCommandTexts,
  probeMcpServers,
  readCapabilityLock,
  readCapabilities,
  readMcpEnvironmentFile,
  renderMcpSnippet,
  removeSkills,
  setupMcpServer,
  SUPPORTED_SKILL_AGENT_TARGETS,
  uninstallMcpTools,
  updateSkills
} from "../dist/src/capabilities.js";
import { createProject } from "../dist/src/project.js";
import { AGENT_STACK, mcpServerModeKeys } from "../dist/src/stack.js";

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

test("explicit skill installs map ids to canonical skill sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-explicit-"));
  const target = join(root, "skills-explicit-project");
  await createProject({ target, title: "Skills Explicit Project", preset: "default", installSkills: false });

  const commands = await buildExplicitSkillInstallCommands(
    target,
    ["source-ingestion", "frontend-design", "docling", "brainstorming"],
    { agent: "codex" }
  );
  const rendered = commands.map((command) => command.join(" ")).join("\n");
  const calls = [];
  await installSkillIds(target, ["source-ingestion", "source-ingestion"], { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });

  assert.equal(commands.length, 4);
  assert.match(rendered, /VincenzoImp\/academic-research-skills --agent codex --skill source-ingestion --copy -y/);
  assert.match(rendered, /anthropics\/skills --agent codex --skill frontend-design --copy -y/);
  assert.match(rendered, /existential-birds\/beagle --agent codex --skill docling --copy -y/);
  assert.match(rendered, /obra\/superpowers --agent codex --skill brainstorming --copy -y/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].command.join(" "), /--skill source-ingestion --copy -y/);
  assert.ok(calls.every((call) => call.cwd === target));

  await assert.rejects(buildExplicitSkillInstallCommands(target, ["made-up-skill"]), /unknown skill id: made-up-skill/);
});

test("full preset keeps research policy inside the academic research package", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-full-policy-"));
  const target = join(root, "skills-full-policy-project");
  await createProject({ target, title: "Skills Full Policy Project", preset: "full", installSkills: false });

  const commands = await buildSkillInstallCommands(target, "full");
  const rendered = commands.map((command) => command.join(" ")).join("\n");

  assert.equal(commands.length, 4);
  assert.match(rendered, /VincenzoImp\/academic-research-skills/);
  assert.match(rendered, /obra\/superpowers/);
  assert.match(rendered, /anthropics\/skills/);
  assert.match(rendered, /existential-birds\/beagle/);
  assert.doesNotMatch(rendered, /academic-writing-skills/);
  assert.doesNotMatch(rendered, /ai-paper-reproduction-skill/);
  assert.doesNotMatch(rendered, /openalex-database/);
  assert.doesNotMatch(rendered, /semanticscholar-skill/);
  assert.doesNotMatch(rendered, /zotero-paper-reader/);
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

test("skill install writes non-secret capability lock facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-capability-lock-"));
  const target = join(root, "skills-capability-lock-project");
  await createProject({ target, title: "Skills Capability Lock Project", preset: "default", installSkills: false });

  await installSkills(target, "default", { agent: "codex" }, {
    run: async () => ({ code: 0 })
  });

  const lock = await readCapabilityLock(target);
  assert.equal(lock.version, 1);
  assert.equal(lock.generator.name, "create-academic-research");
  assert.equal(lock.skills.preset, "default");
  assert.equal(lock.skills.agent, "codex");
  assert.equal(lock.skills.last_action, "install");
  assert.equal(lock.skills.status, "ready");
  assert.equal(lock.skills.sources.academic_research.source, "VincenzoImp/academic-research-skills");
  assert.ok(lock.skills.sources.academic_research.skill_ids.includes("source-ingestion"));
  assert.ok(lock.skills.sources.academic_research.skill_ids.includes("sota-literature-review"));
  assert.equal(lock.skills.sources.academic_research.action, "install");
  assert.doesNotMatch(JSON.stringify(lock), /secret-token|api[_-]?key|cookie|session/i);
});

test("preset skill lock records skill ids for each installed source", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-source-lock-"));
  const target = join(root, "skills-source-lock-project");
  await createProject({ target, title: "Skills Source Lock Project", preset: "enhanced", installSkills: false });

  await installSkills(target, "enhanced", {}, {
    run: async () => ({ code: 0 })
  });

  const lock = await readCapabilityLock(target);
  assert.ok(lock.skills.sources.academic_research.skill_ids.includes("source-ingestion"));
  assert.ok(lock.skills.sources.superpowers.skill_ids.includes("test-driven-development"));
  assert.ok(lock.skills.sources.anthropics.skill_ids.includes("frontend-design"));
  assert.ok(lock.skills.sources.docling.skill_ids.includes("docling"));
  assert.doesNotMatch(JSON.stringify(lock), /secret-token|api[_-]?key|cookie|session/i);
});

test("explicit skill install writes explicit skill facts to capability lock", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-explicit-lock-"));
  const target = join(root, "skills-explicit-lock-project");
  await createProject({ target, title: "Skills Explicit Lock Project", preset: "default", installSkills: false });

  await installSkillIds(target, ["source-ingestion"], { agent: "claude-code" }, {
    run: async () => ({ code: 0 })
  });

  const lock = await readCapabilityLock(target);
  assert.deepEqual(lock.skills.explicit_skill_ids, ["source-ingestion"]);
  assert.equal(lock.skills.agent, "claude-code");
  assert.equal(lock.skills.skills["source-ingestion"].source, "VincenzoImp/academic-research-skills");
  assert.equal(lock.skills.skills["source-ingestion"].action, "install");
  assert.equal(lock.skills.skills["source-ingestion"].status, "ready");
});

test("skills update and remove maintain non-secret capability lock state", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-skills-update-lock-"));
  const target = join(root, "skills-update-lock-project");
  await createProject({ target, title: "Skills Update Lock Project", preset: "default", installSkills: false });
  await installSkillIds(target, ["source-ingestion"], {}, {
    run: async () => ({ code: 0 })
  });

  await updateSkills(target, { run: async () => ({ code: 0 }) });
  let lock = await readCapabilityLock(target);
  assert.equal(lock.skills.last_action, "update");
  assert.equal(lock.skills.status, "updated");
  assert.equal(lock.skills.skills["source-ingestion"].action, "update");

  await removeSkills(target, ["source-ingestion"], { run: async () => ({ code: 0 }) });
  lock = await readCapabilityLock(target);
  assert.equal(lock.skills.last_action, "remove");
  assert.equal(lock.skills.status, "removed");
  assert.equal(lock.skills.skills["source-ingestion"].status, "removed");
  assert.equal(lock.skills.skills["source-ingestion"].action, "remove");
  assert.doesNotMatch(JSON.stringify(lock), /secret-token|api[_-]?key|cookie|session/i);
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

test("old MCP-only capability locks remain valid", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-old-capability-lock-"));
  const target = join(root, "old-capability-lock-project");
  await createProject({ target, title: "Old Capability Lock Project", preset: "default", installSkills: false });
  await writeFile(join(target, "docs/agent/capability-lock.json"), '{\n  "version": 1,\n  "mcp": {}\n}\n', "utf8");

  const lock = await readCapabilityLock(target);

  assert.equal(lock.version, 1);
  assert.deepEqual(lock.mcp, {});
  assert.deepEqual(lock.skills.skills, {});
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

test("MCP lifecycle status keeps old string server records on local mode", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-lifecycle-old-"));
  const target = join(root, "mcp-lifecycle-old-project");
  await createProject({ target, title: "MCP Lifecycle Old Project", preset: "minimal", installSkills: false });
  await writeFile(
    join(target, "configs/capabilities.yaml"),
    YAML.stringify({
      agent: "universal",
      preset: "literature",
      scope: "project-local",
      mcp_servers: ["arxiv", "dblp"]
    }),
    "utf8"
  );

  const state = await readCapabilities(target);
  const status = await getMcpLifecycleStatus(target, { env: { PATH: "" } });
  const arxiv = status.servers.find((server) => server.id === "arxiv");
  const dblp = status.servers.find((server) => server.id === "dblp");
  const openalex = status.servers.find((server) => server.id === "openalex");

  assert.deepEqual(state.mcp_servers, ["arxiv", "dblp"]);
  assert.deepEqual(state.mcp_server_modes, {});
  assert.equal(arxiv.selected, true);
  assert.equal(arxiv.mode, "local");
  assert.equal(arxiv.connection_mode, "stdio-local");
  assert.equal(arxiv.install, "finite-installer");
  assert.equal(arxiv.client, "snippet");
  assert.equal(dblp.selected, true);
  assert.equal(dblp.mode, "local");
  assert.equal(dblp.connection_mode, "stdio-local");
  assert.equal(dblp.install, "runtime-only");
  assert.equal(openalex.selected, false);
  assert.equal(openalex.env, "n/a");
  assert.equal(openalex.install, "n/a");
  assert.match(openalex.next, /enable openalex/);
  assert.match(openalex.next, /recommended: remote/);
});

test("MCP lifecycle status only treats successful probe states as ready", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-probe-status-"));
  const target = join(root, "mcp-probe-status-project");
  await createProject({ target, title: "MCP Probe Status Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["arxiv"], { agent: "universal", mode: "local" });

  for (const probeStatus of [
    "timeout",
    "startup-failed",
    "runtime-missing",
    "missing-env",
    "missing-remote-url",
    "protocol-error",
    "manual"
  ]) {
    await writeFile(
      join(target, "docs/agent/capability-lock.json"),
      `${JSON.stringify(
        {
          version: 1,
          mcp: {
            arxiv: {
              selected_mode: "local",
              connection_mode: "stdio-local",
              probe: { status: probeStatus, detail: "regression" }
            }
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const status = await getMcpLifecycleStatus(target, { env: { PATH: "" } });
    const arxiv = status.servers.find((server) => server.id === "arxiv");
    assert.notEqual(arxiv.state, "ready", probeStatus);
    assert.notEqual(arxiv.next, "ready", probeStatus);
    assert.match(arxiv.next, /npm run mcp:probe -- arxiv/, probeStatus);
  }

  for (const probeStatus of ["ok", "remote-configured"]) {
    await writeFile(
      join(target, "docs/agent/capability-lock.json"),
      `${JSON.stringify(
        {
          version: 1,
          mcp: {
            arxiv: {
              selected_mode: "local",
              connection_mode: "stdio-local",
              probe: { status: probeStatus, detail: "regression" }
            }
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const status = await getMcpLifecycleStatus(target, { env: { PATH: "" } });
    const arxiv = status.servers.find((server) => server.id === "arxiv");
    assert.equal(arxiv.state, "ready", probeStatus);
    assert.equal(arxiv.next, "ready", probeStatus);
  }
});

test("MCP catalog exposes honest supported modes", () => {
  assert.deepEqual(mcpServerModeKeys("arxiv"), ["local", "remote-custom"]);
  assert.deepEqual(mcpServerModeKeys("semantic-scholar"), ["local", "remote-custom"]);
  assert.deepEqual(mcpServerModeKeys("openalex"), ["local", "remote", "remote-custom"]);
  assert.deepEqual(mcpServerModeKeys("pubmed"), ["local", "remote", "remote-custom"]);
  assert.deepEqual(mcpServerModeKeys("dblp"), ["local", "remote-custom"]);
  assert.deepEqual(mcpServerModeKeys("zotero"), ["local"]);
  assert.deepEqual(mcpServerModeKeys("overleaf"), ["local"]);
  assert.deepEqual(mcpServerModeKeys("crossref"), ["manual"]);
  assert.deepEqual(mcpServerModeKeys("paper-search"), ["manual"]);
});

test("OpenAlex and PubMed remote mode update state, snippets, setup docs, and doctor env checks", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-remote-mode-"));
  const target = join(root, "mcp-remote-mode-project");
  await createProject({ target, title: "MCP Remote Mode Project", preset: "minimal", installSkills: false });

  await enableMcpServers(target, ["openalex", "pubmed"], { agent: "codex", mode: "remote" });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/codex-mcp.json"), "utf8"));
  const setup = await readFile(join(target, "docs/agent/mcp-setup.md"), "utf8");
  const doctor = await doctorMcpServers(target, { env: { OPENALEX_API_KEY: "" } });
  const status = await getMcpLifecycleStatus(target, { env: { PATH: "" } });
  const openalex = status.servers.find((server) => server.id === "openalex");
  const pubmed = status.servers.find((server) => server.id === "pubmed");

  assert.equal(capabilities.mcp_server_modes.openalex, "remote");
  assert.equal(capabilities.mcp_server_modes.pubmed, "remote");
  assert.equal(snippet.mcpServers.openalex.url, "https://openalex.caseyjhand.com/mcp");
  assert.equal(snippet.mcpServers.pubmed.url, "https://pubmed.caseyjhand.com/mcp");
  assert.equal(snippet.mcpServers.openalex.command, undefined);
  assert.doesNotMatch(JSON.stringify(snippet), /OPENALEX_API_KEY|NCBI_API_KEY/);
  assert.match(setup, /`openalex` .*Selected mode: `remote`/s);
  assert.match(setup, /`pubmed` .*Selected mode: `remote`/s);
  assert.equal(doctor.ok, true);
  assert.equal(openalex.mode, "remote");
  assert.equal(openalex.connection_mode, "remote-curated");
  assert.equal(openalex.env, "ok");
  assert.equal(pubmed.mode, "remote");
  assert.equal(pubmed.connection_mode, "remote-curated");
});

test("custom remote MCP mode stores only non-secret endpoint facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-custom-remote-"));
  const target = join(root, "mcp-custom-remote-project");
  await createProject({ target, title: "MCP Custom Remote Project", preset: "minimal", installSkills: false });

  await enableMcpServers(target, ["openalex"], {
    agent: "codex",
    mode: "remote-custom",
    remote: {
      url: "https://example.com/mcp",
      transport: "streamable-http",
      bearer_token_env_var: "OPENALEX_MCP_TOKEN"
    }
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/codex-mcp.json"), "utf8"));
  const status = await getMcpLifecycleStatus(target, {
    env: { OPENALEX_MCP_TOKEN: "super-secret-token" }
  });
  const openalex = status.servers.find((server) => server.id === "openalex");

  assert.equal(capabilities.mcp_server_modes.openalex, "remote-custom");
  assert.deepEqual(capabilities.mcp_server_remote.openalex, {
    url: "https://example.com/mcp",
    transport: "streamable-http",
    bearer_token_env_var: "OPENALEX_MCP_TOKEN"
  });
  assert.equal(snippet.mcpServers.openalex.url, "https://example.com/mcp");
  assert.equal(snippet.mcpServers.openalex.type, "streamable-http");
  assert.equal(snippet.mcpServers.openalex.bearerTokenEnvVar, "OPENALEX_MCP_TOKEN");
  assert.equal(openalex.mode, "custom remote");
  assert.equal(openalex.connection_mode, "remote-custom");
  assert.doesNotMatch(JSON.stringify(capabilities), /super-secret-token/);
  assert.doesNotMatch(JSON.stringify(snippet), /super-secret-token/);
});

test("custom remote MCP mode can keep the endpoint URL in an env var", async () => {
  const state = {
    agent: "codex",
    preset: "minimal",
    scope: "project-local",
    mcp_servers: ["openalex"],
    mcp_server_modes: { openalex: "remote-custom" },
    mcp_server_remote: {
      openalex: {
        url_env: "OPENALEX_MCP_URL",
        transport: "streamable-http",
        bearer_token_env_var: "OPENALEX_MCP_TOKEN"
      }
    }
  };
  const snippet = JSON.parse(renderMcpSnippet(state).content);

  assert.equal(snippet.mcpServers.openalex.urlEnv, "OPENALEX_MCP_URL");
  assert.equal(snippet.mcpServers.openalex.bearerTokenEnvVar, "OPENALEX_MCP_TOKEN");
  assert.doesNotMatch(JSON.stringify(snippet), /https:\/\/private|secret-token/);
});

test("Overleaf lifecycle reports missing setup, writes a non-secret wrapper, and records setup facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-overleaf-setup-"));
  const target = join(root, "mcp-overleaf-setup-project");
  await createProject({ target, title: "MCP Overleaf Setup Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["overleaf"], { agent: "codex", mode: "local" });

  const missing = await getMcpLifecycleStatus(target, { env: { PATH: "", OVERLEAF_TOKEN: "", PROJECT_ID: "" } });
  const missingOverleaf = missing.servers.find((server) => server.id === "overleaf");
  assert.equal(missingOverleaf.selected, true);
  assert.equal(missingOverleaf.mode, "manual setup");
  assert.equal(missingOverleaf.connection_mode, "manual-local");
  assert.equal(missingOverleaf.env, "missing-required");
  assert.equal(missingOverleaf.install, "setup needed");
  assert.match(missingOverleaf.next, /mcp:setup -- overleaf --mode local --env-file \.env\.local/);

  const plan = await setupMcpServer(target, "overleaf", {
    mode: "local",
    envFile: ".env.local",
    env: { OVERLEAF_TOKEN: "secret-token", PROJECT_ID: "project-123" },
    dryRun: true
  });
  assert.equal(plan.ok, true);
  assert.match(plan.commands.join("\n"), /git clone .*overleaf-mcp-server/);
  assert.match(plan.commands.join("\n"), /uv sync/);

  const calls = [];
  const setup = await setupMcpServer(
    target,
    "overleaf",
    {
      mode: "local",
      envFile: ".env.local",
      env: { OVERLEAF_TOKEN: "secret-token", PROJECT_ID: "project-123" }
    },
    { run: async (command, options) => calls.push({ command, cwd: options.cwd }) }
  );
  const wrapperPath = join(target, ".academic-research/mcp/overleaf/run-overleaf-mcp.sh");
  const launcherPath = join(target, ".academic-research/mcp/overleaf/run-overleaf-mcp.mjs");
  const wrapper = await readFile(wrapperPath, "utf8");
  const launcher = await readFile(launcherPath, "utf8");
  const lock = await readCapabilityLock(target);

  assert.equal(setup.ok, true);
  assert.ok(calls.some((call) => call.command.join(" ").includes("git clone")));
  assert.ok(calls.some((call) => call.command.join(" ").includes("uv sync")));
  assert.match(wrapper, /\.env\.local/);
  assert.match(wrapper, /run-overleaf-mcp\.mjs/);
  assert.doesNotMatch(wrapper, /\.\s+"\$ENV_FILE"|source|set -a/);
  assert.match(launcher, /parseDotenv/);
  assert.match(launcher, /uv/);
  assert.match(launcher, /src\/main\.py/);
  assert.doesNotMatch(launcher, /eval|execSync|shell:\s*true/);
  assert.doesNotMatch(wrapper, /secret-token|project-123/);
  assert.doesNotMatch(launcher, /secret-token|project-123/);
  assert.equal(lock.mcp.overleaf.setup.status, "ready");
  assert.equal(lock.mcp.overleaf.setup.wrapper_path, ".academic-research/mcp/overleaf/run-overleaf-mcp.sh");
  assert.equal(lock.mcp.overleaf.setup.server_path, ".academic-research/mcp/overleaf/server");
  assert.equal(lock.mcp.overleaf.selected_mode, "local");
  assert.equal(lock.mcp.overleaf.connection_mode, "manual-local");
  assert.doesNotMatch(JSON.stringify(lock), /secret-token|project-123/);

  const ready = await getMcpLifecycleStatus(target, {
    env: { PATH: "", OVERLEAF_TOKEN: "secret-token", PROJECT_ID: "project-123" }
  });
  const readyOverleaf = ready.servers.find((server) => server.id === "overleaf");
  assert.equal(readyOverleaf.install, "ready");
  assert.equal(readyOverleaf.client, "codex:not-added");
});

test("dotenv parser keeps shell-sensitive Overleaf values literal", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-dotenv-safe-"));
  const envFile = join(root, ".env.local");
  await writeFile(
    envFile,
    [
      "OVERLEAF_TOKEN=$(touch should-not-run)",
      "PROJECT_ID=project-${USER}",
      "QUOTED='value with # and $HOME'",
      ""
    ].join("\n"),
    "utf8"
  );

  const parsed = await readMcpEnvironmentFile(envFile);

  assert.equal(parsed.OVERLEAF_TOKEN, "$(touch should-not-run)");
  assert.equal(parsed.PROJECT_ID, "project-${USER}");
  assert.equal(parsed.QUOTED, "value with # and $HOME");
});

test("Codex client registration blocks Overleaf until setup facts and wrapper are ready", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-client-blocked-"));
  const target = join(root, "mcp-client-blocked-project");
  await createProject({ target, title: "MCP Client Blocked Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["overleaf"], { agent: "codex", mode: "local" });

  const dryRun = await clientAddMcpServer(target, "overleaf", { agent: "codex", dryRun: true });
  const dryLock = await readCapabilityLock(target);
  const calls = [];
  const blocked = await clientAddMcpServer(target, "overleaf", { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  const lock = await readCapabilityLock(target);

  assert.equal(dryRun.ok, false);
  assert.match(dryRun.command.join(" "), /codex mcp add overleaf -- /);
  assert.match(dryRun.instructions.join("\n"), /Overleaf setup is not ready/);
  assert.match(dryRun.instructions.join("\n"), /npm run mcp:setup -- overleaf --mode local --env-file \.env\.local/);
  assert.equal(dryLock.mcp.overleaf?.clients, undefined);
  assert.equal(blocked.ok, false);
  assert.deepEqual(calls, []);
  assert.equal(lock.mcp.overleaf?.clients, undefined);
});

test("Codex client registration uses wrapper or remote URL without persisting secrets", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-client-"));
  const target = join(root, "mcp-client-project");
  await createProject({ target, title: "MCP Client Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["overleaf"], { agent: "codex", mode: "local" });
  await setupMcpServer(
    target,
    "overleaf",
    {
      mode: "local",
      envFile: ".env.local",
      env: { OVERLEAF_TOKEN: "secret-token", PROJECT_ID: "project-123" }
    },
    { run: async () => ({ code: 0 }) }
  );

  const dryRun = await clientAddMcpServer(target, "overleaf", { agent: "codex", dryRun: true });
  assert.deepEqual(dryRun.command.slice(0, 4), ["codex", "mcp", "add", "overleaf"]);
  assert.ok(dryRun.command.includes("--"));
  assert.match(dryRun.command.join(" "), /\.academic-research\/mcp\/overleaf\/run-overleaf-mcp\.sh/);

  const calls = [];
  await clientAddMcpServer(target, "overleaf", { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  let lock = await readCapabilityLock(target);
  assert.equal(lock.mcp.overleaf.clients.codex.status, "registered");
  assert.doesNotMatch(JSON.stringify(lock), /secret-token|project-123/);
  assert.deepEqual(calls[0].command.slice(0, 4), ["codex", "mcp", "add", "overleaf"]);

  await clientRemoveMcpServer(target, "overleaf", { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  lock = await readCapabilityLock(target);
  assert.equal(lock.mcp.overleaf.clients.codex.status, "removed");
  assert.deepEqual(calls.at(-1).command, ["codex", "mcp", "remove", "overleaf"]);
});

test("Codex client registration supports custom remote URLs without persisting token values", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-client-remote-url-"));
  const target = join(root, "mcp-client-remote-url-project");
  await createProject({ target, title: "MCP Client Remote URL Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["openalex"], {
    agent: "codex",
    mode: "remote-custom",
    remote: {
      url: "https://example.com/openalex-mcp",
      transport: "streamable-http",
      bearer_token_env_var: "OPENALEX_MCP_TOKEN"
    }
  });

  const dryRun = await clientAddMcpServer(target, "openalex", { agent: "codex", dryRun: true });
  const calls = [];
  await clientAddMcpServer(target, "openalex", { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  const lock = await readCapabilityLock(target);

  assert.deepEqual(dryRun.command, [
    "codex",
    "mcp",
    "add",
    "openalex",
    "--url",
    "https://example.com/openalex-mcp",
    "--bearer-token-env-var",
    "OPENALEX_MCP_TOKEN"
  ]);
  assert.deepEqual(calls[0].command, dryRun.command);
  assert.equal(lock.mcp.openalex.clients.codex.status, "registered");
  assert.doesNotMatch(JSON.stringify(lock), /secret-token/);
});

test("Codex client registration rejects custom remote URL env vars without updating lock", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-client-url-env-"));
  const target = join(root, "mcp-client-url-env-project");
  await createProject({ target, title: "MCP Client URL Env Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["openalex"], {
    agent: "codex",
    mode: "remote-custom",
    remote: {
      url_env: "OPENALEX_MCP_URL",
      transport: "streamable-http",
      bearer_token_env_var: "OPENALEX_MCP_TOKEN"
    }
  });

  const dryRun = await clientAddMcpServer(target, "openalex", { agent: "codex", dryRun: true });
  const dryLock = await readCapabilityLock(target);
  const calls = [];
  const blocked = await clientAddMcpServer(target, "openalex", { agent: "codex" }, {
    run: async (command, options) => calls.push({ command, cwd: options.cwd })
  });
  const lock = await readCapabilityLock(target);

  assert.equal(dryRun.ok, false);
  assert.deepEqual(dryRun.command, []);
  assert.match(dryRun.instructions.join("\n"), /Codex CLI does not support URL env vars/);
  assert.match(dryRun.instructions.join("\n"), /codex mcp add openalex --url "\$OPENALEX_MCP_URL"/);
  assert.doesNotMatch(dryRun.instructions.join("\n"), /--url-env/);
  assert.equal(dryLock.mcp.openalex?.clients, undefined);
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.command, []);
  assert.deepEqual(calls, []);
  assert.equal(lock.mcp.openalex?.clients, undefined);
});

test("default MCP preset enables only low-friction arXiv and keeps the wider catalog documented", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-default-policy-"));
  const target = join(root, "mcp-default-policy-project");
  await createProject({ target, title: "MCP Default Policy Project", preset: "default", installSkills: false });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/mcp.json"), "utf8"));
  const setup = await readFile(join(target, "docs/agent/mcp-setup.md"), "utf8");

  assert.deepEqual(capabilities.mcp_servers, ["arxiv"]);
  assert.deepEqual(Object.keys(snippet.mcpServers), ["arxiv"]);
  assert.match(setup, /`arxiv`/);
  assert.match(setup, /`semantic-scholar`/);
  assert.match(setup, /`openalex`/);
  assert.match(setup, /Requires env/);
  assert.match(setup, /Recommended env/);
});

test("full MCP preset stays practical and avoids domain-specific runtime prerequisites by default", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-full-policy-"));
  const target = join(root, "mcp-full-policy-project");
  await createProject({ target, title: "MCP Full Policy Project", preset: "full", installSkills: false });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const setup = await readFile(join(target, "docs/agent/mcp-setup.md"), "utf8");

  assert.deepEqual(capabilities.mcp_servers, ["arxiv", "dblp"]);
  assert.match(setup, /`pubmed` \(available/);
  assert.doesNotMatch(setup, /`pubmed` \(enabled/);
});

test("MCP setup documents execution mode, hosted endpoints, setup commands, and non-secret env requirements", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-setup-detail-"));
  const target = join(root, "mcp-setup-detail-project");
  await createProject({ target, title: "MCP Setup Detail Project", preset: "minimal", installSkills: false });

  await enableMcpServers(target, ["openalex", "pubmed", "zotero", "paper-search"], { agent: "universal" });
  const setup = await readFile(join(target, "docs/agent/mcp-setup.md"), "utf8");

  assert.match(setup, /Execution mode: `npx-runtime`/);
  assert.match(setup, /Hosted endpoint: <https:\/\/openalex\.caseyjhand\.com\/mcp>/);
  assert.match(setup, /Hosted endpoint: <https:\/\/pubmed\.caseyjhand\.com\/mcp>/);
  assert.match(setup, /Setup command: `uvx --refresh zoty setup`/);
  assert.match(setup, /Setup command: `uvx --refresh zoty doctor`/);
  assert.match(setup, /Requires env: `OPENALEX_API_KEY`/);
  assert.match(setup, /\.env\.example/);
  assert.match(setup, /npm run mcp:env -- --dotenv --all/);
  assert.doesNotMatch(setup, /your-key|your-email|api_key=YOUR_KEY|\$\{[^}]+}/i);
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

test("MCP doctor reports credentialed, manual, and local-service prerequisites", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-prereq-"));
  const target = join(root, "mcp-prereq-project");
  await createProject({ target, title: "MCP Prereq Project", preset: "minimal", installSkills: false });
  const previousEnv = {
    OPENALEX_API_KEY: process.env.OPENALEX_API_KEY,
    OVERLEAF_TOKEN: process.env.OVERLEAF_TOKEN,
    SEMANTIC_SCHOLAR_API_KEY: process.env.SEMANTIC_SCHOLAR_API_KEY
  };
  delete process.env.OPENALEX_API_KEY;
  delete process.env.OVERLEAF_TOKEN;
  delete process.env.SEMANTIC_SCHOLAR_API_KEY;

  try {
    await enableMcpServers(target, ["openalex", "semantic-scholar", "zotero", "crossref", "overleaf"], {
      agent: "codex"
    });
    const result = await doctorMcpServers(target);
    const warnings = result.warnings.join("\n");
    const errors = result.errors.join("\n");

    assert.equal(result.ok, false);
    assert.match(errors, /openalex: missing required environment variable/);
    assert.match(errors, /overleaf: missing required environment variable/);
    assert.match(warnings, /semantic-scholar: recommended environment variable not set: SEMANTIC_SCHOLAR_API_KEY/);
    assert.match(warnings, /zotero: requires local service/);
    assert.match(warnings, /crossref: manual setup only; no generated client command/);
  } finally {
    for (const [name, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});

test("MCP doctor accepts explicit environment maps without mutating process env", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-env-map-"));
  const target = join(root, "mcp-env-map-project");
  await createProject({ target, title: "MCP Env Map Project", preset: "minimal", installSkills: false });
  await enableMcpServers(target, ["openalex"], { agent: "codex" });

  const missing = await doctorMcpServers(target, { env: { OPENALEX_API_KEY: "" } });
  const present = await doctorMcpServers(target, { env: { OPENALEX_API_KEY: "file-openalex-key" } });

  assert.equal(missing.ok, false);
  assert.match(missing.errors.join("\n"), /OPENALEX_API_KEY/);
  assert.equal(present.ok, true);
});

test("MCP probe can complete a newline-delimited stdio JSON-RPC handshake", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-probe-fake-"));
  const target = join(root, "mcp-probe-fake-project");
  await createProject({ target, title: "MCP Probe Fake Project", preset: "minimal", installSkills: false });
  const fakeServer = join(root, "fake-mcp-server.mjs");
  await writeFile(
    fakeServer,
    `
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  while (true) {
    const newline = buffer.indexOf("\\n");
    if (newline === -1) return;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    if (message.id === 1) respond({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake", version: "1.0.0" } } });
    if (message.id === 2) respond({ jsonrpc: "2.0", id: 2, result: { tools: [] } });
  }
});
function respond(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}
`,
    "utf8"
  );
  await chmod(fakeServer, 0o755);
  const original = {
    command: AGENT_STACK.mcp_servers.arxiv.command,
    args: AGENT_STACK.mcp_servers.arxiv.args
  };
  AGENT_STACK.mcp_servers.arxiv.command = process.execPath;
  AGENT_STACK.mcp_servers.arxiv.args = [fakeServer];
  try {
    const result = await probeMcpServers(target, ["arxiv"], { timeoutMs: 1000 });
    assert.equal(result.ok, true);
    assert.deepEqual(result.results, [{ server: "arxiv", status: "ok", detail: "tools=0" }]);
  } finally {
    AGENT_STACK.mcp_servers.arxiv.command = original.command;
    AGENT_STACK.mcp_servers.arxiv.args = original.args;
  }
});

test("MCP probe still accepts Content-Length framed stdio responses", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-mcp-probe-framed-"));
  const target = join(root, "mcp-probe-framed-project");
  await createProject({ target, title: "MCP Probe Framed Project", preset: "minimal", installSkills: false });
  const fakeServer = join(root, "fake-framed-mcp-server.mjs");
  await writeFile(
    fakeServer,
    `
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  while (true) {
    const newline = buffer.indexOf("\\n");
    if (newline === -1) return;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    if (message.id === 1) respond({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake", version: "1.0.0" } } });
    if (message.id === 2) respond({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "sample" }] } });
  }
});
function respond(message) {
  const body = JSON.stringify(message);
  process.stdout.write("Content-Length: " + Buffer.byteLength(body) + "\\r\\n\\r\\n" + body);
}
`,
    "utf8"
  );
  await chmod(fakeServer, 0o755);
  const original = {
    command: AGENT_STACK.mcp_servers.arxiv.command,
    args: AGENT_STACK.mcp_servers.arxiv.args
  };
  AGENT_STACK.mcp_servers.arxiv.command = process.execPath;
  AGENT_STACK.mcp_servers.arxiv.args = [fakeServer];
  try {
    const result = await probeMcpServers(target, ["arxiv"], { timeoutMs: 1000 });
    assert.equal(result.ok, true);
    assert.deepEqual(result.results, [{ server: "arxiv", status: "ok", detail: "tools=1" }]);
  } finally {
    AGENT_STACK.mcp_servers.arxiv.command = original.command;
    AGENT_STACK.mcp_servers.arxiv.args = original.args;
  }
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
  const runtimeOnly = ["semantic-scholar", "openalex", "pubmed", "zotero", "dblp"];

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

  assert.equal(result.count, 1);
  assert.match(rendered, /uv tool install arxiv-mcp-server/);
  assert.doesNotMatch(rendered, /uv tool install overleaf-mcp-server/);
  assert.doesNotMatch(rendered, /semantic-scholar-mcp/);
  assert.doesNotMatch(rendered, /openalex-mcp-server/);
  assert.doesNotMatch(rendered, /pubmed-mcp-server/);
  assert.doesNotMatch(rendered, /zoty/);
  assert.doesNotMatch(rendered, /mcp-dblp/);
});
