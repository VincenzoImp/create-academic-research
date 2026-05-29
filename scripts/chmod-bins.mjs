import { chmod, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bins = [
  "dist/bin/academic-research.js",
  "dist/bin/create-academic-research.js"
];

for (const relative of bins) {
  const path = join(root, relative);
  const current = await stat(path);
  await chmod(path, current.mode | 0o755);
}
