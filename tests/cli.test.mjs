import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import YAML from "yaml";

const root = new URL("..", import.meta.url).pathname;

test("create-academic-research help exits successfully and explains framing", () => {
  const createHelp = spawnSync(process.execPath, ["dist/bin/create-academic-research.js", "--help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(createHelp.status, 0, createHelp.stderr + createHelp.stdout);
  assert.match(createHelp.stdout, /agent-ready academic research repository/);

  const lifecycleHelp = spawnSync(process.execPath, ["dist/bin/academic-research.js", "help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(lifecycleHelp.status, 0, lifecycleHelp.stderr + lifecycleHelp.stdout);
  assert.match(lifecycleHelp.stdout, /Manage a generated academic research repository/);
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
  assert.match(createVersion.stdout, /^0\.1\.0\s*$/);
  assert.equal(lifecycleVersion.stdout, createVersion.stdout);
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
  assert.match(presets.stdout, /default: Recommended setup/);
  assert.equal(status.status, 0, status.stderr + status.stdout);
  assert.match(status.stdout, /agent\tauto/);
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

test("academic-research rejects options that do not affect the selected skills command", () => {
  const cases = [
    [["skills", "list", "--agent", "example-agent"], /skills list does not accept --agent/],
    [["skills", "status", "--preset", "minimal"], /skills status does not accept --preset/],
    [["skills", "presets", "--root", "."], /skills presets does not accept --root/],
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
  assert.match(list.stdout, /available\tzotero/);

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
  assert.match(doctor.stdout, /OK: 3 MCP server\(s\) enabled/);
});

test("academic-research rejects options that do not affect the selected MCP command", () => {
  const cases = [
    [["mcp", "list", "--agent", "example-agent"], /mcp list does not accept --agent/],
    [["mcp", "available", "--root", "."], /mcp available does not accept --root/],
    [["mcp", "commands", "arxiv", "--agent", "example-agent"], /mcp commands does not accept --agent/],
    [["mcp", "install", "arxiv", "--agent", "example-agent"], /mcp install does not accept --agent/],
    [["mcp", "uninstall", "arxiv", "--agent", "example-agent"], /mcp uninstall does not accept --agent/],
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
