import { cp, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function isNonEmptyDirectory(path: string): Promise<boolean> {
  if (!(await exists(path))) return false;
  const entries = await readdir(path);
  return entries.length > 0;
}

export async function copyDirectory(source: string, target: string): Promise<void> {
  await cp(source, target, {
    recursive: true,
    filter: (path) => {
      const relative = path.startsWith(source) ? path.slice(source.length) : path;
      const parts = relative.split(/[\\/]/).filter(Boolean);
      return !parts.includes("node_modules") && !parts.includes("__pycache__");
    }
  });
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  return JSON.parse(await readText(path)) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function movePath(source: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  await rename(source, target);
}
