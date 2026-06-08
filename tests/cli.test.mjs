import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import YAML from "yaml";

const root = new URL("..", import.meta.url).pathname;
const packageVersion = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;

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
  assert.match(guide, /npm run mcp:env -- <server>/);
  assert.match(guide, /npm run mcp:env -- --dotenv --all/);
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
  assert.match(lifecycleHelp.stdout, /init/);
  assert.match(lifecycleHelp.stdout, /update/);
  assert.match(lifecycleHelp.stdout, /setup/);
  assert.match(lifecycleHelp.stdout, /agents/);
  assert.match(lifecycleHelp.stdout, /workflow/);

  const mcpHelp = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(mcpHelp.status, 0, mcpHelp.stderr + mcpHelp.stdout);
  assert.match(mcpHelp.stdout, /mcp <list\|modes\|status\|enabled\|available/);
  assert.match(mcpHelp.stdout, /--env-file <path>/);
  assert.match(mcpHelp.stdout, /--mode <mode>/);
  assert.match(mcpHelp.stdout, /--url <url>/);
  assert.match(mcpHelp.stdout, /--url-env <name>/);
  assert.match(mcpHelp.stdout, /--bearer-token-env-var <name>/);
  assert.match(mcpHelp.stdout, /--verbose/);
  assert.match(mcpHelp.stdout, /mcp setup overleaf/);
  assert.match(mcpHelp.stdout, /mcp client add overleaf --agent codex/);
  assert.match(mcpHelp.stdout, /--write <path>/);
  assert.match(mcpHelp.stdout, /--timeout-ms <ms>/);
  assert.equal((mcpHelp.stdout.match(/--root <path>/g) ?? []).length, 1);

  const workflowHelp = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(workflowHelp.status, 0, workflowHelp.stderr + workflowHelp.stdout);
  assert.match(workflowHelp.stdout, /workflow <literature\|survey\|agenda\|contribution\|analysis\|frame\|release>/);
  assert.match(workflowHelp.stdout, /citation graph/);
  assert.match(workflowHelp.stdout, /survey/);
  assert.match(workflowHelp.stdout, /agenda/);
  assert.match(workflowHelp.stdout, /contribution/);
  assert.match(workflowHelp.stdout, /analysis/);
  assert.match(workflowHelp.stdout, /frame/);
  assert.match(workflowHelp.stdout, /release/);
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
  assert.equal(createVersion.stdout.trim(), packageVersion);
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
  assert.match(create.stdout, /npm run doctor/);

  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.equal(config.project.slug, "cli-project");
  assert.match(
    packageJson.scripts.doctor,
    new RegExp(`--package=create-academic-research@${escapeRegExp(packageVersion)}`)
  );
  assert.match(packageJson.scripts.update, /--package=create-academic-research@latest -- academic-research update$/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createLegacyOverleafProject(target) {
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--agent", "codex", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(create.status, 0, create.stderr + create.stdout);
  await writeFile(
    join(target, "configs/capabilities.yaml"),
    YAML.stringify({
      agent: "codex",
      preset: "minimal",
      scope: "project-local",
      mcp_servers: ["arxiv", "dblp", "overleaf"]
    }),
    "utf8"
  );
  await writeFile(
    join(target, "docs/agent/generated/codex-mcp.json"),
    `${JSON.stringify({ mcpServers: { arxiv: {}, dblp: {} } }, null, 2)}\n`,
    "utf8"
  );
  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.devDependencies["create-academic-research"] = "0.1.14";
  packageJson.scripts.update = "npm exec --yes --package=create-academic-research@0.1.14 -- academic-research update";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
}

async function writeFakeOverleafSetupBins(parent) {
  const bin = join(parent, "fake-bin");
  await mkdir(bin, { recursive: true });
  const fakeGit = join(bin, "git");
  const fakeUv = join(bin, "uv");
  await writeFile(
    fakeGit,
    [
      "#!/usr/bin/env node",
      "import { mkdirSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "const destination = process.argv.at(-1);",
      "mkdirSync(join(destination, 'src'), { recursive: true });",
      "writeFileSync(join(destination, 'src/main.py'), 'print(\"fake overleaf mcp\")\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  await writeFile(fakeUv, "#!/usr/bin/env node\nprocess.exit(0);\n", "utf8");
  await chmod(fakeGit, 0o755);
  await chmod(fakeUv, 0o755);
  return bin;
}

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
  assert.match(setup.stdout, /npm run mcp:status/);
  assert.match(setup.stdout, /npm run mcp:smoke/);
  assert.match(setup.stdout, /npm run mcp:dotenv/);
});

test("academic-research setup derives MCP next commands from selected servers", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-setup-dynamic-"));
  const target = join(temp, "cli-setup-dynamic-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "overleaf", "--mode", "local", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  const setup = spawnSync(process.execPath, ["dist/bin/academic-research.js", "setup", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(setup.status, 0, setup.stderr + setup.stdout);
  assert.match(setup.stdout, /mcp_selected\toverleaf/);
  assert.match(setup.stdout, /fill OVERLEAF_TOKEN, PROJECT_ID in \.env\.local/);
  assert.match(setup.stdout, /npm run mcp:setup -- overleaf --mode local --env-file \.env\.local/);
  assert.doesNotMatch(setup.stdout, /npm run mcp:client:add -- overleaf --agent codex/);
  assert.doesNotMatch(setup.stdout, /npm run mcp:probe -- arxiv/);
});

test("academic-research workflow literature configures a practical SOTA stack", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-"));
  const target = join(temp, "cli-workflow-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "literature", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Literature Workflow/);
  assert.match(workflow.stdout, /mcp_selected\tarxiv,dblp,semantic-scholar,openalex/);
  assert.match(
    workflow.stdout,
    /optional_zotero\tlocal-library enrichment; reconcile through sources\/zotero\/import-log\.csv and sources\/source-ledger\.csv/
  );
  assert.match(workflow.stdout, /npm run mcp:status/);
  assert.match(workflow.stdout, /Use \$sota-literature-review/);

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(capabilities.preset, "literature");
  assert.deepEqual(capabilities.mcp_servers, ["arxiv", "dblp", "semantic-scholar", "openalex"]);
  assert.equal(capabilities.mcp_server_modes.openalex, "remote");
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/mcp.json"), "utf8"));
  assert.deepEqual(Object.keys(snippet.mcpServers).sort(), ["arxiv", "dblp", "openalex", "semantic-scholar"]);
  assert.equal(snippet.mcpServers.openalex.url, "https://openalex.caseyjhand.com/mcp");
});

test("academic-research workflow survey prints survey workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-survey-"));
  const target = join(temp, "cli-workflow-survey-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "survey", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Survey Workflow/);
  assert.match(workflow.stdout, /contract\tsurvey\/survey-contract\.md/);
  assert.match(workflow.stdout, /input\tsota\/sota-claim-ledger\.csv/);
  assert.match(workflow.stdout, /next_skill\tsurvey-synthesis/);
  assert.match(workflow.stdout, /next_skill\tsystematic-review-prisma/);
  assert.match(workflow.stdout, /next_skill\tcitation-claim-audit/);
  assert.match(workflow.stdout, /next_skill\tadversarial-peer-review/);
});

test("academic-research workflow agenda prints agenda workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-agenda-"));
  const target = join(temp, "cli-workflow-agenda-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "agenda", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Agenda Workflow/);
  assert.match(workflow.stdout, /contract\tresearch_agenda\/agenda-contract\.md/);
  assert.match(workflow.stdout, /input\tsota\/gaps\.md/);
  assert.match(workflow.stdout, /input\tsota\/sota-claim-ledger\.csv/);
  assert.match(workflow.stdout, /input\tsurvey\/survey-claim-ledger\.csv/);
  assert.match(workflow.stdout, /input\tsurvey\/final\//);
  assert.match(workflow.stdout, /next_skill\tresearch-agenda/);
  assert.match(workflow.stdout, /next_skill\tresearch-design-positioning/);
  assert.match(workflow.stdout, /next_skill\tcs-methodology-evaluation/);
  assert.match(workflow.stdout, /next_skill\tadversarial-peer-review/);
});

test("academic-research workflow contribution prints contribution workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-contribution-"));
  const target = join(temp, "cli-workflow-contribution-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "workflow", "contribution", "--root", target],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Contribution Workflow/);
  assert.match(workflow.stdout, /ledger\tcontributions\/contribution-ledger\.csv/);
  assert.match(workflow.stdout, /template\tcontributions\/templates\/contribution\.yaml/);
  assert.match(workflow.stdout, /template\tcontributions\/templates\/report\.md/);
  assert.match(workflow.stdout, /input\tresearch_agenda\/opportunity-ledger\.csv/);
  assert.match(workflow.stdout, /next_skill\tcontribution-package/);
  assert.match(workflow.stdout, /next_skill\tresearch-data-analysis/);
  assert.match(workflow.stdout, /next_skill\tresearch-results-reporting/);
  assert.match(workflow.stdout, /next_skill\texperiment-logbook/);
  assert.match(workflow.stdout, /next_skill\tpublication-figures-tables/);
  assert.match(workflow.stdout, /next_skill\tbadge-compliance-profiles/);
});

test("academic-research workflow analysis prints strict analysis workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-analysis-"));
  const target = join(temp, "cli-workflow-analysis-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "analysis", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Analysis Workflow/);
  assert.match(workflow.stdout, /template\tcontributions\/templates\/analyses\/templates\/analysis\.yaml/);
  assert.match(workflow.stdout, /blocker\tcontributions\/templates\/analyses\/templates\/blocker-summary\.md/);
  assert.match(workflow.stdout, /preflight\tprimary_question/);
  assert.match(workflow.stdout, /preflight\tunit_of_analysis/);
  assert.match(workflow.stdout, /preflight\tmetric_direction/);
  assert.match(workflow.stdout, /preflight\traw_provenance/);
  assert.match(workflow.stdout, /preflight\tsample_seed_run_counts/);
  assert.match(workflow.stdout, /preflight\tcomparison_family/);
  assert.match(workflow.stdout, /next_skill\tresearch-data-analysis/);
  assert.match(workflow.stdout, /next_skill\tresearch-results-reporting/);
  assert.match(workflow.stdout, /next_skill\tpublication-figures-tables/);
  assert.match(workflow.stdout, /next_skill\tcitation-claim-audit/);
  assert.match(workflow.stdout, /next_skill\tadversarial-peer-review/);
});

test("academic-research workflow frame prints paper framing workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-frame-"));
  const target = join(temp, "cli-workflow-frame-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "frame", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Paper Frame Workflow/);
  assert.match(workflow.stdout, /ledger\tpaper_frames\/frame-ledger\.csv/);
  assert.match(workflow.stdout, /template\tpaper_frames\/templates\/frame-contract\.md/);
  assert.match(workflow.stdout, /input\tcontributions\/contribution-ledger\.csv/);
  assert.match(workflow.stdout, /input\tcompliance\/profiles\.yaml/);
  assert.match(workflow.stdout, /target\tvenue,track,year,audience/);
  assert.match(workflow.stdout, /next_skill\tpaper-framing/);
  assert.match(workflow.stdout, /next_skill\tcs-venue-strategy/);
  assert.match(workflow.stdout, /next_skill\tadversarial-peer-review/);
  assert.match(workflow.stdout, /next_skill\tbadge-compliance-profiles/);
});

test("academic-research workflow release prints paper release workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-release-"));
  const target = join(temp, "cli-workflow-release-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "release", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Paper Release Workflow/);
  assert.match(workflow.stdout, /ledger\tpaper_releases\/release-ledger\.csv/);
  assert.match(workflow.stdout, /manifest\tpaper_releases\/templates\/release\.yaml/);
  assert.match(workflow.stdout, /source_map\tpaper_releases\/templates\/source-map\.csv/);
  assert.match(workflow.stdout, /lock\tpaper_releases\/templates\/release-plan\.lock/);
  assert.match(workflow.stdout, /checksums\tpaper_releases\/templates\/checksums\.txt/);
  assert.match(workflow.stdout, /input\tpaper_frames\/frame-ledger\.csv/);
  assert.match(workflow.stdout, /next_skill\tpaper-release/);
  assert.match(workflow.stdout, /next_skill\tartifact-open-science/);
  assert.match(workflow.stdout, /next_skill\tresearch-repo-reproduction/);
  assert.match(workflow.stdout, /next_skill\tbadge-compliance-profiles/);
});

test("academic-research setup prints Overleaf client registration only after setup is ready", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-setup-ready-"));
  const target = join(temp, "cli-setup-ready-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "overleaf", "--mode", "local", "--agent", "codex", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  await mkdir(join(target, ".academic-research/mcp/overleaf"), { recursive: true });
  await writeFile(join(target, ".academic-research/mcp/overleaf/run-overleaf-mcp.sh"), "#!/bin/sh\n", "utf8");
  await writeFile(
    join(target, "docs/agent/capability-lock.json"),
    JSON.stringify(
      {
        version: 1,
        mcp: {
          overleaf: {
            selected_mode: "local",
            connection_mode: "manual-local",
            setup: {
              status: "ready",
              server_path: ".academic-research/mcp/overleaf/server",
              wrapper_path: ".academic-research/mcp/overleaf/run-overleaf-mcp.sh"
            }
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const setup = spawnSync(process.execPath, ["dist/bin/academic-research.js", "setup", "--root", target], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, OVERLEAF_TOKEN: "secret-token", PROJECT_ID: "project-123" }
  });

  assert.equal(setup.status, 0, setup.stderr + setup.stdout);
  const clientIndex = setup.stdout.indexOf("npm run mcp:client:add -- overleaf --agent codex");
  const probeIndex = setup.stdout.indexOf("npm run mcp:probe -- overleaf --env-file .env.local");
  assert.ok(clientIndex >= 0, setup.stdout);
  assert.ok(probeIndex > clientIndex, setup.stdout);
  assert.doesNotMatch(setup.stdout, /secret-token|project-123/);
});

test("academic-research update is a dry-run by default and applies with --apply", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-update-"));
  const target = join(temp, "cli-update-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });
  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.doctor = "academic-research doctor";
  packageJson.scripts.update = "npm exec --yes --package=create-academic-research@0.1.12 -- academic-research update";
  packageJson.devDependencies["create-academic-research"] = "0.1.12";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const dryRun = spawnSync(process.execPath, ["dist/bin/academic-research.js", "update", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const stillStale = JSON.parse(await readFile(packagePath, "utf8"));
  const apply = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const updated = JSON.parse(await readFile(packagePath, "utf8"));

  assert.equal(dryRun.status, 0, dryRun.stderr + dryRun.stdout);
  assert.match(dryRun.stdout, /DRY-RUN/);
  assert.match(dryRun.stdout, /package\.json/);
  assert.equal(stillStale.scripts.doctor, "academic-research doctor");
  assert.equal(apply.status, 0, apply.stderr + apply.stdout);
  assert.match(apply.stdout, /UPDATED/);
  assert.match(
    updated.scripts.doctor,
    new RegExp(`--package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research doctor`)
  );
  assert.equal(
    updated.scripts.update,
    "npm exec --yes --package=create-academic-research@latest -- academic-research update"
  );
});

test("academic-research update --apply leaves clean generated projects unchanged", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-update-clean-"));
  const target = join(temp, "cli-update-clean-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(create.status, 0, create.stderr + create.stdout);

  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const gitAvailable = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
  if (gitAvailable) {
    assert.equal(spawnSync("git", ["init"], { cwd: target, encoding: "utf8" }).status, 0);
    assert.equal(spawnSync("git", ["add", "."], { cwd: target, encoding: "utf8" }).status, 0);
    const commit = spawnSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "baseline"],
      { cwd: target, encoding: "utf8" }
    );
    assert.equal(commit.status, 0, commit.stderr + commit.stdout);
  }

  const apply = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const after = await readFile(manifestPath, "utf8");

  assert.equal(apply.status, 0, apply.stderr + apply.stdout);
  assert.match(apply.stdout, /No managed file changes/);
  assert.equal(after, before);
  if (gitAvailable) {
    const status = spawnSync("git", ["status", "--short"], { cwd: target, encoding: "utf8" });
    assert.equal(status.status, 0, status.stderr + status.stdout);
    assert.equal(status.stdout, "");
  }
});

test("academic-research update --apply is idempotent after legacy skipped files", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-update-legacy-idempotent-"));
  const target = join(temp, "cli-update-legacy-idempotent-project");
  const create = spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(create.status, 0, create.stderr + create.stdout);
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");

  const first = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const beforeManifest = JSON.parse(before);

  const second = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const after = await readFile(manifestPath, "utf8");

  assert.equal(first.status, 0, first.stderr + first.stdout);
  assert.match(first.stdout, /^create\t\.academic-research\/managed-files\.json/m);
  assert.match(first.stdout, /^skip\t\.env\.example\tunknown legacy content/m);
  assert.equal(beforeManifest.files[".env.example"].reason, "unknown legacy content");
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.match(second.stdout, /No managed file changes/);
  assert.doesNotMatch(second.stdout, /update\t\.academic-research\/managed-files\.json/);
  assert.doesNotMatch(second.stdout, /local edits detected/);
  assert.equal(after, before);
});

test("academic-research update guides legacy Overleaf projects without running setup", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-update-legacy-overleaf-"));
  const target = join(temp, "cli-update-legacy-overleaf-project");
  await createLegacyOverleafProject(target);

  const first = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  const second = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const after = await readFile(manifestPath, "utf8");

  assert.equal(first.status, 0, first.stderr + first.stdout);
  assert.equal(packageJson.devDependencies["create-academic-research"], packageVersion);
  assert.equal(
    packageJson.scripts.update,
    "npm exec --yes --package=create-academic-research@latest -- academic-research update"
  );
  assert.match(first.stdout, /npm run setup -- --env-file \.env\.local/);
  assert.match(first.stdout, /npm run doctor/);
  await assert.rejects(stat(join(target, ".academic-research/mcp")));
  assert.equal(doctor.status, 1, doctor.stderr + doctor.stdout);
  assert.match(doctor.stderr, /overleaf: enabled but missing from generated MCP snippet/);
  assert.match(doctor.stderr, /NEXT: npm run mcp:setup -- overleaf --mode local --env-file \.env\.local/);
  assert.match(doctor.stderr, /Missing env vars: OVERLEAF_TOKEN, PROJECT_ID/);
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.match(second.stdout, /No managed file changes/);
  assert.doesNotMatch(second.stdout, /update\t\.academic-research\/managed-files\.json/);
  assert.equal(after, before);
});

test("academic-research setup completes Overleaf project-local setup from an env file", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-setup-overleaf-friendly-"));
  const target = join(temp, "cli-setup-overleaf-friendly-project");
  await createLegacyOverleafProject(target);
  const update = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "update", "--apply", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(update.status, 0, update.stderr + update.stdout);
  const envFile = join(temp, "overleaf.env");
  const tokenName = "OVERLEAF_" + "TOKEN";
  const projectName = "PROJECT_" + "ID";
  const localSecretValue = "local-" + "fixture";
  const localProjectValue = "project-" + "fixture";
  await writeFile(envFile, `${tokenName}=${localSecretValue}\n${projectName}=${localProjectValue}\n`, "utf8");
  const fakeBin = await writeFakeOverleafSetupBins(temp);

  const setup = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "setup", "--root", target, "--env-file", envFile],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}` }
    }
  );
  const lock = JSON.parse(await readFile(join(target, "docs/agent/capability-lock.json"), "utf8"));
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/codex-mcp.json"), "utf8"));
  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const second = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "setup", "--root", target, "--env-file", envFile],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}` }
    }
  );

  assert.equal(setup.status, 0, setup.stderr + setup.stdout);
  assert.match(setup.stdout, /Completed project-local MCP setup: overleaf/);
  assert.match(setup.stdout, /npm run mcp:client:add -- overleaf --agent codex/);
  assert.equal(lock.mcp.overleaf.setup.wrapper_path, ".academic-research/mcp/overleaf/run-overleaf-mcp.sh");
  assert.equal(snippet.mcpServers.overleaf.command, ".academic-research/mcp/overleaf/run-overleaf-mcp.sh");
  assert.doesNotMatch(JSON.stringify(lock), new RegExp(`${localSecretValue}|${localProjectValue}`));
  assert.doesNotMatch(JSON.stringify(snippet), new RegExp(`${localSecretValue}|${localProjectValue}`));
  assert.doesNotMatch(setup.stdout + setup.stderr, new RegExp(`${localSecretValue}|${localProjectValue}`));
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
  assert.doesNotMatch(doctor.stderr, /missing from generated MCP snippet/);
  assert.match(doctor.stderr, /overleaf is setup locally but not registered in Codex/);
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.doesNotMatch(second.stdout, /Completed project-local MCP setup: overleaf/);
});

test("academic-research init preserves existing files while adding the research contract", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-init-"));
  const target = join(temp, "cli-existing-project");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "README.md"), "# Keep Me\n", "utf8");

  const init = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "init",
      "--root",
      target,
      "--title",
      "CLI Existing Project",
      "--slug",
      "cli-existing-project",
      "--package",
      "cli_existing_project",
      "--preset",
      "minimal"
    ],
    { cwd: root, encoding: "utf8" }
  );
  const readme = await readFile(join(target, "README.md"), "utf8");
  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(init.status, 0, init.stderr + init.stdout);
  assert.match(init.stdout, /Initialized cli-existing-project/);
  assert.equal(readme, "# Keep Me\n");
  assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
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

test("academic-research mcp enable supports local, curated remote, and custom remote modes", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-enable-modes-"));
  const target = join(temp, "cli-mcp-enable-modes-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const local = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "dblp", "--mode", "local", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const curatedRemote = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "openalex", "--mode", "remote", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const customRemote = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "pubmed",
      "--mode",
      "remote-custom",
      "--url",
      "https://example.com/pubmed-mcp",
      "--bearer-token-env-var",
      "PUBMED_MCP_TOKEN",
      "--root",
      target
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PUBMED_MCP_TOKEN: "secret-token" }
    }
  );
  const customRemoteUrlEnv = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote-custom",
      "--url-env",
      "OPENALEX_MCP_URL",
      "--bearer-token-env-var",
      "OPENALEX_MCP_TOKEN",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(local.status, 0, local.stderr + local.stdout);
  assert.equal(curatedRemote.status, 0, curatedRemote.stderr + curatedRemote.stdout);
  assert.equal(customRemote.status, 0, customRemote.stderr + customRemote.stdout);
  assert.equal(customRemoteUrlEnv.status, 0, customRemoteUrlEnv.stderr + customRemoteUrlEnv.stdout);

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  const snippet = JSON.parse(await readFile(join(target, "docs/agent/generated/mcp.json"), "utf8"));
  assert.equal(capabilities.mcp_server_modes.dblp, "local");
  assert.equal(capabilities.mcp_server_modes.openalex, "remote-custom");
  assert.equal(capabilities.mcp_server_modes.pubmed, "remote-custom");
  assert.equal(capabilities.mcp_server_remote.openalex.url_env, "OPENALEX_MCP_URL");
  assert.equal(capabilities.mcp_server_remote.openalex.bearer_token_env_var, "OPENALEX_MCP_TOKEN");
  assert.equal(capabilities.mcp_server_remote.pubmed.url, "https://example.com/pubmed-mcp");
  assert.equal(capabilities.mcp_server_remote.pubmed.bearer_token_env_var, "PUBMED_MCP_TOKEN");
  assert.equal(snippet.mcpServers.pubmed.url, "https://example.com/pubmed-mcp");
  assert.equal(snippet.mcpServers.openalex.urlEnv, "OPENALEX_MCP_URL");
  assert.doesNotMatch(JSON.stringify(capabilities), /secret-token/);
  assert.doesNotMatch(JSON.stringify(snippet), /secret-token/);
});

test("academic-research mcp enable rejects unsupported curated remote and incomplete custom remote", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-enable-invalid-"));
  const target = join(temp, "cli-mcp-enable-invalid-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const unsupportedRemote = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "arxiv", "--mode", "remote", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const missingEndpoint = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "openalex", "--mode", "remote-custom", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.notEqual(unsupportedRemote.status, 0);
  assert.match(unsupportedRemote.stderr, /arxiv does not support MCP mode remote/);
  assert.match(unsupportedRemote.stderr, /remote-custom/);
  assert.notEqual(missingEndpoint.status, 0);
  assert.match(missingEndpoint.stderr, /remote-custom requires --url or --url-env/);
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

test("academic-research mcp modes explains available modes without source-code knowledge", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-modes-"));
  const target = join(temp, "cli-mcp-modes-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const modes = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "modes", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const openalex = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "modes", "openalex", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(modes.status, 0, modes.stderr + modes.stdout);
  assert.match(modes.stdout, /^id\tselected\trecommended\tsupported\tenv\tnext/m);
  assert.match(modes.stdout, /^openalex\tno\tremote\tremote, local, custom remote\tOPENALEX_API_KEY\tenable openalex/m);
  assert.match(modes.stdout, /^arxiv\tyes\tlocal\tlocal, custom remote\tnone\tready/m);
  assert.match(modes.stdout, /^overleaf\tno\tlocal\tmanual setup\tOVERLEAF_TOKEN, PROJECT_ID\tenable overleaf/m);
  assert.equal(openalex.status, 0, openalex.stderr + openalex.stdout);
  assert.match(openalex.stdout, /openalex supports remote, local, and custom remote/);
  assert.match(openalex.stdout, /Recommended: remote/);
  assert.match(openalex.stdout, /OPENALEX_API_KEY/);
});

test("academic-research mcp status reports friendly lifecycle state by default and technical detail when verbose", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-status-"));
  const target = join(temp, "cli-mcp-status-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote",
      "--agent",
      "codex",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  const status = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "status", "--root", target], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, OPENALEX_API_KEY: "" }
  });
  const verbose = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "status", "--verbose", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );

  assert.equal(status.status, 0, status.stderr + status.stdout);
  assert.match(status.stdout, /^id\tselected\tmode\tstate\tnext/m);
  assert.match(status.stdout, /^openalex\tyes\tremote\tsetup needed\tnpm run mcp:client:add -- openalex --agent codex/m);
  assert.match(status.stdout, /^arxiv\tno\tlocal\tnot selected\tenable arxiv/m);
  assert.doesNotMatch(status.stdout, /manual-local-blocked|missing-required|missing env/i);
  assert.equal(verbose.status, 0, verbose.stderr + verbose.stdout);
  assert.match(verbose.stdout, /^id\tselected\tmode\tconnection_mode\tenv\tinstall\tsnippet\tclient\tprobe\tnext/m);
  assert.match(verbose.stdout, /^openalex\tyes\tremote\tremote-curated\tok\tremote\tavailable\tcodex:not-added\tunknown\t/m);
  assert.match(verbose.stdout, /^arxiv\tno\tlocal\tstdio-local\tn\/a\tn\/a\tnone\tnone\tn\/a\t/m);
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
  const dotenv = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "env", "--dotenv", "--all", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const requiredOnly = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "env",
      "openalex",
      "semantic-scholar",
      "--required",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );
  const writePath = join(target, "custom-mcp.env.example");
  const writeEnv = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "env",
      "--write",
      writePath,
      "--all",
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
  assert.equal(dotenv.status, 0, dotenv.stderr + dotenv.stdout);
  assert.match(dotenv.stdout, /^SEMANTIC_SCHOLAR_API_KEY=/m);
  assert.match(dotenv.stdout, /^OPENALEX_API_KEY=/m);
  assert.match(dotenv.stdout, /^MCP_TRANSPORT_TYPE=stdio/m);
  assert.match(dotenv.stdout, /^PAPER_SEARCH_MCP_UNPAYWALL_EMAIL=/m);
  assert.doesNotMatch(dotenv.stdout, /your-key|your-token|\$\{[^}]+}/i);
  assert.equal(requiredOnly.status, 0, requiredOnly.stderr + requiredOnly.stdout);
  assert.match(requiredOnly.stdout, /^openalex\trequired\tOPENALEX_API_KEY/m);
  assert.doesNotMatch(requiredOnly.stdout, /SEMANTIC_SCHOLAR_API_KEY/);
  assert.equal(writeEnv.status, 0, writeEnv.stderr + writeEnv.stdout);
  assert.match(writeEnv.stdout, /Wrote MCP dotenv environment reference/);
  const written = await readFile(writePath, "utf8");
  assert.match(written, /^OPENALEX_API_KEY=/m);
  assert.match(written, /^MCP_TRANSPORT_TYPE=stdio/m);
  assert.doesNotMatch(written, /your-key|your-token|\$\{[^}]+}/i);

  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "openalex", "--mode", "remote", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const remoteEnv = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "env", "openalex", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(remoteEnv.status, 0, remoteEnv.stderr + remoteEnv.stdout);
  assert.match(remoteEnv.stdout, /^openalex\thosted-endpoint\thttps:\/\/openalex\.caseyjhand\.com\/mcp/m);
  assert.doesNotMatch(remoteEnv.stdout, /OPENALEX_API_KEY/);
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

test("academic-research mcp install explains skipped runtime-only and manual-local servers", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-install-skip-"));
  const target = join(temp, "cli-mcp-install-skip-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "dblp", "overleaf", "--mode", "local", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  const install = spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "install", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(install.status, 0, install.stderr + install.stdout);
  assert.match(install.stdout, /Ran 0 MCP install command\(s\)\./);
  assert.match(install.stdout, /Skipped dblp: runtime-only; the MCP client launches it on demand/);
  assert.match(install.stdout, /Skipped overleaf: manual setup; run npm run mcp:setup -- overleaf --mode local --env-file \.env\.local/);
});

test("academic-research mcp setup overleaf dry-run prints a finite non-secret plan", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-setup-overleaf-"));
  const target = join(temp, "cli-mcp-setup-overleaf-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "overleaf", "--mode", "local", "--root", target],
    { cwd: root, encoding: "utf8" }
  );
  const envFile = join(target, ".env.local");
  await writeFile(envFile, "OVERLEAF_TOKEN=secret-token\nPROJECT_ID=project-123\n", "utf8");

  const setup = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "setup",
      "overleaf",
      "--mode",
      "local",
      "--env-file",
      envFile,
      "--dry-run",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(setup.status, 0, setup.stderr + setup.stdout);
  assert.match(setup.stdout, /Overleaf setup plan/);
  assert.match(setup.stdout, /git clone .*overleaf-mcp-server/);
  assert.match(setup.stdout, /uv sync/);
  assert.match(setup.stdout, /\.academic-research\/mcp\/overleaf\/run-overleaf-mcp\.sh/);
  assert.doesNotMatch(setup.stdout, /secret-token|project-123/);
});

test("academic-research mcp client add supports Codex dry-run registration", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-client-add-"));
  const target = join(temp, "cli-mcp-client-add-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "enable", "overleaf", "--mode", "local", "--agent", "codex", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  const client = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "client",
      "add",
      "overleaf",
      "--agent",
      "codex",
      "--dry-run",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(client.status, 0, client.stderr + client.stdout);
  assert.match(client.stdout, /codex mcp add overleaf -- /);
  assert.match(client.stdout, /\.academic-research\/mcp\/overleaf\/run-overleaf-mcp\.sh/);
  assert.match(client.stdout, /Overleaf setup is not ready/);
  assert.match(client.stdout, /npm run mcp:setup -- overleaf --mode local --env-file \.env\.local/);
  assert.doesNotMatch(client.stdout, /OVERLEAF_TOKEN|secret-token|PROJECT_ID=project/);
  await assert.rejects(readFile(join(target, "docs/agent/capability-lock.json"), "utf8"));
});

test("academic-research mcp client add rejects Codex automation for custom remote URL env vars", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-client-url-env-"));
  const target = join(temp, "cli-mcp-client-url-env-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote-custom",
      "--url-env",
      "OPENALEX_MCP_URL",
      "--bearer-token-env-var",
      "OPENALEX_MCP_TOKEN",
      "--agent",
      "codex",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  const dryRun = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "client",
      "add",
      "openalex",
      "--agent",
      "codex",
      "--dry-run",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );
  const nonDryRun = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "client", "add", "openalex", "--agent", "codex", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(dryRun.status, 0, dryRun.stderr + dryRun.stdout);
  assert.match(dryRun.stdout, /Codex CLI does not support URL env vars/);
  assert.match(dryRun.stdout, /codex mcp add openalex --url "\$OPENALEX_MCP_URL"/);
  assert.doesNotMatch(dryRun.stdout, /--url-env/);
  assert.notEqual(nonDryRun.status, 0);
  assert.match(nonDryRun.stdout, /Codex CLI does not support URL env vars/);
  assert.doesNotMatch(nonDryRun.stdout, /--url-env/);
  await assert.rejects(readFile(join(target, "docs/agent/capability-lock.json"), "utf8"));
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
  const envFile = join(target, ".env.local");
  await writeFile(envFile, "OPENALEX_API_KEY=file-openalex-key\n", "utf8");
  const pathEnvFile = join(target, ".env.path.local");
  await writeFile(pathEnvFile, "PATH=/nonexistent\n", "utf8");
  const openalexWithEnvFile = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "openalex", "--env-file", envFile, "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );
  const runtimeWithEnvFilePath = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "pubmed", "--env-file", pathEnvFile, "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(smoke.status, 0, smoke.stderr + smoke.stdout);
  assert.match(smoke.stdout, /^id\tstatus\truntime\tcheck/m);
  assert.match(smoke.stdout, /^arxiv\t(?:runtime-found|runtime-missing)\tuvx --from arxiv-mcp-server\[pdf\] arxiv-mcp-server/m);
  assert.equal(openalex.status, 1, openalex.stderr + openalex.stdout);
  assert.match(openalex.stdout, /^openalex\tmissing-required-env:OPENALEX_API_KEY/m);
  assert.equal(openalexWithEnvFile.status, 0, openalexWithEnvFile.stderr + openalexWithEnvFile.stdout);
  assert.doesNotMatch(openalexWithEnvFile.stdout, /missing-required-env/);
  assert.equal(runtimeWithEnvFilePath.status, 0, runtimeWithEnvFilePath.stderr + runtimeWithEnvFilePath.stdout);
  assert.match(runtimeWithEnvFilePath.stdout, /^pubmed\truntime-missing\tnpx -y @cyanheads\/pubmed-mcp-server/m);
});

test("academic-research mcp smoke is state-aware for custom remote URL env vars", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-smoke-url-env-"));
  const target = join(temp, "cli-mcp-smoke-url-env-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote-custom",
      "--url-env",
      "OPENALEX_MCP_URL",
      "--bearer-token-env-var",
      "OPENALEX_MCP_TOKEN",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  const missing = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "openalex", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_MCP_URL: "", OPENALEX_MCP_TOKEN: "secret-token" }
    }
  );
  const present = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "openalex", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        OPENALEX_MCP_URL: "https://private.example/mcp",
        OPENALEX_MCP_TOKEN: "secret-token"
      }
    }
  );

  assert.equal(missing.status, 1, missing.stderr + missing.stdout);
  assert.match(missing.stdout, /^openalex\tmissing-required-env:OPENALEX_MCP_URL/m);
  assert.equal(present.status, 0, present.stderr + present.stdout);
  assert.match(present.stdout, /^openalex\tremote-endpoint\tcustom remote endpoint from OPENALEX_MCP_URL/m);
  assert.doesNotMatch(present.stdout, /npx -y @cyanheads\/openalex-mcp-server|private\.example|secret-token/);
});

test("academic-research mcp smoke rejects explicit custom remote mode without endpoint config", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-smoke-no-remote-"));
  const target = join(temp, "cli-mcp-smoke-no-remote-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const smoke = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "smoke", "openalex", "--mode", "remote-custom", "--root", target],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(smoke.status, 1, smoke.stderr + smoke.stdout);
  assert.match(smoke.stdout, /^openalex\tmissing-remote-url\tcustom remote endpoint not configured/m);
  assert.doesNotMatch(smoke.stdout, /^openalex\tremote-endpoint/m);
});

test("academic-research doctor reports missing custom remote URL env vars", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-doctor-url-env-"));
  const target = join(temp, "cli-doctor-url-env-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote-custom",
      "--url-env",
      "OPENALEX_MCP_URL",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  const doctor = spawnSync(process.execPath, ["dist/bin/academic-research.js", "doctor", "--root", target], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, OPENALEX_MCP_URL: "" }
  });

  assert.equal(doctor.status, 1, doctor.stderr + doctor.stdout);
  assert.match(doctor.stderr, /openalex: missing required environment variable: OPENALEX_MCP_URL/);
  assert.match(doctor.stderr, /npm run mcp:doctor -- --env-file \.env\.local/);
  assert.doesNotMatch(doctor.stdout, /^OK:/m);
});

test("academic-research mcp doctor can read an explicit env file", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-env-file-"));
  const target = join(temp, "cli-mcp-env-file-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });
  spawnSync(process.execPath, ["dist/bin/academic-research.js", "mcp", "enable", "openalex", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });
  const envFile = join(target, ".env.local");
  await writeFile(envFile, "# local secrets\nOPENALEX_API_KEY=file-openalex-key\n", "utf8");

  const withoutEnvFile = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "doctor", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );
  const withEnvFile = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "doctor", "--env-file", envFile, "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );

  assert.equal(withoutEnvFile.status, 1, withoutEnvFile.stderr + withoutEnvFile.stdout);
  assert.match(withoutEnvFile.stderr, /openalex: missing required environment variable: OPENALEX_API_KEY/);
  assert.equal(withEnvFile.status, 0, withEnvFile.stderr + withEnvFile.stdout);
  assert.match(withEnvFile.stdout, /OK: 1 MCP server\(s\) enabled/);
});

test("academic-research mcp probe reports missing env without launching credentialed servers", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-probe-"));
  const target = join(temp, "cli-mcp-probe-project");
  spawnSync(process.execPath, ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"], {
    cwd: root,
    encoding: "utf8"
  });

  const probe = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "probe", "openalex", "--timeout-ms", "100", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_API_KEY: "" }
    }
  );

  assert.equal(probe.status, 1, probe.stderr + probe.stdout);
  assert.match(probe.stdout, /^id\tstatus\tdetail/m);
  assert.match(probe.stdout, /^openalex\tmissing-env\tOPENALEX_API_KEY/m);
});

test("academic-research mcp probe is state-aware for custom remote URL env vars", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-probe-url-env-"));
  const target = join(temp, "cli-mcp-probe-url-env-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );
  spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "enable",
      "openalex",
      "--mode",
      "remote-custom",
      "--url-env",
      "OPENALEX_MCP_URL",
      "--bearer-token-env-var",
      "OPENALEX_MCP_TOKEN",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );

  const missing = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "probe", "openalex", "--timeout-ms", "100", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OPENALEX_MCP_URL: "", OPENALEX_MCP_TOKEN: "secret-token" }
    }
  );
  const present = spawnSync(
    process.execPath,
    ["dist/bin/academic-research.js", "mcp", "probe", "openalex", "--timeout-ms", "100", "--root", target],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        OPENALEX_MCP_URL: "https://private.example/mcp",
        OPENALEX_MCP_TOKEN: "secret-token"
      }
    }
  );
  const lock = JSON.parse(await readFile(join(target, "docs/agent/capability-lock.json"), "utf8"));

  assert.equal(missing.status, 1, missing.stderr + missing.stdout);
  assert.match(missing.stdout, /^openalex\tmissing-env\tOPENALEX_MCP_URL/m);
  assert.doesNotMatch(missing.stdout, /\tmanual\t/);
  assert.equal(present.status, 0, present.stderr + present.stdout);
  assert.match(present.stdout, /^openalex\tremote-configured\tcustom remote endpoint from OPENALEX_MCP_URL; remote probe does not perform a stdio handshake/m);
  assert.doesNotMatch(present.stdout, /private\.example|secret-token|\tmanual\t/);
  assert.equal(lock.mcp.openalex.probe.status, "remote-configured");
  assert.doesNotMatch(JSON.stringify(lock), /private\.example|secret-token/);
});

test("academic-research mcp probe rejects explicit custom remote mode without endpoint config", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-mcp-probe-no-remote-"));
  const target = join(temp, "cli-mcp-probe-no-remote-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const probe = spawnSync(
    process.execPath,
    [
      "dist/bin/academic-research.js",
      "mcp",
      "probe",
      "openalex",
      "--mode",
      "remote-custom",
      "--timeout-ms",
      "100",
      "--root",
      target
    ],
    { cwd: root, encoding: "utf8" }
  );
  const lock = JSON.parse(await readFile(join(target, "docs/agent/capability-lock.json"), "utf8"));

  assert.equal(probe.status, 1, probe.stderr + probe.stdout);
  assert.match(probe.stdout, /^openalex\tmissing-remote-url\tcustom remote endpoint not configured/m);
  assert.doesNotMatch(probe.stdout, /^openalex\tremote-configured/m);
  assert.equal(lock.mcp.openalex.probe.status, "missing-remote-url");
});

test("academic-research rejects options that do not affect the selected MCP command", () => {
  const cases = [
    [["mcp", "list", "--agent", "example-agent"], /mcp list does not accept --agent/],
    [["mcp", "available", "--root", "."], /mcp available does not accept --root/],
    [["mcp", "commands", "arxiv", "--agent", "example-agent"], /mcp commands does not accept --agent/],
    [["mcp", "env", "openalex", "--agent", "example-agent"], /mcp env does not accept --agent/],
    [["mcp", "env", "openalex", "--required", "--recommended"], /mcp env cannot use --required and --recommended together/],
    [["mcp", "install", "arxiv", "--agent", "example-agent"], /mcp install does not accept --agent/],
    [["mcp", "uninstall", "arxiv", "--agent", "example-agent"], /mcp uninstall does not accept --agent/],
    [["mcp", "smoke", "arxiv", "--agent", "example-agent"], /mcp smoke does not accept --agent/],
    [["mcp", "doctor", "--agent", "example-agent"], /mcp doctor does not accept --agent/],
    [["mcp", "probe", "arxiv", "--agent", "example-agent"], /mcp probe does not accept --agent/]
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
