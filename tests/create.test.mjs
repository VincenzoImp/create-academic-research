import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import { createProject, doctorProject, renameProject } from "../dist/src/project.js";

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
  assert.match(pyproject, /name = "paper-project"/);
  assert.match(readme, /^# Paper Project/);
  await stat(join(target, "src/paper_project/__init__.py"));
  await stat(join(target, "docs/agent/generated/mcp.json"));
  await stat(join(target, ".gitignore"));
  await assert.rejects(stat(join(target, "_gitignore")));
  await stat(join(target, ".env.example"));
  await stat(join(target, "docs/getting-started.md"));
  await stat(join(target, "docs/agent/mcp-client-setup.md"));
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  await rm(join(target, "wiki/templates/source-page.md"));
  await rm(join(target, ".env.example"));

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("invalid configs/default.yaml")));
  assert.ok(result.errors.some((error) => error.includes("invalid configs/capabilities.yaml")));
  assert.ok(result.errors.some((error) => error.includes("sources/source-ledger.csv missing column type")));
  assert.ok(result.errors.some((error) => error.includes("missing wiki/templates/source-page.md")));
  assert.ok(result.errors.some((error) => error.includes("missing .env.example")));
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
