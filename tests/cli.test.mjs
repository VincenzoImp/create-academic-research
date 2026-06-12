import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const CLI = new URL("../dist/bin/create-academic-research.js", import.meta.url).pathname;

test("--yes creates a project non-interactively and check.py passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "cli-"));
  const target = join(root, "e2e-project");
  const run = spawnSync(
    "node",
    [CLI, target, "--yes", "--no-install-skills", "--no-git"],
    { encoding: "utf8" }
  );
  assert.equal(run.status, 0, run.stdout + run.stderr);

  const check = spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
  assert.equal(check.status, 0, check.stdout + check.stderr);
});

test("--yes without a target fails with a clear message", () => {
  const run = spawnSync("node", [CLI, "--yes"], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /target directory/);
});

test("unknown flags fail fast", () => {
  const run = spawnSync("node", [CLI, "x", "--bogus"], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /unknown flag/);
});
