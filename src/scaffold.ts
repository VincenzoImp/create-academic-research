import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  utimesSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMcpJson } from "./mcp.js";

export interface CreateOptions {
  target: string;
  title: string;
  topic: string;
  optionalMcps: string[];
  installSkills: boolean;
  git: boolean;
}

const TEMPLATE_DIR = fileURLToPath(new URL("../../template", import.meta.url));
const BINARY_EXTENSIONS = new Set([".pdf"]);

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "research-project";
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function tomlEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function latexEscape(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export function createProject(options: CreateOptions): void {
  const target = resolve(options.target);
  if (existsSync(target) && readdirSync(target).length > 0) {
    throw new Error(`target directory is not empty: ${target}`);
  }

  cpSync(TEMPLATE_DIR, target, { recursive: true });

  const slug = slugify(basename(target));
  for (const file of walk(target)) {
    if (BINARY_EXTENSIONS.has(extname(file))) continue;
    const text = readFileSync(file, "utf8");
    if (!text.includes("__PROJECT_")) continue;
    const esc =
      extname(file) === ".toml" ? tomlEscape : extname(file) === ".tex" ? latexEscape : (v: string) => v;
    writeFileSync(
      file,
      text
        .replaceAll("__PROJECT_TITLE__", esc(options.title))
        .replaceAll("__PROJECT_TOPIC__", esc(options.topic))
        .replaceAll("__PROJECT_SLUG__", slug)
    );
  }

  renameSync(join(target, "gitignore"), join(target, ".gitignore"));
  writeFileSync(join(target, ".mcp.json"), renderMcpJson(options.optionalMcps));

  // cpSync does not preserve template mtimes and the substitution pass
  // rewrites survey.tex afterwards; stamp the committed placeholder PDF
  // strictly newer than its .tex (sub-millisecond mtime precision would
  // otherwise leave it "stale") so a fresh project reports zero warnings.
  const texMtimeMs = statSync(join(target, "survey", "survey.tex")).mtimeMs;
  const stamp = new Date(texMtimeMs + 1000);
  utimesSync(join(target, "survey", "survey.pdf"), stamp, stamp);

  if (options.installSkills) {
    const result = spawnSync(
      "npx",
      ["-y", "skills", "add", "VincenzoImp/academic-research-skills", "--skill", "*", "--copy", "-y"],
      { cwd: target, stdio: "inherit" }
    );
    if (result.status !== 0) {
      console.warn("warning: skills install failed; run it later from the project root:");
      console.warn("  npx -y skills add VincenzoImp/academic-research-skills --skill '*' --copy -y");
    }
  }

  if (options.git) {
    const commands: string[][] = [
      ["init"],
      ["add", "-A"],
      ["commit", "-m", "chore: scaffold research project (create-academic-research v0.2.0)"]
    ];
    for (const args of commands) {
      const result = spawnSync("git", args, { cwd: target, stdio: "ignore" });
      if (result.status !== 0) {
        console.warn(`warning: git ${args[0]} failed; finish git setup manually`);
        break;
      }
    }
  }
}
