import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { copyDirectory } from "../dist/src/files.js";

test("copyDirectory works when the package itself is under node_modules", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-copy-"));
  const source = join(root, "node_modules", "create-academic-research", "template");
  const target = join(root, "project");
  await mkdir(join(source, "configs"), { recursive: true });
  await mkdir(join(source, "node_modules", "ignored"), { recursive: true });
  await writeFile(join(source, "configs", "default.yaml"), "project: {}\n", "utf8");
  await writeFile(join(source, "node_modules", "ignored", "file.txt"), "ignored\n", "utf8");

  await copyDirectory(source, target);

  assert.equal(await readFile(join(target, "configs", "default.yaml"), "utf8"), "project: {}\n");
  await assert.rejects(readFile(join(target, "node_modules", "ignored", "file.txt"), "utf8"));
});
