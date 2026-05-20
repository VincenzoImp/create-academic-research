import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import YAML from "yaml";

const root = new URL("..", import.meta.url).pathname;

test("interactive create guide explains presets, agent targets, and MCP installer behavior", async () => {
  const { formatInteractiveCreateGuide } = await import("../dist/src/cli.js");
  const guide = formatInteractiveCreateGuide();

  assert.match(guide, /Capability presets/);
  for (const preset of ["minimal", "default", "enhanced", "literature", "writing", "full"]) {
    assert.match(guide, new RegExp(`\\b${preset}\\b`));
  }
  assert.match(guide, /Agent target/);
  assert.match(guide, /universal.*Recommended.*shared project-local/s);
  assert.ok(guide.includes(".agents/skills"));
  assert.match(guide, /auto.*detect installed agents/s);
  assert.match(guide, /Supported specific agent ids/s);
  assert.match(guide, /\bclaude-code\b/);
  assert.match(guide, /\bcodex\b/);
  assert.match(guide, /\bcursor\b/);
  assert.match(guide, /claude -> claude-code/);
  assert.doesNotMatch(guide, /Codex-specific/);
  assert.match(guide, /MCP records/);
  assert.match(guide, /mcp-setup\.md/);
  assert.match(guide, /default enables only low-friction arXiv/);
  assert.match(guide, /installer/);
  assert.match(guide, /execution modes are explicit/);
  assert.match(guide, /mcp env <server>/);
});

test("create-academic-research help exits successfully and explains framing", () => {
  const createHelp = spawnSync(process.execPath, ["dist/bin/create-academic-research.js", "--help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(createHelp.status, 0, createHelp.stderr + createHelp.stdout);
  assert.match(createHelp.stdout, /agent-ready academic research repository/);
  assert.match(createHelp.stdout, /--title <name>/);
  assert.match(createHelp.stdout, /--slug <name>/);
  assert.match(createHelp.stdout, /--package <name>/);
  assert.match(createHelp.stdout, /--no-install-mcp-tools/);

  const lifecycleHelp = spawnSync(process.execPath, ["dist/bin/academic-research.js", "help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(lifecycleHelp.status, 0, lifecycleHelp.stderr + lifecycleHelp.stdout);
  assert.match(lifecycleHelp.stdout, /Manage a generated academic research repository/);
  assert.match(lifecycleHelp.stdout, /setup/);
  assert.match(lifecycleHelp.stdout, /agents/);
});

test("create-academic-research version flags report package version", () => {
  const createVersion = spawnSync(process.execPath, ["dist/bin/create-academic-research.js", "--version"], {
    cwd: root,
    encoding: "utf8"
  });
  const lifecycleVersion = spawnSync(process.execPath, ["dist/bin/academic-research.js", "--version"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(createVersion.status, 0, createVersion.stderr + createVersion.stdout);
  assert.equal(lifecycleVersion.status, 0, lifecycleVersion.stderr + lifecycleVersion.stdout);
  assert.match(createVersion.stdout, /^0\.1\.8\s*$/);
  assert.equal(lifecycleVersion.stdout, createVersion.stdout);
});

test("academic-research agents list prints special targets, aliases, and supported agent ids", () => {
  const agents = spawnSync(process.execPath, ["dist/bin/academic-research.js", "agents", "list"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(agents.status, 0, agents.stderr + agents.stdout);
  assert.match(agents.stdout, /^universal\t/m);
  assert.match(agents.stdout, /^auto\t/m);
  assert.match(agents.stdout, /^claude-code\t/m);
  assert.match(agents.stdout, /^codex\t/m);
  assert.match(agents.stdout, /^cursor\t/m);
  assert.match(agents.stdout, /^alias\tclaude\tclaude-code/m);
});

test("create-academic-research requires an explicit project directory", () => {
  const create = spawnSync(process.execPath, ["dist/bin/create-academic-research.js"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(create.status, 1);
  assert.match(create.stderr, /Please specify the project directory\./);
  assert.match(create.stderr, /npm create academic-research@latest my-research-project/);
  assert.match(create.stderr, /npx create-academic-research@latest my-research-project/);
});

test("create-academic-research binary creates and validates a project", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-"));
  const target = join(temp, "cli-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(create.status, 0, create.stderr + create.stdout);

  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  assert.equal(config.project.slug, "cli-project");
});

test("academic-research setup prints project onboarding status without changing files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-setup-"));
  const target = join(temp, "cli-setup-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const setup = spawnSync(process.execPath, ["dist/bin/academic-research.js", "setup", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(setup.status, 0, setup.stderr + setup.stdout);
  assert.match(setup.stdout, /Project Setup/);
  assert.match(setup.stdout, /doctor\tok/);
  assert.match(setup.stdout, /agent\tuniversal/);
  assert.match(setup.stdout, /preset\tdefault/);
  assert.match(setup.stdout, /installed_skill_ids\t0/);
  assert.match(setup.stdout, /mcp_enabled\tarxiv/);
  assert.match(setup.stdout, /academic-research mcp smoke/);
});

test("create-academic-research accepts equals-style string flags", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-equals-"));
  const target = join(temp, "equals-project");
  const create = spawnSync(
    process.execPath,
    [
      "dist/bin/create-academic-research.js",
      target,
      "--yes",
      "--preset=minimal",
      "--profile=academic-general",
      "--no-install-skills"
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(create.status, 0, create.stderr + create.stdout);
  const config = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(config.preset, "minimal");
});

test("create-academic-research normalizes agent aliases", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-agent-alias-"));
  const target = join(temp, "agent-alias-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--agent", "claude", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(create.status, 0, create.stderr + create.stdout);
  const config = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(config.agent, "claude-code");
});

test("create-academic-research rejects unknown agent targets before creating files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-agent-invalid-"));
  const target = join(temp, "agent-invalid-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--agent", "not-real-agent", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(create.status, 0);
  assert.match(create.stderr, /unknown agent target: not-real-agent/);
  assert.match(create.stderr, /claude-code/);
  assert.doesNotMatch(create.stderr, /Node\.js v/);
  await assert.rejects(readFile(join(target, "README.md"), "utf8"));
});

test("create-academic-research rejects unknown flags", async () => {
  const create = spawnSync(process.execPath, ["dist/bin/create-academic-research.js", "--made-up"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.notEqual(create.status, 0);
  assert.match(create.stderr, /unknown option: --made-up/);
});

test("create-academic-research rejects conflicting skill install flags", async () => {
  const create = spawnSync(
    process.execPath,
    [
      "dist/bin/create-academic-research.js",
      "conflicting-flags",
      "--yes",
      "--install-skills",
      "--no-install-skills"
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(create.status, 0);
  assert.match(create.stderr, /cannot use --install-skills and --no-install-skills together/);
  assert.doesNotMatch(create.stderr, /at createMain/);
  assert.doesNotMatch(create.stderr, /Node\.js v/);
});

test("create-academic-research accepts explicit MCP installer opt-out", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-no-mcp-install-"));
  const target = join(temp, "cli-no-mcp-install-project");
  const create = spawnSync(
    process.execPath,
    [
      "dist/bin/create-academic-research.js",
      target,
      "--yes",
      "--no-install-skills",
      "--no-install-mcp-tools"
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(create.status, 0, create.stderr + create.stdout);
  const config = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.deepEqual(config.mcp_servers, ["arxiv"]);
});

test("create-academic-research rejects conflicting MCP install flags", async () => {
  const create = spawnSync(
    process.execPath,
    [
      "dist/bin/create-academic-research.js",
      "conflicting-mcp-flags",
      "--yes",
      "--install-mcp-tools",
      "--no-install-mcp-tools"
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(create.status, 0);
  assert.match(create.stderr, /cannot use --install-mcp-tools and --no-install-mcp-tools together/);
  assert.doesNotMatch(create.stderr, /Node\.js v/);
});

test("academic-research lifecycle binary manages MCP records", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-"));
  const target = join(temp, "cli-mcp-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const enable = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "arxiv", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const disable = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "disable", "arxiv", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(enable.status, 0, enable.stderr + enable.stdout);
  assert.equal(disable.status, 0, disable.stderr + disable.stdout);
});

test("academic-research skills list and presets have distinct meanings", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-skills-list-"));
  const target = join(temp, "cli-skills-list-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });
  await mkdir(join(target, ".agents/skills/source-ingestion"), { recursive: true });
  await writeFile(join(target, ".agents/skills/source-ingestion/SKILL.md"), "---\nname: source-ingestion\n---\n");
  await mkdir(join(target, ".claude/skills/source-ingestion"), { recursive: true });
  await writeFile(join(target, ".claude/skills/source-ingestion/SKILL.md"), "---\nname: source-ingestion\n---\n");
  await mkdir(join(target, ".tabnine/agent/skills/paper-writing-review"), { recursive: true });
  await writeFile(
    join(target, ".tabnine/agent/skills/paper-writing-review/SKILL.md"),
    "---\nname: paper-writing-review\n---\n"
  );

  const list = spawnSync(process.execPath, ["dist/bin/academic-research.js", "skills", "list", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const presets = spawnSync(process.execPath, ["dist/bin/academic-research.js", "skills", "presets"], {
    cwd: root,
    encoding: "utf8"
  });
  const status = spawnSync(process.execPath, ["dist/bin/academic-research.js", "skills", "status", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(list.status, 0, list.stderr + list.stdout);
  assert.match(list.stdout, /source-ingestion\t\.agents\/skills\/source-ingestion/);
  assert.match(list.stdout, /source-ingestion\t\.claude\/skills\/source-ingestion/);
  assert.match(list.stdout, /paper-writing-review\t\.tabnine\/agent\/skills\/paper-writing-review/);
  assert.doesNotMatch(list.stdout, /Recommended setup/);
  assert.equal(presets.status, 0, presets.stderr + presets.stdout);
  assert.match(presets.stdout, /default: Clean academic research setup/);
  assert.match(presets.stdout, /enhanced: Default academic setup plus complementary/);
  assert.equal(status.status, 0, status.stderr + status.stdout);
  assert.match(status.stdout, /agent\tuniversal/);
  assert.match(status.stdout, /project_preset\tdefault/);
  assert.match(status.stdout, /skill_roots\t3/);
  assert.match(status.stdout, /installed_skill_ids\t2/);
  assert.match(status.stdout, /installed_skill_copies\t3/);
});

test("academic-research skills remove is project-local and rejects agent scoping", () => {
  const remove = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "skills", "remove", "source-ingestion", "--agent", "example-agent"],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(remove.status, 0);
  assert.match(remove.stderr, /skills remove is project-local and does not take --agent/);
});

test("academic-research skills install accepts explicit skill ids", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-skills-install-id-"));
  const target = join(temp, "cli-skills-install-id-project");
  const fakeBin = join(temp, "bin");
  const npmLog = join(temp, "npm-args.log");
  await mkdir(fakeBin, { recursive: true });
  await writeFile(
    join(fakeBin, "npm"),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "${npmLog}"\nexit 0\n`,
    "utf8"
  );
  await chmod(join(fakeBin, "npm"), 0o755);
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const install = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "skills",
      "install",
      "source-ingestion",
      "sota-literature-review",
      "--agent",
      "codex",
      "--root",
      target
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` }
    }
  );

  assert.equal(install.status, 0, install.stderr + install.stdout);
  assert.match(install.stdout, /Installed 2 skill\(s\) with 1 command\(s\)/);
  const npmArgs = await readFile(npmLog, "utf8");
  assert.match(npmArgs, /skills add VincenzoImp\/academic-research-skills --agent codex --skill source-ingestion sota-literature-review --copy -y/);
  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(capabilities.agent, "codex");
  assert.equal(capabilities.preset, "default");
});

test("academic-research skills install rejects unknown explicit skill ids", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-skills-install-unknown-"));
  const target = join(temp, "cli-skills-install-unknown-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const install = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "skills", "install", "made-up-skill", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(install.status, 0);
  assert.match(install.stderr, /unknown skill id: made-up-skill/);
});

test("academic-research rejects options that do not affect the selected skills command", () => {
  const cases = [
    [["skills", "list", "--agent", "example-agent"], /skills list does not accept --agent/],
    [["skills", "status", "--preset", "minimal"], /skills status does not accept --preset/],
    [["skills", "presets", "--root", "."], /skills presets does not accept --root/],
    [["skills", "install", "source-ingestion", "--preset", "minimal"], /skills install does not accept --preset when skill ids are provided/],
    [["skills", "remove", "source-ingestion", "--preset", "minimal"], /skills remove does not accept --preset/],
    [["skills", "update", "--agent", "example-agent"], /skills update does not accept --agent/]
  ];

  for (const [args, message] of cases) {
    const result = spawnSync(process.execPath, ["dist/bin/academic-research.js", ...args], {
      cwd: root,
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, args.join(" "));
    assert.match(result.stderr, message);
  }
});

test("academic-research mcp list reports enabled and available servers", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-list-"));
  const target = join(temp, "cli-mcp-list-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const list = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "list", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(list.status, 0, list.stderr + list.stdout);
  assert.match(list.stdout, /enabled\tarxiv/);
  assert.match(list.stdout, /available\tsemantic-scholar\tcredential-recommended\tuvx-runtime/);
  assert.match(list.stdout, /available\tdblp\tlow-friction-cs\tuvx-runtime/);
  assert.match(list.stdout, /available\tzotero/);
  assert.match(list.stdout, /available\tcrossref\tmanual\tmanual/);

  const enabled = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "enabled", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const available = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "available"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(enabled.status, 0, enabled.stderr + enabled.stdout);
  assert.match(enabled.stdout, /arxiv/);
  assert.doesNotMatch(enabled.stdout, /zotero/);
  assert.equal(available.status, 0, available.stderr + available.stdout);
  assert.match(available.stdout, /zotero/);
});

test("academic-research mcp env prints env vars and local setup prerequisites", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-env-"));
  const target = join(temp, "cli-mcp-env-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const env = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "env",
      "openalex",
      "semantic-scholar",
      "zotero",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(env.status, 0, env.stderr + env.stdout);
  assert.match(env.stdout, /^openalex\trequired\tOPENALEX_API_KEY/m);
  assert.match(env.stdout, /^semantic-scholar\trecommended\tSEMANTIC_SCHOLAR_API_KEY/m);
  assert.match(env.stdout, /^zotero\tlocal-service\tZotero desktop/m);
  assert.match(env.stdout, /^zotero\tsetup-command\tuvx --refresh zoty setup/m);
  assert.doesNotMatch(env.stdout, /your-key|your-email|\$\{[^}]+}/i);
});

test("academic-research mcp commands are separate from mcp list", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-commands-"));
  const target = join(temp, "cli-mcp-commands-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const listWithArgument = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "list", "arxiv", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const commands = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "commands", "arxiv", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.notEqual(listWithArgument.status, 0);
  assert.match(listWithArgument.stderr, /mcp list does not take arguments/);
  assert.equal(commands.status, 0, commands.stderr + commands.stdout);
  assert.match(commands.stdout, /uv tool install 'arxiv-mcp-server\[pdf\]'/);
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
  assert.match(doctor.stdout, /OK: 1 MCP server\(s\) enabled/);
});

test("academic-research mcp smoke reports readiness without launching servers", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-smoke-"));
  const target = join(temp, "cli-mcp-smoke-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const smoke = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "smoke", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const openalex = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "openalex", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );

  assert.equal(smoke.status, 0, smoke.stderr + smoke.stdout);
  assert.match(smoke.stdout, /^id\tstatus\truntime\tcheck/m);
  assert.match(smoke.stdout, /^arxiv\t(?:runtime-found|runtime-missing)\tuvx --from arxiv-mcp-server\[pdf\] arxiv-mcp-server/m);
  assert.equal(openalex.status, 1, openalex.stderr + openalex.stdout);
  assert.match(openalex.stdout, /^openalex\tmissing-required-env:OPENALEX_API_KEY/m);
});

test("academic-research rejects options that do not affect the selected MCP command", () => {
  const cases = [
    [["mcp", "list", "--agent", "example-agent"], /mcp list does not accept --agent/],
    [["mcp", "available", "--root", "."], /mcp available does not accept --root/],
    [["mcp", "commands", "arxiv", "--agent", "example-agent"], /mcp commands does not accept --agent/],
    [["mcp", "env", "openalex", "--agent", "example-agent"], /mcp env does not accept --agent/],
    [["mcp", "install", "arxiv", "--agent", "example-agent"], /mcp install does not accept --agent/],
    [["mcp", "uninstall", "arxiv", "--agent", "example-agent"], /mcp uninstall does not accept --agent/],
    [["mcp", "smoke", "arxiv", "--agent", "example-agent"], /mcp smoke does not accept --agent/],
    [["mcp", "doctor", "--agent", "example-agent"], /mcp doctor does not accept --agent/]
  ];

  for (const [args, message] of cases) {
    const result = spawnSync(process.execPath, ["dist/bin/academic-research.js", ...args], {
      cwd: root,
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, args.join(" "));
    assert.match(result.stderr, message);
  }
});

test("create-academic-research rejects unknown presets", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-bad-preset-"));
  const target = join(temp, "bad-preset-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "not-a-preset", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(create.status, 0);
  assert.match(create.stderr, /unknown capability preset/);
  assert.match(create.stderr, /minimal, default, enhanced, literature, writing, full/);
  assert.doesNotMatch(create.stderr, /at createProject/);
  assert.doesNotMatch(create.stderr, /Node\.js v/);
});

test("create-academic-research rejects unknown presets before creating target files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-bad-preset-clean-"));
  const target = join(temp, "bad-preset-clean-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "not-a-preset", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(create.status, 0);
  await assert.rejects(readFile(join(target, "README.md"), "utf8"));
});
