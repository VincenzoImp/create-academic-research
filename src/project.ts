import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import { DEFAULT_AGENT, initializeCapabilities, installSkills } from "./capabilities.js";
import { copyDirectory, exists, isNonEmptyDirectory, movePath, readJson, writeJson } from "./files.js";
import { packageify, slugify, titleFromSlug } from "./names.js";
import { AGENT_STACK } from "./stack.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = join(packageRoot, "template");

export interface CreateProjectOptions {
  target: string;
  title?: string;
  slug?: string;
  packageName?: string;
  profile?: string;
  preset?: string;
  agent?: string;
  installSkills?: boolean;
}

export interface RenameProjectOptions {
  title?: string;
  slug?: string;
  packageName?: string;
}

export interface ProjectResult {
  root: string;
  title: string;
  slug: string;
  packageName: string;
}

export interface DoctorResult {
  ok: boolean;
  errors: string[];
}

interface ProjectConfig {
  project: {
    slug: string;
    title: string;
    profile: string;
    package: string;
  };
  [key: string]: unknown;
}

interface GeneratedPackageJson {
  name?: string;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface PersonalizeOptions {
  title: string;
  slug: string;
  packageName: string;
  profile: string;
  previousPackage?: string;
}

const REQUIRED_CSV_COLUMNS: Record<string, string[]> = {
  "sources/source-ledger.csv": [
    "source_id",
    "type",
    "title",
    "authors",
    "year",
    "venue",
    "identifiers",
    "raw_path",
    "derived_path",
    "bib_path",
    "status",
    "relevance",
    "evidence_level",
    "quality_notes",
    "added_on",
    "last_checked"
  ],
  "sources/conversion-ledger.csv": [
    "source_id",
    "input_path",
    "output_path",
    "tool",
    "command_or_config",
    "conversion_date",
    "quality",
    "checked_pages",
    "known_issues"
  ],
  "sources/bib/citation-audit.csv": [
    "citation_key",
    "status",
    "issue",
    "source_id",
    "claim_or_location",
    "expected_fix",
    "checked_on"
  ],
  "sota/literature-matrix.csv": [
    "source_id",
    "title",
    "authors",
    "year",
    "venue",
    "method",
    "dataset_or_sample",
    "task_or_problem",
    "key_claim",
    "metric_or_result",
    "limitations",
    "relevance",
    "citation_count_or_signal",
    "identifiers"
  ],
  "sota/screening-decisions.csv": ["stage", "source_id", "title", "decision", "reason", "screened_by", "date"],
  "experiments/registry.csv": [
    "run_id",
    "date",
    "git_commit",
    "question",
    "hypothesis",
    "command",
    "config",
    "seed",
    "dataset",
    "metric",
    "result",
    "runtime",
    "status",
    "record_path"
  ]
};

export async function createProject(options: CreateProjectOptions): Promise<ProjectResult> {
  const target = resolve(options.target);
  if (await isNonEmptyDirectory(target)) {
    throw new Error(`target directory is not empty: ${target}`);
  }
  const title = options.title ?? titleFromSlug(options.slug ?? basename(target));
  const slug = slugify(options.slug ?? title);
  const packageName = packageify(options.packageName ?? slug);
  const preset = options.preset ?? "default";
  const agent = options.agent ?? DEFAULT_AGENT;
  if (!AGENT_STACK.presets[preset]) {
    throw new Error(
      `unknown capability preset: ${preset}. Expected one of: ${Object.keys(AGENT_STACK.presets).join(", ")}`
    );
  }

  await mkdir(dirname(target), { recursive: true });
  await copyDirectory(templateRoot, target);
  await personalizeProject(target, { title, slug, packageName, profile: options.profile ?? "academic-general" });
  await writeGeneratedPackageJson(target, { slug });
  await writeAgentStack(target);
  await initializeCapabilities(target, { preset, agent });

  if (options.installSkills) {
    await installSkills(target, preset);
  }
  return { root: target, title, slug, packageName };
}

export async function renameProject(root: string, options: RenameProjectOptions): Promise<ProjectResult> {
  const target = resolve(root);
  const configPath = join(target, "configs/default.yaml");
  const config = YAML.parse(await readFile(configPath, "utf8")) as ProjectConfig;
  const previousPackage = config.project.package;
  const title = options.title ?? config.project.title;
  const slug = options.slug === undefined ? config.project.slug : slugify(options.slug);
  const packageName =
    options.packageName === undefined ? config.project.package : packageify(options.packageName);
  await personalizeProject(target, {
    title,
    slug,
    packageName,
    profile: config.project.profile,
    previousPackage
  });
  await writeGeneratedPackageJson(target, { slug });
  return { root: target, title, slug, packageName };
}

export async function doctorProject(root: string): Promise<DoctorResult> {
  const target = resolve(root);
  const errors: string[] = [];
  const required = [
    "README.md",
    "package.json",
    "pyproject.toml",
    "AGENTS.md",
    "configs/default.yaml",
    "configs/agent-stack.yaml",
    "configs/capabilities.yaml",
    "docs/agent/capability-profile.md",
    "docs/agent/generated",
    "sources/source-ledger.csv",
    "sota/literature-matrix.csv",
    "wiki/index.md",
    "wiki/log.md"
  ];
  for (const relative of required) {
    if (!(await exists(join(target, relative)))) errors.push(`missing ${relative}`);
  }
  if (await exists(join(target, "configs/default.yaml"))) {
    try {
      const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8")) as ProjectConfig;
      if (!config?.project?.package) {
        errors.push("configs/default.yaml missing project.package");
      } else if (!(await exists(join(target, "src", config.project.package, "__init__.py")))) {
        errors.push(`missing src/${config.project.package}/__init__.py`);
      }
    } catch (error) {
      errors.push(`invalid configs/default.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (await exists(join(target, "configs/capabilities.yaml"))) {
    try {
      YAML.parse(await readFile(join(target, "configs/capabilities.yaml"), "utf8"));
    } catch (error) {
      errors.push(`invalid configs/capabilities.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const [relative, requiredColumns] of Object.entries(REQUIRED_CSV_COLUMNS)) {
    await validateCsvHeader(target, relative, requiredColumns, errors);
  }
  return { ok: errors.length === 0, errors };
}

async function personalizeProject(
  root: string,
  { title, slug, packageName, profile, previousPackage = "project_package" }: PersonalizeOptions
): Promise<void> {
  const configPath = join(root, "configs/default.yaml");
  const config = YAML.parse(await readFile(configPath, "utf8")) as ProjectConfig;
  config.project = {
    ...config.project,
    slug,
    title,
    profile,
    package: packageName
  };
  await writeFile(configPath, YAML.stringify(config), "utf8");

  const pyprojectPath = join(root, "pyproject.toml");
  const pyproject = await readFile(pyprojectPath, "utf8");
  await writeFile(pyprojectPath, pyproject.replace(/^name = ".*"$/m, `name = "${slug}"`), "utf8");

  const readmePath = join(root, "README.md");
  const readme = await readFile(readmePath, "utf8");
  await writeFile(readmePath, readme.replace(/^# .*/m, `# ${title}`), "utf8");

  const previous = join(root, "src", previousPackage);
  const next = join(root, "src", packageName);
  if (previous !== next && (await exists(previous))) {
    await movePath(previous, next);
  } else {
    await mkdir(dirname(join(next, "__init__.py")), { recursive: true });
    if (!(await exists(join(next, "__init__.py")))) {
      await writeFile(join(next, "__init__.py"), "\"\"\"Project package.\"\"\"\n", "utf8");
    }
  }
}

async function writeGeneratedPackageJson(root: string, { slug }: { slug: string }): Promise<void> {
  const path = join(root, "package.json");
  const data = await readJson<GeneratedPackageJson>(path);
  const existingSpec = data.devDependencies?.["create-academic-research"];
  const packageSpec = process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC ?? existingSpec ?? "0.1.4";
  data.name = slug;
  data.devDependencies = {
    ...(data.devDependencies ?? {}),
    "create-academic-research": packageSpec
  };
  await writeJson(path, data);
}

async function writeAgentStack(root: string): Promise<void> {
  await writeFile(join(root, "configs/agent-stack.yaml"), YAML.stringify(AGENT_STACK), "utf8");
}

async function validateCsvHeader(
  root: string,
  relative: string,
  requiredColumns: string[],
  errors: string[]
): Promise<void> {
  const path = join(root, relative);
  if (!(await exists(path))) return;
  const header = (await readFile(path, "utf8")).split(/\r?\n/, 1)[0] ?? "";
  const columns = new Set(header.split(",").map((column) => column.trim()).filter(Boolean));
  for (const column of requiredColumns) {
    if (!columns.has(column)) errors.push(`${relative} missing column ${column}`);
  }
}
