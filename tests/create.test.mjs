import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import { createProject, doctorProject, renameProject } from "../dist/src/project.js";

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
  assert.deepEqual(capabilities.mcp_servers, ["arxiv", "semantic-scholar", "openalex"]);
  assert.equal(packageJson.name, "paper-project");
  assert.equal(packageJson.devDependencies["create-academic-research"], "0.1.4");
  assert.match(pyproject, /name = "paper-project"/);
  assert.match(readme, /^# Paper Project/);
  await stat(join(target, "src/paper_project/__init__.py"));
  await stat(join(target, "docs/agent/generated/mcp.json"));
  await stat(join(target, "notebooks/README.md"));
  await assert.rejects(stat(join(target, ".agents")));
  await assert.rejects(stat(join(target, "skills-lock.json")));
});

test("createProject writes agent-specific MCP snippets when requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-explicit-agent-"));
  const target = join(root, "explicit-agent-project");
  await createProject({
    target,
    title: "Explicit Agent Project",
    preset: "default",
    agent: "example-agent",
    installSkills: false
  });

  const capabilities = YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
  assert.equal(capabilities.agent, "example-agent");
  await stat(join(target, "docs/agent/generated/example-agent-mcp.json"));
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

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("invalid configs/default.yaml")));
  assert.ok(result.errors.some((error) => error.includes("invalid configs/capabilities.yaml")));
  assert.ok(result.errors.some((error) => error.includes("sources/source-ledger.csv missing column type")));
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
