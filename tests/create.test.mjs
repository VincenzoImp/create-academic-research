import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import { createProject, doctorProject, initProject, renameProject, updateProject } from "../dist/src/project.js";

const packageRoot = new URL("..", import.meta.url).pathname;
const packageVersion = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")).version;

test("createProject generates a personalized research project without global side effects", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-create-"));
  const target = join(root, "paper-project");

  await createProject({
    target,
    title: "Paper Project",
    slug: "paper-project",
    packageName: "paper_project",
    profile: "academic-general",
    preset: "default",
    installSkills: false
  });

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const capabilities = YAML.parse(
    await readFile(join(target, "configs/capabilities.yaml"), "utf8")
  );
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  const pyproject = await readFile(join(target, "pyproject.toml"), "utf8");
  const readme = await readFile(join(target, "README.md"), "utf8");

  assert.equal(config.project.slug, "paper-project");
  assert.equal(config.project.title, "Paper Project");
  assert.equal(config.project.package, "paper_project");
  assert.equal(capabilities.scope, "project-local");
  assert.equal(capabilities.agent, "universal");
  assert.deepEqual(capabilities.mcp_servers, ["arxiv"]);
  assert.equal(packageJson.name, "paper-project");
  assert.equal(packageJson.devDependencies["create-academic-research"], packageVersion);
  assert.match(packageJson.scripts.update, /--package=create-academic-research@latest -- academic-research update$/);
  assert.match(
    packageJson.scripts.doctor,
    new RegExp(`--package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research doctor$`)
  );
  assert.match(pyproject, /name = "paper-project"/);
  assert.match(readme, /^# Paper Project/);
  await stat(join(target, "src/paper_project/__init__.py"));
  await stat(join(target, "docs/agent/generated/mcp.json"));
  const manifest = JSON.parse(await readFile(join(target, ".academic-research/managed-files.json"), "utf8"));
  assert.equal(manifest.generator.name, "create-academic-research");
  assert.equal(manifest.generator.version, packageVersion);
  assert.equal(manifest.files[".env.example"].policy, "managed");
  assert.equal(manifest.files["docs/agent/generated/mcp.json"].policy, "generated");
  assert.equal(manifest.files["wiki/log.md"].policy, "append-only");
  assert.equal(manifest.files["README.md"].policy, "user-owned");
  assert.equal(manifest.files["docs/agent/repo-migration-playbook.md"].policy, "user-owned");
  assert.equal(manifest.files["docs/reproducibility/commands.md"].policy, "user-owned");
  assert.equal(manifest.files["analysis_outputs/claim-audit.md"].policy, "user-owned");
  assert.equal(manifest.files["repro_outputs/SUMMARY.md"].policy, "user-owned");
  assert.doesNotMatch(JSON.stringify(manifest), /secret|token|api[_-]?key|cookie|session/i);
  await stat(join(target, ".gitignore"));
  await assert.rejects(stat(join(target, "_gitignore")));
  await stat(join(target, ".env.example"));
  await stat(join(target, "docs/getting-started.md"));
  await stat(join(target, "docs/agent/mcp-client-setup.md"));
  await stat(join(target, "docs/agent/repo-migration-playbook.md"));
  await stat(join(target, "docs/agent/project-quality.md"));
  await stat(join(target, "docs/reproducibility/commands.md"));
  await stat(join(target, "analysis_outputs/claim-audit.md"));
  await stat(join(target, "repro_outputs/SUMMARY.md"));
  await stat(join(target, "repro_outputs/COMMANDS.md"));
  await stat(join(target, "repro_outputs/LOG.md"));
  await stat(join(target, "repro_outputs/PATCHES.md"));
  await stat(join(target, "repro_outputs/status.json"));
  await stat(join(target, "sources/markdown-linear/.gitkeep"));
  await stat(join(target, "sota/paper-syntheses/.gitkeep"));
  await stat(join(target, "sota/reading-log.csv"));
  await stat(join(target, "sota/citation-chasing-log.csv"));
  await stat(join(target, "reports/paper/sota-survey.tex"));
  await stat(join(target, "artifacts/badge-evidence-ledger.csv"));
  await stat(join(target, "experiments/campaigns/autonomous-campaign-template.md"));
  await stat(join(target, "experiments/campaigns/frontier-results.tsv"));
  const envExample = await readFile(join(target, ".env.example"), "utf8");
  assert.match(envExample, /SEMANTIC_SCHOLAR_API_KEY=/);
  assert.match(envExample, /OPENALEX_API_KEY=/);
  assert.match(envExample, /MCP_TRANSPORT_TYPE=stdio/);
  assert.doesNotMatch(envExample, /your-key|your-token|\$\{[^}]+}/i);
  const gitignore = await readFile(join(target, ".gitignore"), "utf8");
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /\*\.egg-info\//);
  assert.match(gitignore, /!\.env\.example/);
  const mcpSetup = await readFile(join(target, "docs/agent/mcp-setup.md"), "utf8");
  assert.match(mcpSetup, /## Enabled MCP Servers/);
  assert.match(mcpSetup, /`arxiv`/);
  assert.match(mcpSetup, /## Available MCP Catalog/);
  assert.match(mcpSetup, /`semantic-scholar`/);
  assert.match(mcpSetup, /`openalex`/);
  await stat(join(target, "scripts/README.md"));
  await stat(join(target, "notebooks/README.md"));
  await stat(join(target, "wiki/templates/source-page.md"));
  await stat(join(target, "wiki/templates/claim-page.md"));
  await stat(join(target, "wiki/templates/experiment-page.md"));
  await stat(join(target, "wiki/templates/decision-record.md"));
  await stat(join(target, "wiki/templates/reviewer-concern.md"));
  await stat(join(target, "wiki/templates/research-question.md"));
  const literatureMatrix = await readFile(join(target, "sota/literature-matrix.csv"), "utf8");
  assert.match(literatureMatrix, /role/);
  assert.match(literatureMatrix, /full_text_status/);
  assert.match(literatureMatrix, /reading_status/);
  assert.match(literatureMatrix, /synthesis_path/);
  assert.match(literatureMatrix, /bib_key/);
  const artifactChecklist = await readFile(join(target, "artifacts/artifact-checklist.md"), "utf8");
  assert.match(artifactChecklist, /ACM Artifact Review And Badging/);
  assert.match(artifactChecklist, /Artifacts Available/);
  assert.match(artifactChecklist, /Functional/);
  assert.match(artifactChecklist, /Reusable/);
  assert.match(artifactChecklist, /Results Reproduced/);
  const projectQuality = await readFile(join(target, "docs/agent/project-quality.md"), "utf8");
  assert.match(projectQuality, /Project Quality Contract/);
  assert.match(projectQuality, /Request Intake/);
  assert.match(projectQuality, /Trusted Outputs/);
  assert.match(projectQuality, /Project Hygiene Gate/);
  assert.match(projectQuality, /Badge Readiness/);
  const outputContracts = await readFile(join(target, "docs/agent/output-contracts.md"), "utf8");
  assert.match(outputContracts, /Trust Levels/);
  assert.match(outputContracts, /Promotion Rules/);
  assert.match(outputContracts, /reports\/paper\/sota-survey\.tex/);
  assert.match(outputContracts, /artifacts\/badge-evidence-ledger\.csv/);
  assert.match(outputContracts, /Project Quality Contract/);
  const badgeEvidence = await readFile(join(target, "artifacts/badge-evidence-ledger.csv"), "utf8");
  assert.match(badgeEvidence, /badge_target/);
  assert.match(badgeEvidence, /evidence_path/);
  assert.match(badgeEvidence, /claim_or_result_id/);
  const campaignTemplate = await readFile(
    join(target, "experiments/campaigns/autonomous-campaign-template.md"),
    "utf8"
  );
  assert.match(campaignTemplate, /Mutability Envelope/);
  assert.match(campaignTemplate, /Frozen Harness/);
  assert.match(campaignTemplate, /Baseline Run/);
  assert.match(campaignTemplate, /Frontier Tracking/);
  assert.match(campaignTemplate, /keep, discard, crash/);
  const frontierResults = await readFile(
    join(target, "experiments/campaigns/frontier-results.tsv"),
    "utf8"
  );
  assert.match(frontierResults, /^run_id\tgit_commit\tmetric_value\tresource_value\tstatus\tdescription/m);
  await assert.rejects(stat(join(target, ".agents")));
  await assert.rejects(stat(join(target, "skills-lock.json")));
});

test("generated package doctor script resolves the lifecycle binary before dependencies are installed", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-script-doctor-"));
  const fakePackage = join(root, "fake-create-academic-research");
  const fakeBin = join(fakePackage, "academic-research.js");
  await mkdir(fakePackage, { recursive: true });
  await writeFile(
    join(fakePackage, "package.json"),
    `${JSON.stringify(
      {
        name: "create-academic-research",
        version: "9.9.9-test",
        type: "module",
        bin: {
          "academic-research": "academic-research.js"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    fakeBin,
    [
      "#!/usr/bin/env node",
      "const args = process.argv.slice(2).join(' ');",
      "if (args !== 'doctor') {",
      "  console.error(`unexpected args: ${args}`);",
      "  process.exit(2);",
      "}",
      "console.log('fake academic-research doctor');",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(fakeBin, 0o755);

  const previous = process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC;
  process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC = `file:${fakePackage}`;
  const target = join(root, "script-project");
  try {
    await createProject({
      target,
      title: "Script Project",
      preset: "minimal",
      installSkills: false
    });
  } finally {
    if (previous === undefined) {
      delete process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC;
    } else {
      process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC = previous;
    }
  }

  const result = spawnSync("npm", ["run", "doctor", "--silent"], {
    cwd: target,
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: join(root, ".npm-cache") }
  });

  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /^fake academic-research doctor$/m);
});

test("generated package scripts all resolve the lifecycle binary through the generator package", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-script-contract-"));
  const target = join(root, "script-contract-project");

  await createProject({
    target,
    title: "Script Contract Project",
    preset: "minimal",
    installSkills: false
  });

  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  const templatePackageJson = JSON.parse(await readFile(join(packageRoot, "template/package.json"), "utf8"));
  assert.deepEqual(Object.keys(packageJson.scripts).sort(), Object.keys(templatePackageJson.scripts).sort());

  for (const [scriptName, generatedCommand] of Object.entries(packageJson.scripts)) {
    if (scriptName === "update") {
      assert.equal(
        generatedCommand,
        "npm exec --yes --package=create-academic-research@latest -- academic-research update"
      );
      continue;
    }
    assert.match(
      generatedCommand,
      new RegExp(
        `^npm exec --yes --package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research `
      )
    );
    assert.doesNotMatch(generatedCommand, /^academic-research /);
    assert.equal(
      generatedCommand.replace(`create-academic-research@${packageVersion}`, "create-academic-research@latest"),
      templatePackageJson.scripts[scriptName]
    );
  }
});

test("built package bin files are executable for local file package installs", async () => {
  for (const binPath of [
    "dist/bin/academic-research.js",
    "dist/bin/create-academic-research.js"
  ]) {
    const info = await stat(join(packageRoot, binPath));
    assert.notEqual(info.mode & 0o111, 0, `${binPath} should be executable`);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function rewriteManifestEntry(root, relativePath, content) {
  const manifestPath = join(root, ".academic-research/managed-files.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files[relativePath].generated_checksum = `sha256:${sha256(content)}`;
  manifest.files[relativePath].baseline_checksum = `sha256:${sha256(content)}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

test("createProject writes agent-specific MCP snippets when requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-explicit-agent-"));
  const target = join(root, "explicit-agent-project");
  await createProject({
    target,
    title: "Explicit Agent Project",
    preset: "default",
    agent: "cursor",
    installSkills: false
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(capabilities.agent, "cursor");
  await stat(join(target, "docs/agent/generated/cursor-mcp.json"));
});

test("createProject normalizes common agent aliases before writing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-agent-alias-"));
  const target = join(root, "agent-alias-project");
  await createProject({
    target,
    title: "Agent Alias Project",
    preset: "default",
    agent: "claude",
    installSkills: false
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(capabilities.agent, "claude-code");
  await stat(join(target, "docs/agent/generated/claude-code-mcp.json"));
});

test("createProject rejects unknown agent targets before creating files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-agent-invalid-"));
  const target = join(root, "agent-invalid-project");

  await assert.rejects(
    createProject({
      target,
      title: "Agent Invalid Project",
      preset: "minimal",
      agent: "not-real-agent",
      installSkills: false
    }),
    /unknown agent target: not-real-agent/
  );
  await assert.rejects(stat(join(target, "README.md")));
});

test("renameProject updates metadata and the Python package directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-rename-"));
  const target = join(root, "old-project");
  await createProject({
    target,
    title: "Old Project",
    slug: "old-project",
    packageName: "old_project",
    preset: "minimal",
    installSkills: false
  });

  await renameProject(target, {
    title: "New Project",
    slug: "new-project",
    packageName: "new_project"
  });

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.equal(config.project.slug, "new-project");
  assert.equal(config.project.title, "New Project");
  assert.equal(config.project.package, "new_project");
  assert.equal(packageJson.name, "new-project");
  await stat(join(target, "src/new_project/__init__.py"));
  await assert.rejects(stat(join(target, "src/old_project")));
});

test("renameProject only changes fields explicitly requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-rename-partial-"));
  const target = join(root, "partial-project");
  await createProject({
    target,
    title: "Original Title",
    slug: "stable-slug",
    packageName: "old_package",
    preset: "minimal",
    installSkills: false
  });

  await renameProject(target, {
    packageName: "new_package"
  });

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.equal(config.project.title, "Original Title");
  assert.equal(config.project.slug, "stable-slug");
  assert.equal(config.project.package, "new_package");
  assert.equal(packageJson.name, "stable-slug");
  await stat(join(target, "src/new_package/__init__.py"));
  await assert.rejects(stat(join(target, "src/old_package")));
});

test("createProject avoids Python keyword package names", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-keyword-package-"));
  const target = join(root, "keyword-package");
  await createProject({
    target,
    title: "Keyword Package",
    packageName: "class",
    preset: "minimal",
    installSkills: false
  });

  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  assert.equal(config.project.package, "class_project");
  await stat(join(target, "src/class_project/__init__.py"));
});

test("renameProject preserves custom generator package spec", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-rename-spec-"));
  const target = join(root, "custom-spec-project");
  const previous = process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC;
  process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC = "file:/tmp/create-academic-research.tgz";
  try {
    await createProject({
      target,
      title: "Custom Spec Project",
      slug: "custom-spec-project",
      packageName: "custom_spec_project",
      preset: "minimal",
      installSkills: false
    });
  } finally {
    if (previous === undefined) {
      delete process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC;
    } else {
      process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC = previous;
    }
  }

  await renameProject(target, {
    title: "Custom Spec Renamed",
    slug: "custom-spec-renamed",
    packageName: "custom_spec_renamed"
  });

  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.equal(
    packageJson.devDependencies["create-academic-research"],
    "file:/tmp/create-academic-research.tgz"
  );
});

test("doctorProject accepts generated projects", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-"));
  const target = join(root, "doctor-project");
  await createProject({
    target,
    title: "Doctor Project",
    preset: "minimal",
    installSkills: false
  });

  const result = await doctorProject(target);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("doctorProject reports broken configs and research ledger headers", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-broken-"));
  const target = join(root, "doctor-broken-project");
  await createProject({
    target,
    title: "Doctor Broken Project",
    preset: "minimal",
    installSkills: false
  });

  await writeFile(join(target, "configs/default.yaml"), "project: [\n", "utf8");
  await writeFile(join(target, "configs/capabilities.yaml"), "agent: [\n", "utf8");
  await writeFile(join(target, "sources/source-ledger.csv"), "source_id,title\n", "utf8");
  await writeFile(join(target, "experiments/campaigns/frontier-results.tsv"), "run_id\tstatus\n", "utf8");
  await rm(join(target, "wiki/templates/source-page.md"));
  await rm(join(target, ".env.example"));

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("invalid configs/default.yaml")));
  assert.ok(result.errors.some((error) => error.includes("invalid configs/capabilities.yaml")));
  assert.ok(result.errors.some((error) => error.includes("sources/source-ledger.csv missing column type")));
  assert.ok(result.errors.some((error) => error.includes("experiments/campaigns/frontier-results.tsv missing column git_commit")));
  assert.ok(result.errors.some((error) => error.includes("missing wiki/templates/source-page.md")));
  assert.ok(result.errors.some((error) => error.includes("missing .env.example")));
});

test("doctorProject reports stale lifecycle commands and managed-file drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-stale-"));
  const target = join(root, "doctor-stale-project");
  await createProject({
    target,
    title: "Doctor Stale Project",
    preset: "minimal",
    installSkills: false
  });

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.doctor = "academic-research doctor";
  packageJson.scripts["mcp:env"] = "npx academic-research mcp env";
  packageJson.devDependencies["create-academic-research"] = "0.1.12";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  await writeFile(join(target, ".env.example"), "STALE=1\n", "utf8");
  await writeFile(join(target, "README.md"), "# Doctor Stale Project\n\nRun `npx academic-research doctor`.\n", "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("package.json script doctor uses stale")));
  assert.ok(result.errors.some((error) => error.includes("package.json script mcp:env uses stale")));
  assert.ok(result.warnings.some((warning) => warning.includes("create-academic-research 0.1.12 is older")));
  assert.ok(result.warnings.some((warning) => warning.includes("npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply")));
  assert.ok(result.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(result.warnings.some((warning) => warning.includes("stale command reference in README.md")));
});

test("doctorProject uses the managed manifest for drift warnings", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-manifest-"));
  const target = join(root, "doctor-manifest-project");
  await createProject({
    target,
    title: "Doctor Manifest Project",
    preset: "minimal",
    installSkills: false
  });

  await writeFile(join(target, ".env.example"), "LOCAL_EDIT=1\n", "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(result.warnings.some((warning) => warning.includes("npm run update")));
});

test("updateProject previews and applies only managed project files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-"));
  const target = join(root, "update-project");
  await createProject({
    target,
    title: "Update Project",
    preset: "minimal",
    installSkills: false
  });

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.doctor = "academic-research doctor";
  packageJson.scripts.update = "npm exec --yes --package=create-academic-research@0.1.12 -- academic-research update";
  packageJson.devDependencies["create-academic-research"] = "0.1.12";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const dryRun = await updateProject(target, { apply: false });

  assert.equal(dryRun.applied, false);
  assert.deepEqual(
    dryRun.changes.map((change) => change.path).sort(),
    ["package.json"].sort()
  );
  assert.equal(JSON.parse(await readFile(packagePath, "utf8")).scripts.doctor, "academic-research doctor");

  const applied = await updateProject(target, { apply: true });
  const updatedPackage = JSON.parse(await readFile(packagePath, "utf8"));
  const result = await doctorProject(target);

  assert.equal(applied.applied, true);
  assert.equal(updatedPackage.devDependencies["create-academic-research"], packageVersion);
  assert.equal(
    updatedPackage.scripts.update,
    "npm exec --yes --package=create-academic-research@latest -- academic-research update"
  );
  assert.match(
    updatedPackage.scripts.doctor,
    new RegExp(`^npm exec --yes --package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research doctor$`)
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("updateProject apply is idempotent for a clean generated project", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-idempotent-"));
  const target = join(root, "update-idempotent-project");
  await createProject({
    target,
    title: "Update Idempotent Project",
    preset: "minimal",
    installSkills: false
  });

  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const result = await updateProject(target, { apply: true });
  const after = await readFile(manifestPath, "utf8");

  assert.equal(result.applied, true);
  assert.deepEqual(result.changes, []);
  assert.equal(after, before);
});

test("updateProject applies unchanged managed files and skips locally edited managed files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-manifest-"));
  const target = join(root, "update-manifest-project");
  await createProject({
    target,
    title: "Update Manifest Project",
    preset: "minimal",
    installSkills: false
  });

  const envPath = join(target, ".env.example");
  const oldEnv = "OLD_GENERATED=1\n";
  await writeFile(envPath, oldEnv, "utf8");
  await rewriteManifestEntry(target, ".env.example", oldEnv);

  const setupPath = join(target, "docs/agent/mcp-setup.md");
  const locallyEdited = "local user edit\n";
  await writeFile(setupPath, locallyEdited, "utf8");

  const result = await updateProject(target, { apply: true });
  const envExample = await readFile(envPath, "utf8");
  const setup = await readFile(setupPath, "utf8");

  assert.ok(result.changes.some((change) => change.path === ".env.example" && change.action === "update"));
  assert.ok(
    result.changes.some(
      (change) => change.path === ".academic-research/managed-files.json" && change.action === "update"
    )
  );
  assert.ok(
    result.changes.some(
      (change) =>
        change.path === "docs/agent/mcp-setup.md" &&
        change.action === "skip" &&
        /local edits/.test(change.reason ?? "")
    )
  );
  assert.match(envExample, /^OPENALEX_API_KEY=/m);
  assert.equal(setup, locallyEdited);
});

test("updateProject migrates 0.1.17 projects to the 0.1.18 research contract", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-017-to-018-"));
  const target = join(root, "update-017-to-018-project");
  await createProject({
    target,
    title: "Update 017 To 018 Project",
    preset: "minimal",
    installSkills: false
  });

  const addedIn018 = [
    "analysis_outputs/claim-audit.md",
    "artifacts/badge-evidence-ledger.csv",
    "docs/agent/project-quality.md",
    "docs/agent/repo-migration-playbook.md",
    "docs/reproducibility/commands.md",
    "experiments/campaigns/autonomous-campaign-template.md",
    "experiments/campaigns/frontier-results.tsv",
    "reports/paper/sota-survey.tex",
    "repro_outputs/COMMANDS.md",
    "repro_outputs/LOG.md",
    "repro_outputs/PATCHES.md",
    "repro_outputs/SUMMARY.md",
    "repro_outputs/status.json",
    "sota/citation-chasing-log.csv",
    "sota/paper-syntheses/.gitkeep",
    "sota/reading-log.csv",
    "sources/markdown-linear/.gitkeep"
  ];

  for (const relative of addedIn018) {
    await rm(join(target, relative), { force: true });
  }

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.devDependencies["create-academic-research"] = "0.1.17";
  for (const [name, command] of Object.entries(packageJson.scripts)) {
    if (name !== "update") {
      packageJson.scripts[name] = command.replace(packageVersion, "0.1.17");
    }
  }
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const manifestPath = join(target, ".academic-research/managed-files.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.generator.version = "0.1.17";
  for (const relative of addedIn018) {
    delete manifest.files[relative];
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const applied = await updateProject(target, { apply: true });
  const updatedPackage = JSON.parse(await readFile(packagePath, "utf8"));
  const updatedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const doctor = await doctorProject(target);
  const rootReadme = await readFile(join(packageRoot, "README.md"), "utf8");
  const templateReadme = await readFile(join(packageRoot, "template/README.md"), "utf8");

  for (const relative of addedIn018) {
    await stat(join(target, relative));
    assert.ok(applied.changes.some((change) => change.path === relative && change.action === "create"));
    assert.ok(updatedManifest.files[relative], `${relative} should be tracked after migration`);
  }

  assert.equal(updatedPackage.devDependencies["create-academic-research"], packageVersion);
  assert.equal(updatedManifest.generator.version, packageVersion);
  assert.equal(updatedManifest.files["analysis_outputs/claim-audit.md"].policy, "user-owned");
  assert.equal(updatedManifest.files["repro_outputs/SUMMARY.md"].policy, "user-owned");
  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.errors, []);
  assert.match(rootReadme, /0\.1\.17 -> 0\.1\.18/);
  assert.match(templateReadme, /0\.1\.17 -> 0\.1\.18/);
});

test("updateProject migrates legacy projects without a managed manifest conservatively", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-manifest-"));
  const target = join(root, "legacy-manifest-project");
  await createProject({
    target,
    title: "Legacy Manifest Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await rm(join(target, "docs/getting-started.md"), { force: true });

  const dryRun = await updateProject(target, { apply: false });
  await assert.rejects(stat(join(target, ".academic-research/managed-files.json")));

  const applied = await updateProject(target, { apply: true });
  const manifest = JSON.parse(await readFile(join(target, ".academic-research/managed-files.json"), "utf8"));
  const envExample = await readFile(join(target, ".env.example"), "utf8");

  assert.ok(dryRun.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.ok(applied.changes.some((change) => change.path === "docs/getting-started.md" && change.action === "create"));
  assert.ok(applied.changes.some((change) => change.path === ".env.example" && change.action === "skip"));
  assert.equal(envExample, "LEGACY_LOCAL=1\n");
  assert.equal(manifest.files["docs/getting-started.md"].policy, "managed");
  assert.doesNotMatch(JSON.stringify(manifest), /LEGACY_LOCAL|secret|token|api[_-]?key/i);
});

test("updateProject is idempotent after legacy migration with skipped files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-idempotent-"));
  const target = join(root, "legacy-idempotent-project");
  await createProject({
    target,
    title: "Legacy Idempotent Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await writeFile(join(target, "docs/agent/mcp-setup.md"), "LEGACY_SETUP=1\n", "utf8");

  const first = await updateProject(target, { apply: true });
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const beforeManifest = JSON.parse(before);
  const second = await updateProject(target, { apply: true });
  const after = await readFile(manifestPath, "utf8");
  const doctor = await doctorProject(target);

  assert.ok(first.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.equal(beforeManifest.files[".env.example"].reason, "unknown legacy content");
  assert.equal(beforeManifest.files["docs/agent/mcp-setup.md"].reason, "unknown legacy content");
  assert.deepEqual(second.changes, []);
  assert.equal(after, before);
  assert.ok(!doctor.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(!doctor.warnings.some((warning) => warning.includes("docs/agent/mcp-setup.md has local edits")));
});

test("updateProject reclassifies only changed skipped legacy files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-edited-"));
  const target = join(root, "legacy-edited-project");
  await createProject({
    target,
    title: "Legacy Edited Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await writeFile(join(target, "docs/agent/mcp-setup.md"), "LEGACY_SETUP=1\n", "utf8");

  await updateProject(target, { apply: true });
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const beforeManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const unchangedSetupRecord = beforeManifest.files["docs/agent/mcp-setup.md"];

  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=2\n", "utf8");

  const result = await updateProject(target, { apply: true });
  const afterManifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.ok(
    result.changes.some(
      (change) =>
        change.path === ".env.example" &&
        change.action === "skip" &&
        change.reason === "local edits detected"
    )
  );
  assert.ok(result.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.ok(!result.changes.some((change) => change.path === "docs/agent/mcp-setup.md"));
  assert.equal(afterManifest.files[".env.example"].reason, "local edits detected");
  assert.deepEqual(afterManifest.files["docs/agent/mcp-setup.md"], unchangedSetupRecord);
});

test("initProject bootstraps an existing repository without overwriting local files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-init-"));
  const target = join(root, "existing-repo");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "README.md"), "# Existing README\n", "utf8");
  await writeFile(join(target, ".gitignore"), "custom-ignore\n", "utf8");
  await writeFile(
    join(target, "package.json"),
    `${JSON.stringify({ name: "existing-repo", scripts: { test: "node --test" } }, null, 2)}\n`,
    "utf8"
  );

  const result = await initProject({
    target,
    title: "Existing Study",
    slug: "existing-study",
    packageName: "existing_study",
    preset: "minimal",
    installSkills: false
  });
  const readme = await readFile(join(target, "README.md"), "utf8");
  const gitignore = await readFile(join(target, ".gitignore"), "utf8");
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const doctor = await doctorProject(target);

  assert.equal(result.slug, "existing-study");
  assert.equal(readme, "# Existing README\n");
  assert.equal(gitignore, "custom-ignore\n");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.scripts.doctor, /academic-research doctor$/);
  assert.equal(config.project.slug, "existing-study");
  assert.equal(config.project.package, "existing_study");
  await stat(join(target, "src/existing_study/__init__.py"));
  await assert.rejects(stat(join(target, "_gitignore")));
  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.errors, []);
});

test("createProject creates missing parent directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-nested-"));
  const target = join(root, "missing", "parent", "nested-project");

  await createProject({
    target,
    title: "Nested Project",
    preset: "minimal",
    installSkills: false
  });

  await stat(join(target, "configs/default.yaml"));
});
