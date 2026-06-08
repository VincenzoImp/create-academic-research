import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  DEFAULT_AGENT,
  formatMcpDotenv,
  initializeCapabilities,
  installSkills,
  mcpLocalSetupGitignoreWarning,
  mcpMissingGeneratedSnippetMessage,
  readCapabilities,
  readCapabilityLock,
  renderCapabilityProfile,
  renderMcpSetup,
  renderMcpSnippet,
  resolveMcpServerForState,
  writeMcpEnvironmentExample
} from "./capabilities.js";
import { assertKnownAgentTarget } from "./agents.js";
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

export interface InitProjectOptions extends CreateProjectOptions {}

export interface UpdateProjectOptions {
  apply?: boolean;
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
  warnings: string[];
}

export interface ProjectFileChange {
  path: string;
  action: "create" | "update" | "skip";
  reason?: string;
}

export interface UpdateProjectResult {
  root: string;
  applied: boolean;
  changes: ProjectFileChange[];
}

interface ProjectConfig {
  project: {
    slug: string;
    title: string;
    profile: string;
    package: string;
  };
  workflow?: Record<string, unknown>;
  paths?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GeneratedPackageJson {
  name?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface PackageJson {
  version?: string;
}

interface ManagedFileManifest {
  version: 1;
  generator: {
    name: "create-academic-research";
    version: string;
    updated_at: string;
  };
  files: Record<string, ManagedFileRecord>;
}

type ManagedFilePolicy = "managed" | "generated" | "append-only" | "user-owned";

interface ManagedFileRecord {
  path: string;
  policy: ManagedFilePolicy;
  generated_checksum: string;
  baseline_checksum?: string;
  current_checksum?: string;
  updated_at?: string;
  reason?: string;
}

interface ManagedFileSpec {
  path: string;
  policy: ManagedFilePolicy;
  content: string;
  mergeSafe?: boolean;
  trackOnly?: boolean;
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
    "last_checked",
    "discovery_source",
    "zotero_item_key",
    "zotero_attachment_path",
    "notes"
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
    "checked_on",
    "zotero_item_key",
    "zotero_exported_bib_key",
    "reconciliation_status",
    "notes"
  ],
  "sources/zotero/import-log.csv": [
    "import_id",
    "imported_on",
    "zotero_collection_key",
    "zotero_collection_name",
    "zotero_item_key",
    "zotero_item_type",
    "title",
    "attachment_path",
    "exported_bib_key",
    "source_id",
    "reconciliation_status",
    "notes"
  ],
  "sources/zotero/collection-map.csv": [
    "collection_key",
    "collection_name",
    "zotero_parent_key",
    "scope",
    "source_set",
    "status",
    "last_imported_on",
    "notes"
  ],
  "artifacts/badge-evidence-ledger.csv": [
    "badge_target",
    "profile_id",
    "profile_target",
    "applicability",
    "evidence_id",
    "evidence_path",
    "claim_or_result_id",
    "artifact_component",
    "command_or_procedure",
    "validation_status",
    "missing_evidence",
    "blocking_gaps",
    "reviewer",
    "checked_date",
    "checked_on",
    "status",
    "notes"
  ],
  "sota/literature-matrix.csv": [
    "source_id",
    "bib_key",
    "role",
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
    "full_text_status",
    "reading_status",
    "synthesis_path",
    "citation_count_or_signal",
    "identifiers",
    "claim_ids",
    "evidence_strength",
    "downstream_status",
    "notes"
  ],
  "sota/sota-claim-ledger.csv": [
    "claim_id",
    "claim_text",
    "source_ids",
    "bib_keys",
    "evidence_strength",
    "allowed_wording",
    "forbidden_stronger_wording",
    "method_context",
    "limitations",
    "contradictions",
    "downstream_status",
    "downstream_targets",
    "unresolved_risks",
    "review_status",
    "last_checked",
    "notes"
  ],
  "survey/survey-claim-ledger.csv": [
    "survey_claim_id",
    "sota_claim_ids",
    "section_id",
    "claim_text",
    "source_ids",
    "evidence_strength",
    "synthesis_role",
    "allowed_wording",
    "limitations",
    "contradictions",
    "review_status",
    "downstream_status",
    "notes"
  ],
  "research_agenda/opportunity-ledger.csv": [
    "opportunity_id",
    "title",
    "evidence_summary",
    "source_gap_ids",
    "sota_claim_ids",
    "survey_claim_ids",
    "nearest_prior_work",
    "method_or_experiment_idea",
    "feasibility",
    "expected_contribution",
    "failure_condition",
    "risks",
    "cost",
    "priority",
    "publishability",
    "ethical_or_release_constraints",
    "decision",
    "decision_rationale",
    "review_status",
    "next_step",
    "notes"
  ],
  "contributions/contribution-ledger.csv": [
    "contribution_id",
    "title",
    "type",
    "agenda_opportunity_ids",
    "status",
    "primary_claim_ids",
    "source_ids",
    "sota_claim_ids",
    "survey_claim_ids",
    "analysis_ids",
    "experiment_ids",
    "artifact_paths",
    "output_data_paths",
    "output_table_paths",
    "output_figure_paths",
    "badge_targets",
    "compliance_profiles",
    "report_path",
    "claim_map_path",
    "badge_plan_path",
    "review_status",
    "clean_copy_status",
    "supersession_status",
    "next_step",
    "notes"
  ],
  "paper_frames/frame-ledger.csv": [
    "frame_id",
    "title",
    "status",
    "target_venue",
    "track",
    "year",
    "audience",
    "frame_type",
    "selected_contribution_ids",
    "selected_analysis_ids",
    "badge_targets",
    "compliance_profiles",
    "release_plan_path",
    "argument_map_path",
    "evidence_map_path",
    "outline_path",
    "decision_path",
    "review_status",
    "next_step",
    "notes"
  ],
  "paper_releases/release-ledger.csv": [
    "release_id",
    "frame_id",
    "status",
    "release_type",
    "source_map_path",
    "release_yaml_path",
    "lock_path",
    "checksum_path",
    "included_paths",
    "excluded_paths",
    "active_profiles",
    "anonymization_mode",
    "public_destination",
    "artifact_destination",
    "smoke_tests",
    "metadata_path",
    "review_status",
    "next_step",
    "notes"
  ],
  "paper_releases/templates/source-map.csv": [
    "release_id",
    "released_path",
    "canonical_source_path",
    "source_type",
    "include_mode",
    "checksum",
    "profile_ids",
    "notes"
  ],
  "reports/paper/manuscript-ledger.csv": [
    "manuscript_id",
    "frame_id",
    "status",
    "target_venue",
    "track",
    "source_frame_decision",
    "manifest_path",
    "main_tex_path",
    "claim_map_path",
    "citation_map_path",
    "asset_map_path",
    "release_id",
    "central_bib_path",
    "section_paths",
    "review_status",
    "clean_copy_status",
    "next_step",
    "notes"
  ],
  "reports/paper/templates/paper-claim-map.csv": [
    "paper_claim_id",
    "section_id",
    "paragraph_or_line",
    "claim_text",
    "upstream_claim_ids",
    "source_ids",
    "bib_keys",
    "evidence_strength",
    "allowed_wording",
    "limitations",
    "contradictions",
    "review_status",
    "notes"
  ],
  "reports/paper/templates/citation-map.csv": [
    "citation_key",
    "section_id",
    "claim_ids",
    "source_id",
    "bib_path",
    "citation_role",
    "verified_in_citation_audit",
    "review_status",
    "notes"
  ],
  "reports/paper/templates/asset-map.csv": [
    "asset_id",
    "section_id",
    "asset_type",
    "canonical_source_path",
    "rendered_path",
    "include_command",
    "source_data_path",
    "source_analysis_id",
    "source_contribution_id",
    "checksum",
    "review_status",
    "notes"
  ],
  "paper_submissions/submission-ledger.csv": [
    "submission_id",
    "frame_id",
    "manuscript_id",
    "release_id",
    "status",
    "target_venue",
    "track",
    "year",
    "submission_system",
    "anonymity_mode",
    "submission_yaml_path",
    "cover_letter_path",
    "checklist_path",
    "submitted_lock_path",
    "current_decision",
    "current_round",
    "correspondence_path",
    "review_rounds_path",
    "camera_ready_path",
    "review_status",
    "next_step",
    "notes"
  ],
  "paper_submissions/templates/review-rounds/r1/concern-map.csv": [
    "concern_id",
    "round_id",
    "reviewer_id",
    "comment_location",
    "concern_text",
    "severity",
    "category",
    "requested_action",
    "response_status",
    "evidence_anchor",
    "manuscript_location",
    "linked_work_required",
    "linked_work_id",
    "owner",
    "next_step",
    "notes"
  ],
  "paper_submissions/templates/review-rounds/r1/linked-work.csv": [
    "linked_work_id",
    "round_id",
    "concern_ids",
    "work_type",
    "target_path",
    "status",
    "contribution_id",
    "analysis_id",
    "artifact_path",
    "citation_key",
    "source_id",
    "blocking_status",
    "review_status",
    "notes"
  ],
  "paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv": [
    "change_id",
    "round_id",
    "concern_ids",
    "manuscript_path",
    "section_id",
    "location_before",
    "location_after",
    "change_summary",
    "evidence_anchor",
    "response_text_anchor",
    "verified",
    "review_status",
    "notes"
  ],
  "sota/screening-decisions.csv": ["stage", "source_id", "title", "decision", "reason", "screened_by", "date"],
  "sota/reading-log.csv": [
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
  "sota/citation-chasing-log.csv": [
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

const REQUIRED_TSV_COLUMNS: Record<string, string[]> = {
  "experiments/campaigns/frontier-results.tsv": [
    "run_id",
    "git_commit",
    "metric_value",
    "resource_value",
    "status",
    "description"
  ]
};

const REQUIRED_YAML_PATHS: Record<string, string[]> = {
  "compliance/profiles.yaml": [
    "version",
    "active_profile_fields",
    "active_profiles",
    "profiles.acm-artifact-review",
    "profiles.acm-artifact-review.source_url",
    "profiles.usenix-artifact-evaluation",
    "profiles.sigplan-acm-artifact-evaluation",
    "profiles.cos-open-science-badges",
    "profiles.osf-open-practice-resource-badges",
    "profiles.top-transparency",
    "profiles.venue-reproducibility-checklist",
    "profiles.method-reporting-standards",
    "profiles.survey-reporting",
    "profiles.dataset-metadata",
    "profiles.ai-model-release"
  ],
  "contributions/templates/contribution.yaml": [
    "version",
    "contribution.id",
    "contribution.title",
    "contribution.type",
    "contribution.status",
    "contribution.agenda_opportunity_ids",
    "evidence.source_ids",
    "evidence.sota_claim_ids",
    "evidence.survey_claim_ids",
    "evidence.agenda_opportunity_ids",
    "components.analyses",
    "components.experiments",
    "components.artifacts",
    "outputs.data",
    "outputs.tables",
    "outputs.figures",
    "outputs.models",
    "outputs.software",
    "outputs.artifacts",
    "outputs.paper_export",
    "badge_targets",
    "compliance_profiles",
    "review.status",
    "review.latest_review_path",
    "review.clean_copy_gate",
    "supersession.status",
    "supersession.replaces",
    "supersession.replaced_by"
  ],
  "contributions/templates/compliance/profiles.yaml": [
    "version",
    "active_profiles",
    "available_profiles",
    "evidence_ledger"
  ],
  "contributions/templates/analyses/templates/analysis.yaml": [
    "version",
    "analysis.id",
    "analysis.contribution_id",
    "analysis.status",
    "analysis.primary_question",
    "analysis.unit_of_analysis",
    "analysis.linked_claim_ids",
    "metric.name",
    "metric.direction",
    "data.raw_provenance",
    "data.canonical_inputs",
    "design.sample_count",
    "design.seed_count",
    "design.run_count",
    "design.comparison_family",
    "scripts.commands",
    "scripts.environment",
    "outputs.data",
    "outputs.tables",
    "outputs.figures",
    "outputs.paper_export",
    "validation.commands",
    "publication_assets.figure_paths",
    "publication_assets.table_paths",
    "review.status",
    "review.clean_copy_gate",
    "supersession.status"
  ],
  "paper_frames/templates/selected-contributions.yaml": [
    "version",
    "frame.id",
    "frame.status",
    "frame.target_venue",
    "frame.track",
    "frame.year",
    "frame.audience",
    "selected_contributions",
    "selected_analyses",
    "badge_targets",
    "compliance_profiles",
    "release_implications"
  ],
  "paper_frames/templates/release-plan.yaml": [
    "version",
    "frame_id",
    "release_modes",
    "included_contributions",
    "included_analyses",
    "active_profiles",
    "anonymization_mode",
    "public_destination",
    "required_release_outputs",
    "smoke_tests",
    "metadata_requirements",
    "known_release_risks"
  ],
  "paper_releases/templates/release.yaml": [
    "version",
    "release.id",
    "release.status",
    "release.type",
    "frame_id",
    "source_frame_decision",
    "included_contributions",
    "included_analyses",
    "included_paths",
    "excluded_paths",
    "active_profiles",
    "anonymization_mode",
    "destinations.public",
    "destinations.artifact_evaluation",
    "smoke_tests",
    "metadata.readme",
    "expected_outputs.artifact",
    "expected_outputs.manuscript",
    "review.status",
    "review.source_map_checked",
    "review.checksums_checked"
  ],
  "reports/paper/templates/manuscript.yaml": [
    "version",
    "manuscript.id",
    "manuscript.status",
    "manuscript.type",
    "frame_id",
    "source_frame_decision",
    "target.venue",
    "target.track",
    "target.year",
    "bibliography.primary_bib",
    "inputs.frame_contract",
    "inputs.selected_contributions",
    "inputs.argument_map",
    "inputs.evidence_map",
    "inputs.release_plan",
    "inputs.contribution_reports",
    "inputs.analysis_exports",
    "maps.claim_map",
    "maps.citation_map",
    "maps.asset_map",
    "latex.main",
    "latex.sections",
    "asset_policy.numeric_truth_source",
    "asset_policy.tables_from_files",
    "asset_policy.figures_from_files",
    "review.status",
    "review.claims_checked",
    "review.citations_checked",
    "review.assets_checked",
    "review.clean_copy_gate"
  ],
  "paper_submissions/templates/submission.yaml": [
    "version",
    "submission.id",
    "submission.status",
    "submission.type",
    "frame_id",
    "manuscript_id",
    "release_id",
    "target.venue",
    "target.track",
    "target.year",
    "submission_system.name",
    "anonymity_mode",
    "submitted_files.manuscript",
    "submitted_files.artifact",
    "submitted_files.supplement",
    "cover_letter.path",
    "cover_letter.status",
    "checklist.path",
    "submitted_version_lock",
    "review_rounds.current",
    "review_rounds.rounds",
    "current_decision",
    "linked_evidence.claim_map",
    "linked_evidence.citation_map",
    "linked_evidence.asset_map",
    "review.status",
    "review.unsupported_claims_checked",
    "review.communication_only_checked"
  ]
};

const REQUIRED_MARKDOWN_TABLE_COLUMNS: Record<string, string[]> = {
  "contributions/templates/analyses/templates/figure-catalog.md": [
    "figure_id",
    "source_data_path",
    "purpose",
    "caption_requirement",
    "key_observation",
    "interpretation_checklist",
    "known_caveats",
    "qa_status"
  ],
  "contributions/templates/analyses/templates/stats-appendix.md": [
    "stat_id",
    "analysis_question",
    "variable_or_metric",
    "descriptive_stats",
    "test_choice",
    "assumptions",
    "effect_size",
    "confidence_interval",
    "multiple_comparison_handling",
    "sample_seed_run_counts",
    "limitations",
    "source_path"
  ]
};

const REQUIRED_WORKFLOW_STAGES = [
  "source-ingestion",
  "sota",
  "survey",
  "research-agenda",
  "contribution",
  "analysis",
  "paper-framing",
  "paper-release",
  "manuscript",
  "submission",
  "response"
];

const REQUIRED_PROJECT_PATHS: Record<string, string> = {
  sources: "sources",
  sota: "sota",
  survey: "survey",
  research_agenda: "research_agenda",
  contributions: "contributions",
  paper_frames: "paper_frames",
  paper_releases: "paper_releases",
  paper_submissions: "paper_submissions",
  reports: "reports",
  compliance: "compliance",
  wiki: "wiki",
  experiments: "experiments",
  outputs: "outputs"
};

export async function createProject(options: CreateProjectOptions): Promise<ProjectResult> {
  const target = resolve(options.target);
  if (await isNonEmptyDirectory(target)) {
    throw new Error(`target directory is not empty: ${target}`);
  }
  const title = options.title ?? titleFromSlug(options.slug ?? basename(target));
  const slug = slugify(options.slug ?? title);
  const packageName = packageify(options.packageName ?? slug);
  const preset = assertKnownPreset(options.preset ?? "default");
  const agent = assertKnownAgentTarget(options.agent ?? DEFAULT_AGENT);

  await mkdir(dirname(target), { recursive: true });
  await copyDirectory(templateRoot, target);
  await writeGeneratedGitignore(target);
  await personalizeProject(target, { title, slug, packageName, profile: options.profile ?? "academic-general" });
  await writeGeneratedPackageJson(target, { slug });
  await writeAgentStack(target);
  await writeMcpEnvironmentExample(target);
  await initializeCapabilities(target, { preset, agent });
  await writeManagedFileManifest(target);

  if (options.installSkills) {
    await installSkills(target, preset);
  }
  return { root: target, title, slug, packageName };
}

export async function initProject(options: InitProjectOptions): Promise<ProjectResult> {
  const target = resolve(options.target);
  const title = options.title ?? titleFromSlug(options.slug ?? basename(target));
  const slug = slugify(options.slug ?? title);
  const packageName = packageify(options.packageName ?? slug);
  const preset = assertKnownPreset(options.preset ?? "default");
  const agent = assertKnownAgentTarget(options.agent ?? DEFAULT_AGENT);

  await mkdir(target, { recursive: true });
  const created = await copyDirectoryMissing(templateRoot, target);
  await writeGeneratedGitignore(target, { overwrite: false });
  const project = await personalizeInitializedProject(
    target,
    {
      title,
      slug,
      packageName,
      profile: options.profile ?? "academic-general"
    },
    created
  );
  await writeGeneratedPackageJson(target, { slug: project.slug });
  if (created.has("configs/agent-stack.yaml")) await writeAgentStack(target);
  if (created.has(".env.example")) await writeMcpEnvironmentExample(target);
  if (created.has("configs/capabilities.yaml")) {
    await initializeCapabilities(target, { preset, agent });
  } else {
    await updateManagedCapabilityFiles(target, { apply: true, changes: [] });
  }
  await writeManagedFileManifest(target);

  if (options.installSkills) {
    await installSkills(target, preset, { agent });
  }
  return project;
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
  await writeGeneratedPackageJson(target, { slug, preserveExistingSpec: true });
  await writeManagedFileManifest(target);
  return { root: target, title, slug, packageName };
}

export async function updateProject(root: string, options: UpdateProjectOptions = {}): Promise<UpdateProjectResult> {
  const target = resolve(root);
  const changes: ProjectFileChange[] = [];
  const manifest = await readManagedFileManifest(target);
  await updateProjectConfigDefaults(target, { apply: options.apply === true, changes });
  await updateProjectDelimitedHeaders(target, { apply: options.apply === true, changes });
  const specs = await managedFileSpecs(target);
  const nextManifest = await stageManagedFiles(target, specs, manifest, {
    apply: options.apply === true,
    changes
  });
  await stageManagedManifest(target, manifest, nextManifest, { apply: options.apply === true, changes });
  return { root: target, applied: options.apply === true, changes };
}

export async function doctorProject(root: string): Promise<DoctorResult> {
  const target = resolve(root);
  const errors: string[] = [];
  const warnings: string[] = [];
  const required = [
    "README.md",
    ".gitignore",
    ".env.example",
    "package.json",
    "pyproject.toml",
    "AGENTS.md",
    "configs/default.yaml",
    "configs/agent-stack.yaml",
    "configs/capabilities.yaml",
    "docs/agent/capability-profile.md",
    "docs/agent/mcp-setup.md",
    "docs/agent/mcp-client-setup.md",
    "docs/agent/output-contracts.md",
    "docs/agent/project-quality.md",
    "docs/agent/skill-readiness.md",
    "docs/agent/research-workflow.md",
    "docs/agent/review-loop.md",
    "docs/agent/workflow-prompts/README.md",
    "docs/agent/workflow-prompts/literature.md",
    "docs/agent/workflow-prompts/survey.md",
    "docs/agent/workflow-prompts/agenda.md",
    "docs/agent/workflow-prompts/contribution.md",
    "docs/agent/workflow-prompts/analysis.md",
    "docs/agent/workflow-prompts/frame.md",
    "docs/agent/workflow-prompts/release.md",
    "docs/agent/workflow-prompts/manuscript.md",
    "docs/agent/workflow-prompts/submission.md",
    "docs/agent/workflow-prompts/response.md",
    "docs/agent/workflow-prompts/full-research-loop.md",
    "docs/agent/repo-migration-playbook.md",
    "compliance/profiles.yaml",
    "compliance/README.md",
    "compliance/acm-artifact-review.md",
    "compliance/open-practice-badges.md",
    "compliance/top-transparency.md",
    "compliance/venue-checklist.md",
    "compliance/method-reporting.md",
    "compliance/survey-reporting.md",
    "compliance/dataset-metadata.md",
    "compliance/ai-model-release.md",
    "docs/agent/generated",
    "docs/reproducibility/commands.md",
    "scripts/README.md",
    "analysis_outputs/claim-audit.md",
    "artifacts/badge-evidence-ledger.csv",
    "experiments/campaigns/autonomous-campaign-template.md",
    "experiments/campaigns/frontier-results.tsv",
    "repro_outputs/SUMMARY.md",
    "repro_outputs/COMMANDS.md",
    "repro_outputs/LOG.md",
    "repro_outputs/PATCHES.md",
    "repro_outputs/status.json",
    "sources/markdown-linear",
    "sources/source-ledger.csv",
    "sources/zotero/README.md",
    "sources/zotero/import-log.csv",
    "sources/zotero/collection-map.csv",
    "sota/reading-log.csv",
    "sota/citation-chasing-log.csv",
    "sota/literature-matrix.csv",
    "sota/sota-claim-ledger.csv",
    "sota/promotion-rules.md",
    "sota/paper-syntheses",
    "survey/survey-contract.md",
    "survey/outline.md",
    "survey/section-plans",
    "survey/drafts",
    "survey/final",
    "survey/reviews",
    "survey/compliance/README.md",
    "survey/survey-claim-ledger.csv",
    "research_agenda/agenda-contract.md",
    "research_agenda/opportunity-ledger.csv",
    "research_agenda/directions",
    "research_agenda/final",
    "research_agenda/reviews",
    "contributions/contribution-ledger.csv",
    "contributions/templates/contribution.yaml",
    "contributions/templates/README.md",
    "contributions/templates/claim-map.md",
    "contributions/templates/badge-plan.md",
    "contributions/templates/compliance/profiles.yaml",
    "contributions/templates/components",
    "contributions/templates/inputs",
    "contributions/templates/outputs/data",
    "contributions/templates/outputs/tables",
    "contributions/templates/outputs/figures",
    "contributions/templates/outputs/models",
    "contributions/templates/outputs/software",
    "contributions/templates/outputs/artifacts",
    "contributions/templates/report.md",
    "contributions/templates/paper-export",
    "contributions/templates/reviews",
    "contributions/templates/archive",
    "contributions/templates/analyses/templates/analysis.yaml",
    "contributions/templates/analyses/templates/README.md",
    "contributions/templates/analyses/templates/blocker-summary.md",
    "contributions/templates/analyses/templates/inputs",
    "contributions/templates/analyses/templates/data",
    "contributions/templates/analyses/templates/scripts",
    "contributions/templates/analyses/templates/tables",
    "contributions/templates/analyses/templates/figures",
    "contributions/templates/analyses/templates/figure-catalog.md",
    "contributions/templates/analyses/templates/stats-appendix.md",
    "contributions/templates/analyses/templates/report.md",
    "contributions/templates/analyses/templates/paper-export",
    "contributions/templates/analyses/templates/paper-export/README.md",
    "contributions/templates/analyses/templates/reviews",
    "contributions/templates/analyses/templates/archive",
    "paper_frames/frame-ledger.csv",
    "paper_frames/templates/frame-contract.md",
    "paper_frames/templates/selected-contributions.yaml",
    "paper_frames/templates/argument-map.md",
    "paper_frames/templates/evidence-map.md",
    "paper_frames/templates/badge-fit.md",
    "paper_frames/templates/compliance-fit.md",
    "paper_frames/templates/venue-fit.md",
    "paper_frames/templates/release-plan.yaml",
    "paper_frames/templates/outline.md",
    "paper_frames/templates/reviews",
    "paper_frames/templates/decision.md",
    "paper_releases/release-ledger.csv",
    "paper_releases/templates/release.yaml",
    "paper_releases/templates/source-map.csv",
    "paper_releases/templates/release-plan.lock",
    "paper_releases/templates/checksums.txt",
    "paper_releases/templates/artifact",
    "paper_releases/templates/manuscript",
    "paper_releases/templates/supplement",
    "paper_releases/templates/data",
    "paper_releases/templates/models",
    "paper_releases/templates/metadata/README.md",
    "paper_releases/templates/reviews",
    "paper_releases/templates/archive",
    "scripts/release-paper/README.md",
    "reports/paper/manuscript-ledger.csv",
    "reports/paper/templates/manuscript.yaml",
    "reports/paper/templates/paper-claim-map.csv",
    "reports/paper/templates/citation-map.csv",
    "reports/paper/templates/asset-map.csv",
    "reports/paper/templates/main.tex",
    "reports/paper/templates/sections/abstract.tex",
    "reports/paper/templates/sections/introduction.tex",
    "reports/paper/templates/sections/related-work.tex",
    "reports/paper/templates/sections/method.tex",
    "reports/paper/templates/sections/results.tex",
    "reports/paper/templates/sections/discussion.tex",
    "reports/paper/templates/sections/limitations.tex",
    "reports/paper/templates/sections/ethics-and-availability.tex",
    "reports/paper/templates/sections/conclusion.tex",
    "reports/paper/templates/reviews",
    "reports/paper/templates/archive",
    "scripts/write-paper/README.md",
    "paper_submissions/submission-ledger.csv",
    "paper_submissions/templates/submission.yaml",
    "paper_submissions/templates/cover-letter.md",
    "paper_submissions/templates/submission-checklist.md",
    "paper_submissions/templates/submitted-version.lock",
    "paper_submissions/templates/venue-system-notes.md",
    "paper_submissions/templates/correspondence",
    "paper_submissions/templates/decisions",
    "paper_submissions/templates/review-rounds/r1/decision-letter.md",
    "paper_submissions/templates/review-rounds/r1/reviewer-comments.md",
    "paper_submissions/templates/review-rounds/r1/concern-map.csv",
    "paper_submissions/templates/review-rounds/r1/response-strategy.md",
    "paper_submissions/templates/review-rounds/r1/revision-plan.md",
    "paper_submissions/templates/review-rounds/r1/linked-work.csv",
    "paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv",
    "paper_submissions/templates/review-rounds/r1/response-letter.md",
    "paper_submissions/templates/review-rounds/r1/rebuttal.md",
    "paper_submissions/templates/review-rounds/r1/reviews",
    "paper_submissions/templates/camera-ready",
    "paper_submissions/templates/archive",
    "reports/paper/sota-survey.tex",
    "wiki/index.md",
    "wiki/log.md",
    "wiki/templates/source-page.md",
    "wiki/templates/claim-page.md",
    "wiki/templates/experiment-page.md",
    "wiki/templates/decision-record.md",
    "wiki/templates/reviewer-concern.md",
    "wiki/templates/research-question.md"
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
      validateWorkflowConfig(config, errors);
    } catch (error) {
      errors.push(`invalid configs/default.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (await exists(join(target, "configs/capabilities.yaml"))) {
    try {
      const state = await readCapabilities(target);
      const unknown = state.mcp_servers.filter((server) => !AGENT_STACK.mcp_servers[server]);
      if (unknown.length > 0) errors.push(`unknown MCP server in configs/capabilities.yaml: ${unknown.join(", ")}`);
      const needsMcpEnvDoctor = state.mcp_servers.some((serverName) => {
        const server = AGENT_STACK.mcp_servers[serverName]
          ? resolveMcpServerForState(state, serverName, state.mcp_server_modes[serverName])
          : undefined;
        return Boolean(
          server &&
            (server.required_env.length > 0 ||
              server.recommended_env.length > 0 ||
              server.local_service ||
              server.execution_mode === "manual-local" ||
              server.execution_mode === "local-service")
        );
      });
      if (needsMcpEnvDoctor) {
        warnings.push("MCP readiness may require local secrets; run npm run mcp:doctor -- --env-file .env.local");
      }
      const lock = await readCapabilityLock(target);
      const hasManualLocalMcp = state.mcp_servers.some((serverName) => {
        if (!AGENT_STACK.mcp_servers[serverName]) return false;
        const server = resolveMcpServerForState(state, serverName, state.mcp_server_modes[serverName]);
        return server.connection_mode === "manual-local";
      });
      if (hasManualLocalMcp) {
        const gitignoreWarning = await mcpLocalSetupGitignoreWarning(target);
        if (gitignoreWarning) warnings.push(gitignoreWarning);
      }
      for (const serverName of state.mcp_servers) {
        if (!AGENT_STACK.mcp_servers[serverName]) continue;
        const server = resolveMcpServerForState(state, serverName, state.mcp_server_modes[serverName]);
        if (
          server.connection_mode === "remote-custom" &&
          server.remote_url_env &&
          !envHasValue(process.env, server.remote_url_env)
        ) {
          errors.push(`${serverName}: missing required environment variable: ${server.remote_url_env}`);
        }
      }
      const snippet = renderMcpSnippet(state);
      const snippetServers = state.mcp_servers.filter((serverName) => {
        if (!AGENT_STACK.mcp_servers[serverName]) return false;
        const server = resolveMcpServerForState(state, serverName, state.mcp_server_modes[serverName]);
        return Boolean(
          server.command ||
            (server.connection_mode === "remote-curated" && server.hosted_url) ||
            (server.connection_mode === "remote-custom" && server.remote_configured)
        );
      });
      if (snippetServers.length > 0) {
        try {
          const raw = await readFile(join(target, "docs/agent/generated", snippet.fileName), "utf8");
          const generated = JSON.parse(raw) as { mcpServers?: Record<string, unknown> };
          for (const server of snippetServers) {
            if (!Object.hasOwn(generated.mcpServers ?? {}, server)) {
              const resolved = resolveMcpServerForState(state, server, state.mcp_server_modes[server]);
              errors.push(mcpMissingGeneratedSnippetMessage(server, resolved, process.env));
              continue;
            }
            const resolved = resolveMcpServerForState(state, server, state.mcp_server_modes[server]);
            if (
              state.agent === "codex" &&
              resolved.connection_mode === "manual-local" &&
              lock.mcp[server]?.setup?.status === "ready" &&
              lock.mcp[server]?.clients?.codex?.status !== "registered"
            ) {
              warnings.push(`${server} is setup locally but not registered in Codex\nNEXT: npm run mcp:client:add -- ${server} --agent codex`);
            }
          }
        } catch (error) {
          errors.push(
            `invalid generated MCP snippet: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      errors.push(`invalid configs/capabilities.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await validatePackageContract(target, errors, warnings);
  await validateManagedManifestDrift(target, warnings);
  await validateStaleCommandReferences(target, warnings);
  for (const [relative, requiredColumns] of Object.entries(REQUIRED_CSV_COLUMNS)) {
    await validateCsvHeader(target, relative, requiredColumns, errors);
  }
  for (const [relative, requiredColumns] of Object.entries(REQUIRED_TSV_COLUMNS)) {
    await validateDelimitedHeader(target, relative, requiredColumns, "\t", errors);
  }
  for (const [relative, requiredPaths] of Object.entries(REQUIRED_YAML_PATHS)) {
    await validateYamlRequiredPaths(target, relative, requiredPaths, errors);
  }
  for (const [relative, requiredColumns] of Object.entries(REQUIRED_MARKDOWN_TABLE_COLUMNS)) {
    await validateMarkdownTableHeader(target, relative, requiredColumns, errors);
  }
  return { ok: errors.length === 0, errors, warnings };
}

async function personalizeInitializedProject(
  root: string,
  { title, slug, packageName, profile }: PersonalizeOptions,
  created: Set<string>
): Promise<ProjectResult> {
  const configPath = join(root, "configs/default.yaml");
  let config = await readProjectConfig(root);
  if (created.has("configs/default.yaml")) {
    config = withWorkflowDefaults(config);
    config.project = {
      ...config.project,
      slug,
      title,
      profile,
      package: packageName
    };
    await writeFile(configPath, YAML.stringify(config), "utf8");
  }

  config = await readProjectConfig(root);
  const project = config.project;
  if (created.has("pyproject.toml")) {
    const pyprojectPath = join(root, "pyproject.toml");
    const pyproject = await readFile(pyprojectPath, "utf8");
    await writeFile(pyprojectPath, pyproject.replace(/^name = ".*"$/m, `name = "${project.slug}"`), "utf8");
  }
  if (created.has("README.md")) {
    const readmePath = join(root, "README.md");
    const readme = await readFile(readmePath, "utf8");
    await writeFile(readmePath, readme.replace(/^# .*/m, `# ${project.title}`), "utf8");
  }
  await moveInitializedPythonPackage(root, project.package, created);
  return { root, title: project.title, slug: project.slug, packageName: project.package };
}

async function moveInitializedPythonPackage(
  root: string,
  packageName: string,
  created: Set<string>
): Promise<void> {
  const previous = join(root, "src", "project_package");
  const next = join(root, "src", packageName);
  if (previous !== next && (await exists(previous)) && !(await exists(next))) {
    await movePath(previous, next);
    return;
  }
  await mkdir(dirname(join(next, "__init__.py")), { recursive: true });
  if (!(await exists(join(next, "__init__.py")))) {
    await writeFile(join(next, "__init__.py"), "\"\"\"Project package.\"\"\"\n", "utf8");
  }
  if (previous !== next && created.has("src/project_package/__init__.py")) {
    await rm(join(previous, "__init__.py"), { force: true });
  }
}

async function personalizeProject(
  root: string,
  { title, slug, packageName, profile, previousPackage = "project_package" }: PersonalizeOptions
): Promise<void> {
  const configPath = join(root, "configs/default.yaml");
  const config = withWorkflowDefaults(YAML.parse(await readFile(configPath, "utf8")) as ProjectConfig);
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

async function writeGeneratedPackageJson(
  root: string,
  { slug, preserveExistingSpec = false }: { slug: string; preserveExistingSpec?: boolean }
): Promise<void> {
  const path = join(root, "package.json");
  const data = await readJson<GeneratedPackageJson>(path);
  const packageSpec = await generatedPackageSpec(data, preserveExistingSpec);
  await writeJson(path, generatedPackageJson(data, slug, packageSpec));
}

async function updateGeneratedPackageJson(
  root: string,
  slug: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  const path = join(root, "package.json");
  const data = await readJson<GeneratedPackageJson>(path);
  const packageSpec = await generatedPackageSpec(data, false);
  const next = `${JSON.stringify(generatedPackageJson(data, slug, packageSpec), null, 2)}\n`;
  await stageTextWrite(root, "package.json", next, options);
}

async function updateProjectConfigDefaults(
  root: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  const path = join(root, "configs/default.yaml");
  if (!(await exists(path))) return;
  const current = await readFile(path, "utf8");
  const parsed = YAML.parse(current) as ProjectConfig;
  const next = YAML.stringify(withWorkflowDefaults(parsed));
  if (current === next) return;
  options.changes.push({ path: "configs/default.yaml", action: "update" });
  if (!options.apply) return;
  await writeFile(path, next, "utf8");
}

async function updateProjectDelimitedHeaders(
  root: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  for (const [relativePath, requiredColumns] of Object.entries(REQUIRED_CSV_COLUMNS)) {
    await updateProjectDelimitedHeader(root, relativePath, requiredColumns, ",", options);
  }
  for (const [relativePath, requiredColumns] of Object.entries(REQUIRED_TSV_COLUMNS)) {
    await updateProjectDelimitedHeader(root, relativePath, requiredColumns, "\t", options);
  }
}

async function updateProjectDelimitedHeader(
  root: string,
  relativePath: string,
  requiredColumns: string[],
  delimiter: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  const path = join(root, relativePath);
  if (!(await exists(path))) return;
  const current = await readFile(path, "utf8");
  const next = withRequiredDelimitedColumns(current, requiredColumns, delimiter);
  if (next === current) return;
  options.changes.push({ path: relativePath, action: "update" });
  if (!options.apply) return;
  await writeFile(path, next, "utf8");
}

function withRequiredDelimitedColumns(content: string, requiredColumns: string[], delimiter: string): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const headerColumns = (lines[0] ?? "").split(delimiter).map((column) => column.trim()).filter(Boolean);
  const present = new Set(headerColumns);
  const missing = requiredColumns.filter((column) => !present.has(column));
  if (missing.length === 0) return content;
  lines[0] = [...headerColumns, ...missing].join(delimiter);
  const emptyCells = delimiter.repeat(missing.length);
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] !== "") lines[index] += emptyCells;
  }
  return lines.join(newline);
}

async function managedFileSpecs(root: string): Promise<ManagedFileSpec[]> {
  const config = await readProjectConfig(root);
  const packageJson = await readJson<GeneratedPackageJson>(join(root, "package.json"));
  const packageSpec = await currentPackageVersion();
  const state = await readCapabilities(root);
  const snippet = renderMcpSnippet(state);
  const currentReadme = await readOptionalText(join(root, "README.md"));
  const currentDefaultConfig = await readOptionalText(join(root, "configs/default.yaml"));
  const currentWikiLog = await readOptionalText(join(root, "wiki/log.md"));
  return [
    {
      path: "README.md",
      policy: "user-owned",
      trackOnly: true,
      content: currentReadme ?? ""
    },
    {
      path: "configs/default.yaml",
      policy: "user-owned",
      trackOnly: true,
      content: currentDefaultConfig ?? ""
    },
    {
      path: "wiki/log.md",
      policy: "append-only",
      trackOnly: true,
      content: currentWikiLog ?? ""
    },
    {
      path: "package.json",
      policy: "managed",
      mergeSafe: true,
      content: `${JSON.stringify(generatedPackageJson(packageJson, config.project.slug, packageSpec), null, 2)}\n`
    },
    { path: ".gitignore", policy: "managed", content: await templateText("_gitignore") },
    { path: ".env.example", policy: "managed", content: formatMcpDotenv(Object.keys(AGENT_STACK.mcp_servers)) },
    { path: "configs/agent-stack.yaml", policy: "managed", content: YAML.stringify(AGENT_STACK) },
    { path: "docs/getting-started.md", policy: "managed", content: await templateText("docs/getting-started.md") },
    {
      path: "docs/agent/output-contracts.md",
      policy: "managed",
      content: await templateText("docs/agent/output-contracts.md")
    },
    {
      path: "docs/agent/project-quality.md",
      policy: "managed",
      content: await templateText("docs/agent/project-quality.md")
    },
    {
      path: "docs/agent/skill-readiness.md",
      policy: "managed",
      content: await templateText("docs/agent/skill-readiness.md")
    },
    {
      path: "docs/agent/research-workflow.md",
      policy: "managed",
      content: await templateText("docs/agent/research-workflow.md")
    },
    {
      path: "docs/agent/review-loop.md",
      policy: "managed",
      content: await templateText("docs/agent/review-loop.md")
    },
    {
      path: "docs/agent/workflow-prompts/README.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/README.md")
    },
    {
      path: "docs/agent/workflow-prompts/literature.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/literature.md")
    },
    {
      path: "docs/agent/workflow-prompts/survey.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/survey.md")
    },
    {
      path: "docs/agent/workflow-prompts/agenda.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/agenda.md")
    },
    {
      path: "docs/agent/workflow-prompts/contribution.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/contribution.md")
    },
    {
      path: "docs/agent/workflow-prompts/analysis.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/analysis.md")
    },
    {
      path: "docs/agent/workflow-prompts/frame.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/frame.md")
    },
    {
      path: "docs/agent/workflow-prompts/release.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/release.md")
    },
    {
      path: "docs/agent/workflow-prompts/manuscript.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/manuscript.md")
    },
    {
      path: "docs/agent/workflow-prompts/submission.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/submission.md")
    },
    {
      path: "docs/agent/workflow-prompts/response.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/response.md")
    },
    {
      path: "docs/agent/workflow-prompts/full-research-loop.md",
      policy: "managed",
      content: await templateText("docs/agent/workflow-prompts/full-research-loop.md")
    },
    {
      path: "compliance/profiles.yaml",
      policy: "managed",
      content: await templateText("compliance/profiles.yaml")
    },
    {
      path: "compliance/README.md",
      policy: "managed",
      content: await templateText("compliance/README.md")
    },
    {
      path: "compliance/acm-artifact-review.md",
      policy: "managed",
      content: await templateText("compliance/acm-artifact-review.md")
    },
    {
      path: "compliance/open-practice-badges.md",
      policy: "managed",
      content: await templateText("compliance/open-practice-badges.md")
    },
    {
      path: "compliance/top-transparency.md",
      policy: "managed",
      content: await templateText("compliance/top-transparency.md")
    },
    {
      path: "compliance/venue-checklist.md",
      policy: "managed",
      content: await templateText("compliance/venue-checklist.md")
    },
    {
      path: "compliance/method-reporting.md",
      policy: "managed",
      content: await templateText("compliance/method-reporting.md")
    },
    {
      path: "compliance/survey-reporting.md",
      policy: "managed",
      content: await templateText("compliance/survey-reporting.md")
    },
    {
      path: "compliance/dataset-metadata.md",
      policy: "managed",
      content: await templateText("compliance/dataset-metadata.md")
    },
    {
      path: "compliance/ai-model-release.md",
      policy: "managed",
      content: await templateText("compliance/ai-model-release.md")
    },
    {
      path: "docs/agent/repo-migration-playbook.md",
      policy: "user-owned",
      content: await templateText("docs/agent/repo-migration-playbook.md")
    },
    {
      path: "docs/reproducibility/commands.md",
      policy: "user-owned",
      content: await templateText("docs/reproducibility/commands.md")
    },
    {
      path: "analysis_outputs/claim-audit.md",
      policy: "user-owned",
      content: await templateText("analysis_outputs/claim-audit.md")
    },
    {
      path: "sources/zotero/README.md",
      policy: "user-owned",
      content: await templateText("sources/zotero/README.md")
    },
    {
      path: "sources/zotero/import-log.csv",
      policy: "user-owned",
      content: await templateText("sources/zotero/import-log.csv")
    },
    {
      path: "sources/zotero/collection-map.csv",
      policy: "user-owned",
      content: await templateText("sources/zotero/collection-map.csv")
    },
    {
      path: "sources/markdown-linear/.gitkeep",
      policy: "managed",
      content: await templateText("sources/markdown-linear/.gitkeep")
    },
    { path: "sota/reading-log.csv", policy: "managed", content: await templateText("sota/reading-log.csv") },
    {
      path: "sota/citation-chasing-log.csv",
      policy: "managed",
      content: await templateText("sota/citation-chasing-log.csv")
    },
    {
      path: "sota/sota-claim-ledger.csv",
      policy: "user-owned",
      content: await templateText("sota/sota-claim-ledger.csv")
    },
    {
      path: "sota/promotion-rules.md",
      policy: "managed",
      content: await templateText("sota/promotion-rules.md")
    },
    {
      path: "sota/paper-syntheses/.gitkeep",
      policy: "managed",
      content: await templateText("sota/paper-syntheses/.gitkeep")
    },
    {
      path: "survey/survey-contract.md",
      policy: "managed",
      content: await templateText("survey/survey-contract.md")
    },
    {
      path: "survey/outline.md",
      policy: "managed",
      content: await templateText("survey/outline.md")
    },
    {
      path: "survey/section-plans/.gitkeep",
      policy: "managed",
      content: await templateText("survey/section-plans/.gitkeep")
    },
    {
      path: "survey/drafts/.gitkeep",
      policy: "managed",
      content: await templateText("survey/drafts/.gitkeep")
    },
    {
      path: "survey/final/.gitkeep",
      policy: "managed",
      content: await templateText("survey/final/.gitkeep")
    },
    {
      path: "survey/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("survey/reviews/.gitkeep")
    },
    {
      path: "survey/compliance/README.md",
      policy: "managed",
      content: await templateText("survey/compliance/README.md")
    },
    {
      path: "survey/survey-claim-ledger.csv",
      policy: "user-owned",
      content: await templateText("survey/survey-claim-ledger.csv")
    },
    {
      path: "research_agenda/agenda-contract.md",
      policy: "managed",
      content: await templateText("research_agenda/agenda-contract.md")
    },
    {
      path: "research_agenda/opportunity-ledger.csv",
      policy: "user-owned",
      content: await templateText("research_agenda/opportunity-ledger.csv")
    },
    {
      path: "research_agenda/directions/.gitkeep",
      policy: "managed",
      content: await templateText("research_agenda/directions/.gitkeep")
    },
    {
      path: "research_agenda/final/.gitkeep",
      policy: "managed",
      content: await templateText("research_agenda/final/.gitkeep")
    },
    {
      path: "research_agenda/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("research_agenda/reviews/.gitkeep")
    },
    {
      path: "contributions/contribution-ledger.csv",
      policy: "user-owned",
      content: await templateText("contributions/contribution-ledger.csv")
    },
    {
      path: "contributions/templates/contribution.yaml",
      policy: "managed",
      content: await templateText("contributions/templates/contribution.yaml")
    },
    {
      path: "contributions/templates/README.md",
      policy: "managed",
      content: await templateText("contributions/templates/README.md")
    },
    {
      path: "contributions/templates/claim-map.md",
      policy: "managed",
      content: await templateText("contributions/templates/claim-map.md")
    },
    {
      path: "contributions/templates/badge-plan.md",
      policy: "managed",
      content: await templateText("contributions/templates/badge-plan.md")
    },
    {
      path: "contributions/templates/compliance/profiles.yaml",
      policy: "managed",
      content: await templateText("contributions/templates/compliance/profiles.yaml")
    },
    {
      path: "contributions/templates/components/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/components/.gitkeep")
    },
    {
      path: "contributions/templates/inputs/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/inputs/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/data/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/data/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/tables/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/tables/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/figures/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/figures/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/models/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/models/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/software/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/software/.gitkeep")
    },
    {
      path: "contributions/templates/outputs/artifacts/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/outputs/artifacts/.gitkeep")
    },
    {
      path: "contributions/templates/report.md",
      policy: "managed",
      content: await templateText("contributions/templates/report.md")
    },
    {
      path: "contributions/templates/paper-export/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/paper-export/.gitkeep")
    },
    {
      path: "contributions/templates/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/reviews/.gitkeep")
    },
    {
      path: "contributions/templates/archive/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/archive/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/analysis.yaml",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/analysis.yaml")
    },
    {
      path: "contributions/templates/analyses/templates/README.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/README.md")
    },
    {
      path: "contributions/templates/analyses/templates/blocker-summary.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/blocker-summary.md")
    },
    {
      path: "contributions/templates/analyses/templates/inputs/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/inputs/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/data/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/data/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/scripts/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/scripts/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/tables/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/tables/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/figures/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/figures/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/figure-catalog.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/figure-catalog.md")
    },
    {
      path: "contributions/templates/analyses/templates/stats-appendix.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/stats-appendix.md")
    },
    {
      path: "contributions/templates/analyses/templates/report.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/report.md")
    },
    {
      path: "contributions/templates/analyses/templates/paper-export/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/paper-export/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/paper-export/README.md",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/paper-export/README.md")
    },
    {
      path: "contributions/templates/analyses/templates/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/reviews/.gitkeep")
    },
    {
      path: "contributions/templates/analyses/templates/archive/.gitkeep",
      policy: "managed",
      content: await templateText("contributions/templates/analyses/templates/archive/.gitkeep")
    },
    {
      path: "paper_frames/frame-ledger.csv",
      policy: "user-owned",
      content: await templateText("paper_frames/frame-ledger.csv")
    },
    {
      path: "paper_frames/templates/frame-contract.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/frame-contract.md")
    },
    {
      path: "paper_frames/templates/selected-contributions.yaml",
      policy: "managed",
      content: await templateText("paper_frames/templates/selected-contributions.yaml")
    },
    {
      path: "paper_frames/templates/argument-map.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/argument-map.md")
    },
    {
      path: "paper_frames/templates/evidence-map.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/evidence-map.md")
    },
    {
      path: "paper_frames/templates/badge-fit.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/badge-fit.md")
    },
    {
      path: "paper_frames/templates/compliance-fit.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/compliance-fit.md")
    },
    {
      path: "paper_frames/templates/venue-fit.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/venue-fit.md")
    },
    {
      path: "paper_frames/templates/release-plan.yaml",
      policy: "managed",
      content: await templateText("paper_frames/templates/release-plan.yaml")
    },
    {
      path: "paper_frames/templates/outline.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/outline.md")
    },
    {
      path: "paper_frames/templates/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("paper_frames/templates/reviews/.gitkeep")
    },
    {
      path: "paper_frames/templates/decision.md",
      policy: "managed",
      content: await templateText("paper_frames/templates/decision.md")
    },
    {
      path: "paper_releases/release-ledger.csv",
      policy: "user-owned",
      content: await templateText("paper_releases/release-ledger.csv")
    },
    {
      path: "paper_releases/templates/release.yaml",
      policy: "managed",
      content: await templateText("paper_releases/templates/release.yaml")
    },
    {
      path: "paper_releases/templates/source-map.csv",
      policy: "managed",
      content: await templateText("paper_releases/templates/source-map.csv")
    },
    {
      path: "paper_releases/templates/release-plan.lock",
      policy: "managed",
      content: await templateText("paper_releases/templates/release-plan.lock")
    },
    {
      path: "paper_releases/templates/checksums.txt",
      policy: "managed",
      content: await templateText("paper_releases/templates/checksums.txt")
    },
    {
      path: "paper_releases/templates/artifact/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/artifact/.gitkeep")
    },
    {
      path: "paper_releases/templates/manuscript/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/manuscript/.gitkeep")
    },
    {
      path: "paper_releases/templates/supplement/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/supplement/.gitkeep")
    },
    {
      path: "paper_releases/templates/data/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/data/.gitkeep")
    },
    {
      path: "paper_releases/templates/models/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/models/.gitkeep")
    },
    {
      path: "paper_releases/templates/metadata/README.md",
      policy: "managed",
      content: await templateText("paper_releases/templates/metadata/README.md")
    },
    {
      path: "paper_releases/templates/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/reviews/.gitkeep")
    },
    {
      path: "paper_releases/templates/archive/.gitkeep",
      policy: "managed",
      content: await templateText("paper_releases/templates/archive/.gitkeep")
    },
    {
      path: "scripts/release-paper/README.md",
      policy: "managed",
      content: await templateText("scripts/release-paper/README.md")
    },
    {
      path: "reports/paper/manuscript-ledger.csv",
      policy: "user-owned",
      content: await templateText("reports/paper/manuscript-ledger.csv")
    },
    {
      path: "reports/paper/templates/manuscript.yaml",
      policy: "managed",
      content: await templateText("reports/paper/templates/manuscript.yaml")
    },
    {
      path: "reports/paper/templates/paper-claim-map.csv",
      policy: "managed",
      content: await templateText("reports/paper/templates/paper-claim-map.csv")
    },
    {
      path: "reports/paper/templates/citation-map.csv",
      policy: "managed",
      content: await templateText("reports/paper/templates/citation-map.csv")
    },
    {
      path: "reports/paper/templates/asset-map.csv",
      policy: "managed",
      content: await templateText("reports/paper/templates/asset-map.csv")
    },
    {
      path: "reports/paper/templates/main.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/main.tex")
    },
    {
      path: "reports/paper/templates/sections/abstract.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/abstract.tex")
    },
    {
      path: "reports/paper/templates/sections/introduction.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/introduction.tex")
    },
    {
      path: "reports/paper/templates/sections/related-work.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/related-work.tex")
    },
    {
      path: "reports/paper/templates/sections/method.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/method.tex")
    },
    {
      path: "reports/paper/templates/sections/results.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/results.tex")
    },
    {
      path: "reports/paper/templates/sections/discussion.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/discussion.tex")
    },
    {
      path: "reports/paper/templates/sections/limitations.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/limitations.tex")
    },
    {
      path: "reports/paper/templates/sections/ethics-and-availability.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/ethics-and-availability.tex")
    },
    {
      path: "reports/paper/templates/sections/conclusion.tex",
      policy: "managed",
      content: await templateText("reports/paper/templates/sections/conclusion.tex")
    },
    {
      path: "reports/paper/templates/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("reports/paper/templates/reviews/.gitkeep")
    },
    {
      path: "reports/paper/templates/archive/.gitkeep",
      policy: "managed",
      content: await templateText("reports/paper/templates/archive/.gitkeep")
    },
    {
      path: "scripts/write-paper/README.md",
      policy: "managed",
      content: await templateText("scripts/write-paper/README.md")
    },
    {
      path: "paper_submissions/submission-ledger.csv",
      policy: "user-owned",
      content: await templateText("paper_submissions/submission-ledger.csv")
    },
    {
      path: "paper_submissions/templates/submission.yaml",
      policy: "managed",
      content: await templateText("paper_submissions/templates/submission.yaml")
    },
    {
      path: "paper_submissions/templates/cover-letter.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/cover-letter.md")
    },
    {
      path: "paper_submissions/templates/submission-checklist.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/submission-checklist.md")
    },
    {
      path: "paper_submissions/templates/submitted-version.lock",
      policy: "managed",
      content: await templateText("paper_submissions/templates/submitted-version.lock")
    },
    {
      path: "paper_submissions/templates/venue-system-notes.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/venue-system-notes.md")
    },
    {
      path: "paper_submissions/templates/correspondence/.gitkeep",
      policy: "managed",
      content: await templateText("paper_submissions/templates/correspondence/.gitkeep")
    },
    {
      path: "paper_submissions/templates/decisions/.gitkeep",
      policy: "managed",
      content: await templateText("paper_submissions/templates/decisions/.gitkeep")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/decision-letter.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/decision-letter.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/reviewer-comments.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/reviewer-comments.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/concern-map.csv",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/concern-map.csv")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/response-strategy.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/response-strategy.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/revision-plan.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/revision-plan.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/linked-work.csv",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/linked-work.csv")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/response-letter.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/response-letter.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/rebuttal.md",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/rebuttal.md")
    },
    {
      path: "paper_submissions/templates/review-rounds/r1/reviews/.gitkeep",
      policy: "managed",
      content: await templateText("paper_submissions/templates/review-rounds/r1/reviews/.gitkeep")
    },
    {
      path: "paper_submissions/templates/camera-ready/.gitkeep",
      policy: "managed",
      content: await templateText("paper_submissions/templates/camera-ready/.gitkeep")
    },
    {
      path: "paper_submissions/templates/archive/.gitkeep",
      policy: "managed",
      content: await templateText("paper_submissions/templates/archive/.gitkeep")
    },
    { path: "reports/paper/sota-survey.tex", policy: "managed", content: await templateText("reports/paper/sota-survey.tex") },
    { path: "artifacts/artifact-checklist.md", policy: "managed", content: await templateText("artifacts/artifact-checklist.md") },
    {
      path: "artifacts/badge-evidence-ledger.csv",
      policy: "managed",
      content: await templateText("artifacts/badge-evidence-ledger.csv")
    },
    {
      path: "experiments/campaigns/autonomous-campaign-template.md",
      policy: "managed",
      content: await templateText("experiments/campaigns/autonomous-campaign-template.md")
    },
    {
      path: "experiments/campaigns/frontier-results.tsv",
      policy: "managed",
      content: await templateText("experiments/campaigns/frontier-results.tsv")
    },
    { path: "repro_outputs/SUMMARY.md", policy: "user-owned", content: await templateText("repro_outputs/SUMMARY.md") },
    { path: "repro_outputs/COMMANDS.md", policy: "user-owned", content: await templateText("repro_outputs/COMMANDS.md") },
    { path: "repro_outputs/LOG.md", policy: "user-owned", content: await templateText("repro_outputs/LOG.md") },
    { path: "repro_outputs/PATCHES.md", policy: "user-owned", content: await templateText("repro_outputs/PATCHES.md") },
    { path: "repro_outputs/status.json", policy: "user-owned", content: await templateText("repro_outputs/status.json") },
    {
      path: "docs/agent/mcp-client-setup.md",
      policy: "managed",
      content: await templateText("docs/agent/mcp-client-setup.md")
    },
    { path: "scripts/README.md", policy: "managed", content: await templateText("scripts/README.md") },
    { path: "docs/agent/capability-profile.md", policy: "generated", content: renderCapabilityProfile(state) },
    { path: "docs/agent/mcp-setup.md", policy: "generated", content: renderMcpSetup(state) },
    { path: join("docs/agent/generated", snippet.fileName), policy: "generated", content: snippet.content }
  ];
}

async function templateText(relativePath: string): Promise<string> {
  return readFile(join(templateRoot, relativePath), "utf8");
}

async function generatedPackageSpec(data: GeneratedPackageJson, preserveExistingSpec: boolean): Promise<string> {
  const existingSpec = data.devDependencies?.["create-academic-research"];
  return (
    process.env.CREATE_ACADEMIC_RESEARCH_PACKAGE_SPEC ??
    (preserveExistingSpec ? existingSpec : undefined) ??
    (await currentPackageVersion())
  );
}

function generatedPackageJson(data: GeneratedPackageJson, slug: string, packageSpec: string): GeneratedPackageJson {
  return {
    ...data,
    name: slug,
    scripts: {
      ...(data.scripts ?? {}),
      ...generatedLifecycleScripts(packageSpec)
    },
    devDependencies: {
      ...(data.devDependencies ?? {}),
      "create-academic-research": packageSpec
    }
  };
}

function generatedLifecycleScripts(packageSpec: string): Record<string, string> {
  const command = `npm exec --yes --package=${lifecyclePackageSpec(packageSpec)} -- academic-research`;
  const latestCommand = "npm exec --yes --package=create-academic-research@latest -- academic-research";
  return {
    doctor: `${command} doctor`,
    update: `${latestCommand} update`,
    setup: `${command} setup`,
    "workflow:literature": `${command} workflow literature`,
    "workflow:survey": `${command} workflow survey`,
    "workflow:agenda": `${command} workflow agenda`,
    "workflow:contribution": `${command} workflow contribution`,
    "workflow:analysis": `${command} workflow analysis`,
    "workflow:frame": `${command} workflow frame`,
    "workflow:release": `${command} workflow release`,
    "workflow:manuscript": `${command} workflow manuscript`,
    "workflow:submission": `${command} workflow submission`,
    "workflow:response": `${command} workflow response`,
    rename: `${command} rename`,
    "agents:list": `${command} agents list`,
    "skills:install": `${command} skills install`,
    "skills:list": `${command} skills list`,
    "skills:status": `${command} skills status`,
    "skills:presets": `${command} skills presets`,
    "skills:remove": `${command} skills remove`,
    "skills:uninstall": `${command} skills uninstall`,
    "skills:update": `${command} skills update`,
    "mcp:list": `${command} mcp list`,
    "mcp:modes": `${command} mcp modes`,
    "mcp:status": `${command} mcp status`,
    "mcp:enabled": `${command} mcp enabled`,
    "mcp:available": `${command} mcp available`,
    "mcp:commands": `${command} mcp commands`,
    "mcp:env": `${command} mcp env`,
    "mcp:dotenv": `${command} mcp env --write .env.example --all`,
    "mcp:enable": `${command} mcp enable`,
    "mcp:disable": `${command} mcp disable`,
    "mcp:setup": `${command} mcp setup`,
    "mcp:client:add": `${command} mcp client add`,
    "mcp:client:remove": `${command} mcp client remove`,
    "mcp:install": `${command} mcp install`,
    "mcp:uninstall": `${command} mcp uninstall`,
    "mcp:smoke": `${command} mcp smoke`,
    "mcp:doctor": `${command} mcp doctor`,
    "mcp:probe": `${command} mcp probe`
  };
}

function lifecyclePackageSpec(packageSpec: string): string {
  if (packageSpec === "create-academic-research" || packageSpec.startsWith("create-academic-research@")) {
    return packageSpec;
  }
  if (/^(file:|github:|git[+:]|https?:)/.test(packageSpec) || packageSpec.includes("/")) {
    return packageSpec;
  }
  return `create-academic-research@${packageSpec}`;
}

async function writeGeneratedGitignore(root: string, options: { overwrite?: boolean } = {}): Promise<void> {
  const source = join(root, "_gitignore");
  if (await exists(source)) {
    const target = join(root, ".gitignore");
    if (options.overwrite !== false || !(await exists(target))) {
      await writeFile(target, await readFile(source, "utf8"), "utf8");
    }
    await rm(source);
  }
}

async function currentPackageVersion(): Promise<string> {
  const packageJson = await readJson<PackageJson>(join(packageRoot, "package.json"));
  if (!packageJson.version) {
    throw new Error("package.json missing version");
  }
  return packageJson.version;
}

async function readProjectConfig(root: string): Promise<ProjectConfig> {
  return YAML.parse(await readFile(join(root, "configs/default.yaml"), "utf8")) as ProjectConfig;
}

function withWorkflowDefaults(config: ProjectConfig): ProjectConfig {
  const currentWorkflow =
    typeof config.workflow === "object" && config.workflow !== null ? config.workflow : {};
  const currentStages = Array.isArray(currentWorkflow.available_stages)
    ? currentWorkflow.available_stages.filter((stage): stage is string => typeof stage === "string")
    : [];
  const mergedStages = [...currentStages];
  for (const stage of REQUIRED_WORKFLOW_STAGES) {
    if (!mergedStages.includes(stage)) mergedStages.push(stage);
  }
  const currentPaths =
    typeof config.paths === "object" && config.paths !== null ? config.paths : {};
  return {
    ...config,
    workflow: {
      ...currentWorkflow,
      active_stage:
        typeof currentWorkflow.active_stage === "string"
          ? currentWorkflow.active_stage
          : "source-ingestion",
      available_stages: mergedStages
    },
    paths: {
      ...REQUIRED_PROJECT_PATHS,
      ...currentPaths
    }
  };
}

async function updateManagedCapabilityFiles(
  root: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  const state = await readCapabilities(root);
  await stageTextWrite(root, "docs/agent/capability-profile.md", renderCapabilityProfile(state), options);
  await stageTextWrite(root, "docs/agent/mcp-setup.md", renderMcpSetup(state), options);
  const snippet = renderMcpSnippet(state);
  await stageTextWrite(root, join("docs/agent/generated", snippet.fileName), snippet.content, options);
}

async function stageTextWrite(
  root: string,
  relativePath: string,
  content: string,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  const path = join(root, relativePath);
  let current: string | undefined;
  try {
    current = await readFile(path, "utf8");
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
  if (current === content) return;
  options.changes.push({ path: toPosix(relativePath), action: current === undefined ? "create" : "update" });
  if (!options.apply) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function writeManagedFileManifest(root: string): Promise<void> {
  const specs = await managedFileSpecs(root);
  const manifest = emptyManagedFileManifest(await currentPackageVersion());
  for (const spec of specs) {
    manifest.files[toPosix(spec.path)] = managedRecordForWrittenFile(spec);
  }
  await mkdir(dirname(managedManifestPath(root)), { recursive: true });
  await writeFile(managedManifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function readManagedFileManifest(root: string): Promise<ManagedFileManifest | undefined> {
  try {
    const parsed = JSON.parse(await readFile(managedManifestPath(root), "utf8")) as unknown;
    return normalizeManagedFileManifest(parsed);
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

async function stageManagedFiles(
  root: string,
  specs: ManagedFileSpec[],
  manifest: ManagedFileManifest | undefined,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<ManagedFileManifest> {
  const nextManifest = manifest
    ? cloneManagedFileManifest(manifest)
    : emptyManagedFileManifest(await currentPackageVersion());
  nextManifest.generator = {
    name: "create-academic-research",
    version: await currentPackageVersion(),
    updated_at: manifest?.generator.updated_at ?? nextManifest.generator.updated_at
  };

  for (const spec of specs) {
    const relativePath = toPosix(spec.path);
    const path = join(root, relativePath);
    const current = await readOptionalText(path);
    const currentChecksum = current === undefined ? undefined : checksumText(current);
    const existing = manifest?.files[relativePath];
    const generatedChecksum = checksumText(spec.content);

    if (spec.trackOnly) {
      if (current !== undefined) {
        nextManifest.files[relativePath] = stableManagedRecord(existing, {
          path: relativePath,
          policy: spec.policy,
          generated_checksum: generatedChecksum,
          baseline_checksum: currentChecksum
        });
      }
      continue;
    }

    if (current === spec.content) {
      nextManifest.files[relativePath] = stableManagedRecord(existing, {
        path: relativePath,
        policy: spec.policy,
        generated_checksum: generatedChecksum,
        baseline_checksum: generatedChecksum
      });
      continue;
    }

    if (current === undefined) {
      options.changes.push({ path: relativePath, action: "create" });
      if (options.apply) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, spec.content, "utf8");
      }
      nextManifest.files[relativePath] = stableManagedRecord(existing, managedRecordCandidateForWrittenFile(spec));
      continue;
    }

    if (spec.mergeSafe || canSafelyUpdateManagedFile(existing, currentChecksum)) {
      options.changes.push({ path: relativePath, action: "update" });
      if (options.apply) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, spec.content, "utf8");
      }
      nextManifest.files[relativePath] = stableManagedRecord(existing, managedRecordCandidateForWrittenFile(spec));
      continue;
    }

    if (isUnchangedSkippedManagedRecord(existing, currentChecksum, generatedChecksum)) {
      nextManifest.files[relativePath] = existing;
      continue;
    }
    const reason = skippedManagedRecordReason(existing, manifest !== undefined, currentChecksum);
    options.changes.push({ path: relativePath, action: "skip", reason });
    nextManifest.files[relativePath] = stableManagedRecord(existing, {
      path: relativePath,
      policy: spec.policy,
      generated_checksum: generatedChecksum,
      current_checksum: currentChecksum,
      reason
    });
  }

  return nextManifest;
}

async function stageManagedManifest(
  root: string,
  previous: ManagedFileManifest | undefined,
  next: ManagedFileManifest,
  options: { apply: boolean; changes: ProjectFileChange[] }
): Promise<void> {
  if (previous && managedManifestSemanticallyEqual(previous, next)) return;
  next.generator = {
    name: "create-academic-research",
    version: await currentPackageVersion(),
    updated_at: nowIso()
  };
  const content = `${JSON.stringify(next, null, 2)}\n`;
  const current = await readOptionalText(managedManifestPath(root));
  options.changes.push({
    path: ".academic-research/managed-files.json",
    action: previous ? "update" : "create"
  });
  if (options.apply && current !== content) {
    await mkdir(dirname(managedManifestPath(root)), { recursive: true });
    await writeFile(managedManifestPath(root), content, "utf8");
  }
}

function emptyManagedFileManifest(version: string): ManagedFileManifest {
  return {
    version: 1,
    generator: {
      name: "create-academic-research",
      version,
      updated_at: nowIso()
    },
    files: {}
  };
}

function normalizeManagedFileManifest(value: unknown): ManagedFileManifest {
  const record = typeof value === "object" && value !== null ? value as Partial<ManagedFileManifest> : {};
  const generator =
    typeof record.generator === "object" && record.generator !== null
      ? record.generator as Record<string, unknown>
      : {};
  const files =
    typeof record.files === "object" && record.files !== null
      ? record.files as Record<string, ManagedFileRecord>
      : {};
  return {
    version: 1,
    generator: {
      name: "create-academic-research",
      version: typeof generator.version === "string" ? generator.version : "unknown",
      updated_at: typeof generator.updated_at === "string" ? generator.updated_at : nowIso()
    },
    files
  };
}

function cloneManagedFileManifest(manifest: ManagedFileManifest): ManagedFileManifest {
  return {
    version: 1,
    generator: { ...manifest.generator },
    files: Object.fromEntries(
      Object.entries(manifest.files).map(([path, record]) => [path, { ...record }])
    )
  };
}

function managedRecordForWrittenFile(spec: ManagedFileSpec): ManagedFileRecord {
  return {
    ...managedRecordCandidateForWrittenFile(spec),
    updated_at: nowIso()
  };
}

function managedRecordCandidateForWrittenFile(spec: ManagedFileSpec): ManagedFileRecord {
  const generatedChecksum = checksumText(spec.content);
  return {
    path: toPosix(spec.path),
    policy: spec.policy,
    generated_checksum: generatedChecksum,
    baseline_checksum: generatedChecksum
  };
}

function stableManagedRecord(
  existing: ManagedFileRecord | undefined,
  candidate: ManagedFileRecord
): ManagedFileRecord {
  if (existing && managedRecordSemanticallyEqual(existing, candidate)) return existing;
  return { ...candidate, updated_at: nowIso() };
}

function isUnchangedSkippedManagedRecord(
  record: ManagedFileRecord | undefined,
  currentChecksum: string | undefined,
  generatedChecksum: string
): record is ManagedFileRecord {
  return Boolean(
    record?.reason &&
      record.current_checksum === currentChecksum &&
      record.generated_checksum === generatedChecksum
  );
}

function skippedManagedRecordReason(
  existing: ManagedFileRecord | undefined,
  hasManifest: boolean,
  currentChecksum: string | undefined
): string {
  if (existing?.reason && existing.current_checksum === currentChecksum) return existing.reason;
  return hasManifest ? "local edits detected" : "unknown legacy content";
}

function managedManifestSemanticallyEqual(
  left: ManagedFileManifest,
  right: ManagedFileManifest
): boolean {
  if (left.version !== right.version) return false;
  if (left.generator.name !== right.generator.name) return false;
  if (left.generator.version !== right.generator.version) return false;
  const leftPaths = Object.keys(left.files).sort();
  const rightPaths = Object.keys(right.files).sort();
  if (leftPaths.length !== rightPaths.length) return false;
  for (let index = 0; index < leftPaths.length; index += 1) {
    const path = leftPaths[index];
    if (path !== rightPaths[index]) return false;
    if (!managedRecordSemanticallyEqual(left.files[path], right.files[path])) return false;
  }
  return true;
}

function managedRecordSemanticallyEqual(
  left: ManagedFileRecord,
  right: ManagedFileRecord
): boolean {
  return (
    left.path === right.path &&
    left.policy === right.policy &&
    left.generated_checksum === right.generated_checksum &&
    left.baseline_checksum === right.baseline_checksum &&
    left.current_checksum === right.current_checksum &&
    left.reason === right.reason
  );
}

function canSafelyUpdateManagedFile(record: ManagedFileRecord | undefined, currentChecksum: string | undefined): boolean {
  if (!record || !currentChecksum) return false;
  return currentChecksum === record.baseline_checksum || currentChecksum === record.generated_checksum;
}

async function readOptionalText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

function managedManifestPath(root: string): string {
  return join(root, ".academic-research", "managed-files.json");
}

function checksumText(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function copyDirectoryMissing(source: string, target: string): Promise<Set<string>> {
  const created = new Set<string>();

  async function copyChildren(sourceDir: string, targetDir: string): Promise<void> {
    await mkdir(targetDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "__pycache__") continue;
      const sourcePath = join(sourceDir, entry.name);
      const targetPath = join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await copyChildren(sourcePath, targetPath);
        continue;
      }
      if (await exists(targetPath)) continue;
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
      created.add(toPosix(relative(target, targetPath)));
    }
  }

  await copyChildren(source, target);
  return created;
}

async function writeAgentStack(root: string): Promise<void> {
  await writeFile(join(root, "configs/agent-stack.yaml"), YAML.stringify(AGENT_STACK), "utf8");
}

async function validatePackageContract(root: string, errors: string[], warnings: string[]): Promise<void> {
  const path = join(root, "package.json");
  if (!(await exists(path))) return;
  let data: GeneratedPackageJson;
  try {
    data = await readJson<GeneratedPackageJson>(path);
  } catch (error) {
    errors.push(`invalid package.json: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const packageSpec = data.devDependencies?.["create-academic-research"] ?? (await currentPackageVersion());
  const expectedScripts = generatedLifecycleScripts(packageSpec);
  for (const [name, expected] of Object.entries(expectedScripts)) {
    const actual = data.scripts?.[name];
    if (!actual) {
      warnings.push(`package.json missing lifecycle script: ${name}`);
      continue;
    }
    if (isStaleLifecycleCommand(actual)) {
      errors.push(`package.json script ${name} uses stale academic-research invocation`);
      continue;
    }
    if (actual !== expected) {
      warnings.push(`package.json script ${name} differs from the current managed command`);
    }
  }
  const current = await currentPackageVersion();
  if (isOlderSimpleVersion(packageSpec, current)) {
    warnings.push(
      `create-academic-research ${packageSpec} is older than ${current}; run npm run update -- --apply or npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply`
    );
  }
}

async function validateManagedManifestDrift(root: string, warnings: string[]): Promise<void> {
  let specs: ManagedFileSpec[];
  try {
    specs = await managedFileSpecs(root);
  } catch {
    return;
  }
  const manifest = await readManagedFileManifest(root);
  if (!manifest) {
    warnings.push(
      "managed-file manifest is missing; run npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply"
    );
  }
  for (const spec of specs) {
    if (spec.trackOnly) continue;
    if (spec.path === "package.json") continue;
    const relativePath = toPosix(spec.path);
    const current = await readOptionalText(join(root, relativePath));
    if (current === undefined) {
      warnings.push(`${relativePath} is missing; run npm run update -- --apply`);
      continue;
    }
    if (current === spec.content) continue;
    const checksum = checksumText(current);
    const record = manifest?.files[relativePath];
    if (isUnchangedSkippedManagedRecord(record, checksum, checksumText(spec.content))) continue;
    if (canSafelyUpdateManagedFile(record, checksum)) {
      warnings.push(`${relativePath} is not current; run npm run update -- --apply`);
    } else {
      warnings.push(`${relativePath} has local edits; run npm run update to preview managed changes`);
    }
  }
}

async function warnIfTextDrift(
  root: string,
  relativePath: string,
  expected: string,
  warning: string,
  warnings: string[]
): Promise<void> {
  try {
    const actual = await readFile(join(root, relativePath), "utf8");
    if (actual !== expected) warnings.push(warning);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}

async function validateStaleCommandReferences(root: string, warnings: string[]): Promise<void> {
  const docs = [
    "README.md",
    "docs/getting-started.md",
    "docs/agent/capability-profile.md",
    "docs/agent/mcp-client-setup.md",
    "docs/agent/mcp-setup.md",
    "scripts/README.md"
  ];
  for (const relativePath of docs) {
    try {
      const text = await readFile(join(root, relativePath), "utf8");
      if (containsStaleCommandReference(text)) {
        warnings.push(`stale command reference in ${relativePath}; prefer project npm scripts`);
      }
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }
}

function containsStaleCommandReference(text: string): boolean {
  return (
    /\bnpx\s+academic-research\b/.test(text) ||
    /(^|[`(>\s])academic-research\s+(doctor|setup|rename|agents|skills|mcp)\b/.test(text)
  );
}

function isStaleLifecycleCommand(command: string): boolean {
  return /^academic-research\s+/.test(command) || /\bnpx\s+academic-research\b/.test(command);
}

function isOlderSimpleVersion(left: string, right: string): boolean {
  const leftParts = parseSimpleVersion(left);
  const rightParts = parseSimpleVersion(right);
  if (!leftParts || !rightParts) return false;
  for (let index = 0; index < rightParts.length; index += 1) {
    if (leftParts[index] < rightParts[index]) return true;
    if (leftParts[index] > rightParts[index]) return false;
  }
  return false;
}

function parseSimpleVersion(value: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function assertKnownPreset(preset: string): string {
  if (!AGENT_STACK.presets[preset]) {
    throw new Error(
      `unknown capability preset: ${preset}. Expected one of: ${Object.keys(AGENT_STACK.presets).join(", ")}`
    );
  }
  return preset;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function envHasValue(env: NodeJS.ProcessEnv, name: string): boolean {
  return typeof env[name] === "string" && env[name] !== "";
}

function toPosix(value: string): string {
  return value.split(/[\\/]/).join("/");
}

async function validateCsvHeader(
  root: string,
  relative: string,
  requiredColumns: string[],
  errors: string[]
): Promise<void> {
  await validateDelimitedHeader(root, relative, requiredColumns, ",", errors);
}

function validateWorkflowConfig(config: ProjectConfig, errors: string[]): void {
  const workflow =
    typeof config.workflow === "object" && config.workflow !== null ? config.workflow : undefined;
  if (!workflow) {
    errors.push("configs/default.yaml missing workflow");
    return;
  }
  const stages = Array.isArray(workflow.available_stages)
    ? new Set(workflow.available_stages.filter((stage): stage is string => typeof stage === "string"))
    : undefined;
  if (!stages) {
    errors.push("configs/default.yaml missing workflow.available_stages");
  } else {
    for (const stage of REQUIRED_WORKFLOW_STAGES) {
      if (!stages.has(stage)) errors.push(`configs/default.yaml missing workflow.available_stages ${stage}`);
    }
  }
  const paths = typeof config.paths === "object" && config.paths !== null ? config.paths : undefined;
  if (!paths) {
    errors.push("configs/default.yaml missing paths");
    return;
  }
  for (const key of Object.keys(REQUIRED_PROJECT_PATHS)) {
    if (typeof paths[key] !== "string" || paths[key].trim() === "") {
      errors.push(`configs/default.yaml missing paths.${key}`);
    }
  }
}

async function validateDelimitedHeader(
  root: string,
  relative: string,
  requiredColumns: string[],
  delimiter: string,
  errors: string[]
): Promise<void> {
  const path = join(root, relative);
  if (!(await exists(path))) return;
  const header = (await readFile(path, "utf8")).split(/\r?\n/, 1)[0] ?? "";
  const columns = new Set(header.split(delimiter).map((column) => column.trim()).filter(Boolean));
  for (const column of requiredColumns) {
    if (!columns.has(column)) errors.push(`${relative} missing column ${column}`);
  }
}

async function validateYamlRequiredPaths(
  root: string,
  relative: string,
  requiredPaths: string[],
  errors: string[]
): Promise<void> {
  const path = join(root, relative);
  if (!(await exists(path))) return;
  let parsed: unknown;
  try {
    parsed = YAML.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    errors.push(`invalid ${relative}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  for (const requiredPath of requiredPaths) {
    if (!hasObjectPath(parsed, requiredPath)) errors.push(`${relative} missing ${requiredPath}`);
  }
}

function hasObjectPath(value: unknown, dottedPath: string): boolean {
  let current = value;
  for (const segment of dottedPath.split(".")) {
    if (typeof current !== "object" || current === null || !Object.hasOwn(current, segment)) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
}

async function validateMarkdownTableHeader(
  root: string,
  relative: string,
  requiredColumns: string[],
  errors: string[]
): Promise<void> {
  const path = join(root, relative);
  if (!(await exists(path))) return;
  const content = await readFile(path, "utf8");
  const header = firstMarkdownTableHeader(content);
  if (!header) {
    errors.push(`${relative} missing markdown table header`);
    return;
  }
  const columns = new Set(header);
  for (const column of requiredColumns) {
    if (!columns.has(column)) errors.push(`${relative} missing table column ${column}`);
  }
}

function firstMarkdownTableHeader(content: string): string[] | undefined {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = markdownTableCells(lines[index]);
    const separator = markdownTableCells(lines[index + 1]);
    if (header.length === 0 || separator.length === 0) continue;
    if (separator.every((cell) => /^:?-{3,}:?$/.test(cell))) return header;
  }
  return undefined;
}

function markdownTableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim()).filter(Boolean);
}
