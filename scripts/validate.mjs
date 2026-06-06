import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

async function filesUnder(dir, predicate = () => true) {
  const result = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (![".git", "node_modules", ".agents", "dist"].includes(entry.name)) {
          await walk(full);
        }
      } else if (predicate(full)) {
        result.push(full);
      }
    }
  }
  await walk(dir);
  return result;
}

const paths = await filesUnder(
  root,
  (path) =>
    !/\.d\.ts$/.test(path) &&
    /\.(mjs|ts|md|json|ya?ml|toml|py|csv)$/.test(path) &&
    !path.includes("/tests/") &&
    !path.endsWith("/scripts/validate.mjs")
);
let combined = "";
for (const path of paths) {
  combined += await readFile(path, "utf8");
}

const forbidden = [
  "TBD",
  "TODO",
  "FIXME",
  "academic-research-template",
  "academic-research-starter",
  "src/research_template",
  "research-template",
  "docs/template",
  "/Users/vincenzo",
  "still private",
  "repository is still private",
  "npx academic-research",
  "--global"
];

const errors = [];
for (const value of forbidden) {
  if (combined.includes(value)) {
    errors.push(`forbidden text found: ${value}`);
  }
}

if (/\s-g\s/.test(combined)) {
  errors.push("forbidden global short flag found: -g");
}

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
for (const field of ["repository", "bugs", "homepage", "keywords", "author"]) {
  if (!packageJson[field]) {
    errors.push(`package.json missing publish metadata: ${field}`);
  }
}
if (packageJson.publishConfig?.access !== "public") {
  errors.push("package.json publishConfig.access must be public");
}
if (packageJson.publishConfig?.provenance !== true) {
  errors.push("package.json publishConfig.provenance must be true");
}
if (!Array.isArray(packageJson.files) || !packageJson.files.includes("template")) {
  errors.push("package.json files must include bundled template");
}
let releaseWorkflow = "";
for (const path of [
  "CHANGELOG.md",
  ".github/workflows/validate.yml",
  ".github/workflows/release.yml",
  ".github/release.yml",
  ".github/dependabot.yml",
  "scripts/check-release.mjs"
]) {
  try {
    const text = await readFile(join(root, path), "utf8");
    if (path === ".github/workflows/release.yml") releaseWorkflow = text;
  } catch {
    errors.push(`missing release/automation file: ${path}`);
  }
}

if (releaseWorkflow) {
  for (const required of [
    "github.event.repository.private == false",
    "--generate-notes",
    "npm publish --access public --provenance"
  ]) {
    if (!releaseWorkflow.includes(required)) {
      errors.push(`release workflow missing required guard/action: ${required}`);
    }
  }
  for (const stale of ["npx academic-research", "npx academic-research mcp"]) {
    if (releaseWorkflow.includes(stale)) {
      errors.push(`release workflow contains stale lifecycle command: ${stale}`);
    }
  }
}

const requiredTemplateFiles = [
  "template/_gitignore",
  "template/.gitignore",
  "template/.env.example",
  "template/docs/getting-started.md",
  "template/docs/agent/output-contracts.md",
  "template/docs/agent/project-quality.md",
  "template/docs/agent/repo-migration-playbook.md",
  "template/docs/reproducibility/commands.md",
  "template/analysis_outputs/claim-audit.md",
  "template/experiments/campaigns/autonomous-campaign-template.md",
  "template/experiments/campaigns/frontier-results.tsv",
  "template/repro_outputs/SUMMARY.md",
  "template/repro_outputs/COMMANDS.md",
  "template/repro_outputs/LOG.md",
  "template/repro_outputs/PATCHES.md",
  "template/repro_outputs/status.json",
  "template/scripts/README.md",
  "template/docs/agent/mcp-client-setup.md",
  "template/wiki/templates/source-page.md",
  "template/wiki/templates/claim-page.md",
  "template/wiki/templates/experiment-page.md",
  "template/wiki/templates/decision-record.md",
  "template/wiki/templates/reviewer-concern.md",
  "template/wiki/templates/research-question.md"
];

for (const relative of requiredTemplateFiles) {
  try {
    const content = await readFile(join(root, relative), "utf8");
    if (!content.trim()) errors.push(`${relative} must not be empty`);
  } catch {
    errors.push(`missing required template file: ${relative}`);
  }
}

const templatePackageJson = JSON.parse(await readFile(join(root, "template/package.json"), "utf8"));
if (templatePackageJson.devDependencies?.["create-academic-research"] !== packageJson.version) {
  errors.push("template/package.json create-academic-research devDependency must match package.json version");
}
const requiredTemplateScripts = [
  "doctor",
  "update",
  "setup",
  "workflow:literature",
  "rename",
  "agents:list",
  "skills:install",
  "skills:list",
  "skills:status",
  "skills:presets",
  "skills:remove",
  "skills:uninstall",
  "skills:update",
  "mcp:list",
  "mcp:modes",
  "mcp:status",
  "mcp:enabled",
  "mcp:available",
  "mcp:commands",
  "mcp:env",
  "mcp:dotenv",
  "mcp:enable",
  "mcp:disable",
  "mcp:setup",
  "mcp:client:add",
  "mcp:client:remove",
  "mcp:install",
  "mcp:uninstall",
  "mcp:smoke",
  "mcp:doctor",
  "mcp:probe"
];
for (const scriptName of requiredTemplateScripts) {
  if (!templatePackageJson.scripts?.[scriptName]) {
    errors.push(`template/package.json missing script: ${scriptName}`);
  } else if (
    !templatePackageJson.scripts[scriptName].startsWith(
      "npm exec --yes --package=create-academic-research@latest -- academic-research "
    )
  ) {
    errors.push(`template/package.json script must resolve package explicitly: ${scriptName}`);
  }
}
if (
  templatePackageJson.scripts?.update !==
  "npm exec --yes --package=create-academic-research@latest -- academic-research update"
) {
  errors.push("template/package.json update script must use create-academic-research@latest");
}

const rootReadme = await readFile(join(root, "README.md"), "utf8");
const templateReadme = await readFile(join(root, "template/README.md"), "utf8");
for (const [label, text] of [["README.md", rootReadme], ["template/README.md", templateReadme]]) {
  for (const required of [
    "create-academic-research@latest -- academic-research update --root .",
    ".academic-research/managed-files.json",
    "docs/agent/capability-lock.json"
  ]) {
    if (!text.includes(required)) errors.push(`${label} missing migration/lock guidance: ${required}`);
  }
}

const outputContracts = await readFile(join(root, "template/docs/agent/output-contracts.md"), "utf8");
for (const required of [
  "Trust Levels",
  "Promotion Rules",
  "reports/paper/sota-survey.tex",
  "experiments/campaigns/frontier-results.tsv",
  "artifacts/badge-evidence-ledger.csv",
  "Project Quality Contract"
]) {
  if (!outputContracts.includes(required)) {
    errors.push(`template/docs/agent/output-contracts.md missing ${required}`);
  }
}

const autonomousCampaign = await readFile(
  join(root, "template/experiments/campaigns/autonomous-campaign-template.md"),
  "utf8"
);
for (const required of [
  "Mutability Envelope",
  "Frozen Harness",
  "Baseline Run",
  "Frontier Tracking",
  "keep",
  "discard",
  "crash"
]) {
  if (!autonomousCampaign.includes(required)) {
    errors.push(`template/experiments/campaigns/autonomous-campaign-template.md missing ${required}`);
  }
}

const frontierHeader = (
  await readFile(join(root, "template/experiments/campaigns/frontier-results.tsv"), "utf8")
).split(/\r?\n/, 1)[0];
if (frontierHeader !== "run_id\tgit_commit\tmetric_value\tresource_value\tstatus\tdescription") {
  errors.push("template/experiments/campaigns/frontier-results.tsv has an invalid header");
}

const gitignore = await readFile(join(root, "template/.gitignore"), "utf8");
const packedGitignore = await readFile(join(root, "template/_gitignore"), "utf8");
if (gitignore !== packedGitignore) {
  errors.push("template/.gitignore and template/_gitignore must stay identical");
}
for (const required of ["!.env.example", "node_modules/", "*.egg-info/"]) {
  if (!gitignore.includes(required)) {
    errors.push(`template gitignore missing ${required}`);
  }
}
const envExample = await readFile(join(root, "template/.env.example"), "utf8");
for (const envName of ["SEMANTIC_SCHOLAR_API_KEY", "OPENALEX_API_KEY", "NCBI_API_KEY", "OVERLEAF_TOKEN"]) {
  if (!envExample.includes(`${envName}=`)) {
    errors.push(`template/.env.example missing ${envName}`);
  }
}
if (/your-key|your-token|your-secret|your-api/i.test(envExample) || /\$\{[^}]+}/.test(envExample)) {
  errors.push("template/.env.example must not contain fake secret placeholders");
}

const requiredCsvColumns = {
  "template/sources/source-ledger.csv": [
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
  "template/sources/conversion-ledger.csv": [
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
  "template/sources/bib/citation-audit.csv": [
    "citation_key",
    "status",
    "issue",
    "source_id",
    "claim_or_location",
    "expected_fix",
    "checked_on"
  ],
  "template/artifacts/badge-evidence-ledger.csv": [
    "badge_target",
    "evidence_id",
    "evidence_path",
    "claim_or_result_id",
    "artifact_component",
    "command_or_procedure",
    "validation_status",
    "checked_on"
  ],
  "template/sota/literature-matrix.csv": [
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
    "identifiers",
    "full_text_status",
    "reading_status",
    "synthesis_path",
    "bib_key",
    "role"
  ],
  "template/sota/screening-decisions.csv": [
    "stage",
    "source_id",
    "title",
    "decision",
    "reason",
    "screened_by",
    "date"
  ],
  "template/sota/reading-log.csv": [
    "source_id",
    "role",
    "reading_copy_path",
    "start_location",
    "end_location",
    "status",
    "reader",
    "started_on",
    "completed_on"
  ],
  "template/sota/citation-chasing-log.csv": [
    "round",
    "seed_source_id",
    "direction",
    "tool_or_database",
    "query_or_graph_call",
    "found_count",
    "new_after_dedup",
    "promoted_to_seed_count",
    "screening_status",
    "date"
  ],
  "template/experiments/registry.csv": [
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

for (const [relative, required] of Object.entries(requiredCsvColumns)) {
  const header = (await readFile(join(root, relative), "utf8")).split(/\r?\n/, 1)[0] ?? "";
  const columns = new Set(header.split(",").map((column) => column.trim()).filter(Boolean));
  for (const column of required) {
    if (!columns.has(column)) errors.push(`${relative} missing column ${column}`);
  }
}

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: create-academic-research validated");
