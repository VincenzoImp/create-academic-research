import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createProject, slugify } from "../dist/src/scaffold.js";

test("slugify normalizes arbitrary names", () => {
  assert.equal(slugify("My MEV Study!"), "my-mev-study");
  assert.equal(slugify("---"), "research-project");
});

test("createProject generates a project that passes check.py", async () => {
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "mev-rollup-study");
  createProject({
    target,
    title: "MEV on Rollups",
    topic: "MEV detection on Ethereum rollups",
    optionalMcps: ["openalex"],
    installSkills: false,
    git: false
  });

  const readme = await readFile(join(target, "README.md"), "utf8");
  assert.ok(readme.includes("MEV on Rollups"));
  assert.ok(!readme.includes("__PROJECT_"));

  const queue = await readFile(join(target, "sota", "queue.md"), "utf8");
  assert.ok(queue.includes("MEV detection on Ethereum rollups"));

  const survey = await readFile(join(target, "survey", "survey.tex"), "utf8");
  assert.ok(survey.includes("MEV on Rollups"));

  const pyproject = await readFile(join(target, "pyproject.toml"), "utf8");
  assert.ok(pyproject.includes('name = "mev-rollup-study"'));

  const mcp = JSON.parse(await readFile(join(target, ".mcp.json"), "utf8"));
  assert.deepEqual(
    Object.keys(mcp.mcpServers).sort(),
    ["arxiv", "dblp", "openalex", "semantic-scholar"]
  );

  await access(join(target, ".gitignore"));
  await access(join(target, "survey", "survey.pdf"));

  const check = spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /check: OK \(0 warnings\)/);
});

test("createProject initializes git when asked", async () => {
  process.env.GIT_AUTHOR_NAME = "Test";
  process.env.GIT_AUTHOR_EMAIL = "test@example.com";
  process.env.GIT_COMMITTER_NAME = "Test";
  process.env.GIT_COMMITTER_EMAIL = "test@example.com";
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "with-git");
  createProject({
    target,
    title: "T",
    topic: "t",
    optionalMcps: [],
    installSkills: false,
    git: true
  });
  const log = spawnSync("git", ["-C", target, "log", "--oneline"], { encoding: "utf8" });
  assert.equal(log.status, 0);
  assert.match(log.stdout, /scaffold research project/);
});

test("special characters in title/topic are escaped per file format", async () => {
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "escape-proj");
  createProject({
    target,
    title: 'MEV "quoted" & 100% $pecial',
    topic: 'Topic with "quotes" and \\backslash',
    optionalMcps: [],
    installSkills: false,
    git: false
  });

  const toml = spawnSync(
    "python3",
    ["-c", `import tomllib,sys; tomllib.load(open(sys.argv[1],'rb'))`, join(target, "pyproject.toml")],
    { encoding: "utf8" }
  );
  assert.equal(toml.status, 0, toml.stderr);

  const survey = await readFile(join(target, "survey", "survey.tex"), "utf8");
  assert.ok(survey.includes("\\&"));
  assert.ok(survey.includes("\\%"));
  assert.ok(!survey.includes('& 100% '));
  assert.ok(survey.includes("\\textbackslash{}"));
  assert.ok(!survey.includes("\\textbackslash\\{\\}"));

  const check = spawnSync("python3", [join(target, "scripts", "check.py")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout + check.stderr);
});

test("createProject refuses a non-empty target", async () => {
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "busy");
  mkdirSync(target);
  writeFileSync(join(target, "existing.txt"), "x");
  assert.throws(
    () =>
      createProject({
        target,
        title: "T",
        topic: "t",
        optionalMcps: [],
        installSkills: false,
        git: false
      }),
    /not empty/
  );
});
