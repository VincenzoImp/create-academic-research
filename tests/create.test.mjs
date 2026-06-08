import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import YAML from "yaml";

import { createProject, doctorProject, initProject, renameProject, updateProject } from "../dist/src/project.js";

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
  assert.equal(config.workflow?.active_stage, "source-ingestion");
  assert.deepEqual(config.workflow?.available_stages, [
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
  ]);
  assert.equal(config.paths.sources, "sources");
  assert.equal(config.paths.sota, "sota");
  assert.equal(config.paths.survey, "survey");
  assert.equal(config.paths.research_agenda, "research_agenda");
  assert.equal(config.paths.contributions, "contributions");
  assert.equal(config.paths.paper_frames, "paper_frames");
  assert.equal(config.paths.paper_releases, "paper_releases");
  assert.equal(config.paths.paper_submissions, "paper_submissions");
  assert.equal(config.paths.reports, "reports");
  assert.equal(config.paths.compliance, "compliance");
  assert.equal(config.paths.wiki, "wiki");
  assert.equal(capabilities.scope, "project-local");
  assert.equal(capabilities.agent, "universal");
  assert.deepEqual(capabilities.mcp_servers, ["arxiv"]);
  assert.equal(packageJson.name, "paper-project");
  assert.equal(packageJson.devDependencies["create-academic-research"], packageVersion);
  assert.match(packageJson.scripts.update, /--package=create-academic-research@latest -- academic-research update$/);
  assert.match(
    packageJson.scripts.doctor,
    new RegExp(`--package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research doctor$`)
  );
  assert.match(pyproject, /name = "paper-project"/);
  assert.match(readme, /^# Paper Project/);
  await stat(join(target, "src/paper_project/__init__.py"));
  await stat(join(target, "docs/agent/generated/mcp.json"));
  const manifest = JSON.parse(await readFile(join(target, ".academic-research/managed-files.json"), "utf8"));
  assert.equal(manifest.generator.name, "create-academic-research");
  assert.equal(manifest.generator.version, packageVersion);
  assert.equal(manifest.files[".env.example"].policy, "managed");
  assert.equal(manifest.files["docs/agent/generated/mcp.json"].policy, "generated");
  assert.equal(manifest.files["wiki/log.md"].policy, "append-only");
  assert.equal(manifest.files["README.md"].policy, "user-owned");
  assert.equal(manifest.files["docs/agent/repo-migration-playbook.md"].policy, "user-owned");
  assert.equal(manifest.files["docs/agent/skill-readiness.md"]?.policy, "managed");
  assert.equal(manifest.files["docs/agent/research-workflow.md"]?.policy, "managed");
  assert.equal(manifest.files["docs/agent/review-loop.md"]?.policy, "managed");
  assert.equal(manifest.files["docs/agent/workflow-prompts/README.md"]?.policy, "managed");
  assert.equal(manifest.files["compliance/profiles.yaml"]?.policy, "managed");
  assert.equal(manifest.files["compliance/README.md"]?.policy, "managed");
  assert.equal(manifest.files["contributions/contribution-ledger.csv"]?.policy, "user-owned");
  assert.equal(manifest.files["contributions/templates/contribution.yaml"]?.policy, "managed");
  assert.equal(manifest.files["docs/reproducibility/commands.md"].policy, "user-owned");
  assert.equal(manifest.files["analysis_outputs/claim-audit.md"].policy, "user-owned");
  assert.equal(manifest.files["repro_outputs/SUMMARY.md"].policy, "user-owned");
  assert.doesNotMatch(JSON.stringify(manifest), /secret|token|api[_-]?key|cookie|session/i);
  await stat(join(target, ".gitignore"));
  await assert.rejects(stat(join(target, "_gitignore")));
  await stat(join(target, ".env.example"));
  await stat(join(target, "docs/getting-started.md"));
  await stat(join(target, "docs/agent/mcp-client-setup.md"));
  await stat(join(target, "docs/agent/repo-migration-playbook.md"));
  await stat(join(target, "docs/agent/project-quality.md"));
  await stat(join(target, "docs/agent/skill-readiness.md"));
  await stat(join(target, "docs/agent/research-workflow.md"));
  await stat(join(target, "docs/agent/review-loop.md"));
  await stat(join(target, "docs/agent/workflow-prompts/README.md"));
  await stat(join(target, "compliance/profiles.yaml"));
  await stat(join(target, "compliance/README.md"));
  await stat(join(target, "docs/reproducibility/commands.md"));
  await stat(join(target, "analysis_outputs/claim-audit.md"));
  await stat(join(target, "repro_outputs/SUMMARY.md"));
  await stat(join(target, "repro_outputs/COMMANDS.md"));
  await stat(join(target, "repro_outputs/LOG.md"));
  await stat(join(target, "repro_outputs/PATCHES.md"));
  await stat(join(target, "repro_outputs/status.json"));
  await stat(join(target, "sources/markdown-linear/.gitkeep"));
  await stat(join(target, "sources/zotero/README.md"));
  await stat(join(target, "sources/zotero/import-log.csv"));
  await stat(join(target, "sources/zotero/collection-map.csv"));
  await stat(join(target, "sota/paper-syntheses/.gitkeep"));
  await stat(join(target, "sota/reading-log.csv"));
  await stat(join(target, "sota/citation-chasing-log.csv"));
  await stat(join(target, "sota/sota-claim-ledger.csv"));
  await stat(join(target, "sota/promotion-rules.md"));
  await stat(join(target, "survey/survey-contract.md"));
  await stat(join(target, "survey/outline.md"));
  await stat(join(target, "survey/section-plans/.gitkeep"));
  await stat(join(target, "survey/drafts/.gitkeep"));
  await stat(join(target, "survey/final/.gitkeep"));
  await stat(join(target, "survey/reviews/.gitkeep"));
  await stat(join(target, "survey/compliance/README.md"));
  await stat(join(target, "survey/survey-claim-ledger.csv"));
  await stat(join(target, "research_agenda/agenda-contract.md"));
  await stat(join(target, "research_agenda/opportunity-ledger.csv"));
  await stat(join(target, "research_agenda/directions/.gitkeep"));
  await stat(join(target, "research_agenda/final/.gitkeep"));
  await stat(join(target, "research_agenda/reviews/.gitkeep"));
  await stat(join(target, "contributions/contribution-ledger.csv"));
  await stat(join(target, "contributions/templates/contribution.yaml"));
  await stat(join(target, "contributions/templates/README.md"));
  await stat(join(target, "contributions/templates/claim-map.md"));
  await stat(join(target, "contributions/templates/badge-plan.md"));
  await stat(join(target, "contributions/templates/compliance/profiles.yaml"));
  await stat(join(target, "contributions/templates/components/.gitkeep"));
  await stat(join(target, "contributions/templates/inputs/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/data/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/tables/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/figures/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/models/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/software/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/artifacts/.gitkeep"));
  await stat(join(target, "contributions/templates/report.md"));
  await stat(join(target, "contributions/templates/paper-export/.gitkeep"));
  await stat(join(target, "contributions/templates/reviews/.gitkeep"));
  await stat(join(target, "contributions/templates/archive/.gitkeep"));
  await stat(join(target, "reports/paper/sota-survey.tex"));
  await stat(join(target, "artifacts/badge-evidence-ledger.csv"));
  await stat(join(target, "experiments/campaigns/autonomous-campaign-template.md"));
  await stat(join(target, "experiments/campaigns/frontier-results.tsv"));
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
  const literatureMatrix = await readFile(join(target, "sota/literature-matrix.csv"), "utf8");
  assert.match(literatureMatrix, /role/);
  assert.match(literatureMatrix, /full_text_status/);
  assert.match(literatureMatrix, /reading_status/);
  assert.match(literatureMatrix, /synthesis_path/);
  assert.match(literatureMatrix, /bib_key/);
  assert.match(literatureMatrix, /claim_ids/);
  assert.match(literatureMatrix, /evidence_strength/);
  assert.match(literatureMatrix, /downstream_status/);
  const sotaClaimLedger = await readFile(join(target, "sota/sota-claim-ledger.csv"), "utf8");
  assert.match(
    sotaClaimLedger,
    /^claim_id,claim_text,source_ids,bib_keys,evidence_strength,allowed_wording,forbidden_stronger_wording,method_context,limitations,contradictions,downstream_status,downstream_targets,unresolved_risks,review_status,last_checked,notes/m
  );
  const promotionRules = await readFile(join(target, "sota/promotion-rules.md"), "utf8");
  assert.match(promotionRules, /Claim Promotion Gate/);
  assert.match(promotionRules, /allowed wording/);
  const surveyClaimLedger = await readFile(join(target, "survey/survey-claim-ledger.csv"), "utf8");
  assert.match(
    surveyClaimLedger,
    /^survey_claim_id,sota_claim_ids,section_id,claim_text,source_ids,evidence_strength,synthesis_role,allowed_wording,limitations,contradictions,review_status,downstream_status,notes/m
  );
  const surveyContract = await readFile(join(target, "survey/survey-contract.md"), "utf8");
  assert.match(surveyContract, /Survey Mode/);
  assert.match(surveyContract, /narrative \| systematic \| scoping \| meta-analysis \| mixed/);
  assert.match(surveyContract, /Section-By-Section Drafting/);
  const opportunityLedger = await readFile(join(target, "research_agenda/opportunity-ledger.csv"), "utf8");
  assert.match(
    opportunityLedger,
    /^opportunity_id,title,evidence_summary,source_gap_ids,sota_claim_ids,survey_claim_ids,nearest_prior_work,method_or_experiment_idea,feasibility,expected_contribution,failure_condition,risks,cost,priority,publishability,ethical_or_release_constraints,decision,decision_rationale,review_status,next_step,notes/m
  );
  const agendaContract = await readFile(join(target, "research_agenda/agenda-contract.md"), "utf8");
  assert.match(agendaContract, /Agenda Review Gate/);
  assert.match(agendaContract, /novelty, feasibility, evidence, publishability, and ethical\/release constraints/);
  const contributionLedger = await readFile(join(target, "contributions/contribution-ledger.csv"), "utf8");
  assert.match(
    contributionLedger,
    /^contribution_id,title,type,agenda_opportunity_ids,status,primary_claim_ids,source_ids,sota_claim_ids,survey_claim_ids,analysis_ids,experiment_ids,artifact_paths,output_data_paths,output_table_paths,output_figure_paths,badge_targets,compliance_profiles,report_path,claim_map_path,badge_plan_path,review_status,clean_copy_status,supersession_status,next_step,notes/m
  );
  const contributionManifest = YAML.parse(await readFile(join(target, "contributions/templates/contribution.yaml"), "utf8"));
  assert.equal(contributionManifest.contribution.status, "planned");
  assert.deepEqual(contributionManifest.outputs.tables, []);
  assert.deepEqual(contributionManifest.badge_targets, []);
  const contributionReport = await readFile(join(target, "contributions/templates/report.md"), "utf8");
  assert.match(contributionReport, /Generated Outputs/);
  assert.match(contributionReport, /Do not rewrite numeric truth/);
  const sourceLedger = await readFile(join(target, "sources/source-ledger.csv"), "utf8");
  assert.match(sourceLedger, /discovery_source/);
  assert.match(sourceLedger, /zotero_item_key/);
  assert.match(sourceLedger, /zotero_attachment_path/);
  const citationAudit = await readFile(join(target, "sources/bib/citation-audit.csv"), "utf8");
  assert.match(citationAudit, /zotero_item_key/);
  assert.match(citationAudit, /zotero_exported_bib_key/);
  assert.match(citationAudit, /reconciliation_status/);
  const zoteroImportLog = await readFile(join(target, "sources/zotero/import-log.csv"), "utf8");
  assert.match(
    zoteroImportLog,
    /^import_id,imported_on,zotero_collection_key,zotero_collection_name,zotero_item_key,zotero_item_type,title,attachment_path,exported_bib_key,source_id,reconciliation_status,notes/m
  );
  const zoteroCollectionMap = await readFile(join(target, "sources/zotero/collection-map.csv"), "utf8");
  assert.match(
    zoteroCollectionMap,
    /^collection_key,collection_name,zotero_parent_key,scope,source_set,status,last_imported_on,notes/m
  );
  const artifactChecklist = await readFile(join(target, "artifacts/artifact-checklist.md"), "utf8");
  assert.match(artifactChecklist, /ACM Artifact Review And Badging/);
  assert.match(artifactChecklist, /Artifacts Available/);
  assert.match(artifactChecklist, /Functional/);
  assert.match(artifactChecklist, /Reusable/);
  assert.match(artifactChecklist, /Results Reproduced/);
  const projectQuality = await readFile(join(target, "docs/agent/project-quality.md"), "utf8");
  assert.match(projectQuality, /Project Quality Contract/);
  assert.match(projectQuality, /Request Intake/);
  assert.match(projectQuality, /Trusted Outputs/);
  assert.match(projectQuality, /Project Hygiene Gate/);
  assert.match(projectQuality, /Badge Readiness/);
  assert.match(projectQuality, /Universal Review Loop/);
  assert.match(projectQuality, /Final Clean-Copy Gate/);
  assert.match(projectQuality, /paper_submissions\//);
  const outputContracts = await readFile(join(target, "docs/agent/output-contracts.md"), "utf8");
  assert.match(outputContracts, /Trust Levels/);
  assert.match(outputContracts, /Promotion Rules/);
  assert.match(outputContracts, /reports\/paper\/sota-survey\.tex/);
  assert.match(outputContracts, /artifacts\/badge-evidence-ledger\.csv/);
  assert.match(outputContracts, /Project Quality Contract/);
  assert.match(outputContracts, /survey\//);
  assert.match(outputContracts, /research_agenda\//);
  assert.match(outputContracts, /contributions\//);
  assert.match(outputContracts, /paper_frames\//);
  assert.match(outputContracts, /paper_releases\//);
  assert.match(outputContracts, /paper_submissions\//);
  assert.match(outputContracts, /compliance\//);
  const researchWorkflow = await readFile(join(target, "docs/agent/research-workflow.md"), "utf8");
  assert.match(researchWorkflow, /source ingestion -> SOTA -> survey -> research agenda/);
  assert.match(researchWorkflow, /submission -> response/);
  const skillReadiness = await readFile(join(target, "docs/agent/skill-readiness.md"), "utf8");
  assert.match(skillReadiness, /Academic research skills are required/);
  assert.match(skillReadiness, /Superpowers/);
  const workflowPromptReadme = await readFile(join(target, "docs/agent/workflow-prompts/README.md"), "utf8");
  assert.match(workflowPromptReadme, /Prompt-level workflow commands/);
  assert.match(workflowPromptReadme, /npm run workflow:<stage>/);
  const complianceProfiles = YAML.parse(await readFile(join(target, "compliance/profiles.yaml"), "utf8"));
  assert.equal(complianceProfiles.version, 1);
  assert.equal(complianceProfiles.profiles["acm-artifact-review"].status, "available");
  assert.equal(complianceProfiles.profiles["survey-reporting"].status, "available");
  const badgeEvidence = await readFile(join(target, "artifacts/badge-evidence-ledger.csv"), "utf8");
  assert.match(badgeEvidence, /badge_target/);
  assert.match(badgeEvidence, /evidence_path/);
  assert.match(badgeEvidence, /claim_or_result_id/);
  const campaignTemplate = await readFile(
    join(target, "experiments/campaigns/autonomous-campaign-template.md"),
    "utf8"
  );
  assert.match(campaignTemplate, /Mutability Envelope/);
  assert.match(campaignTemplate, /Frozen Harness/);
  assert.match(campaignTemplate, /Baseline Run/);
  assert.match(campaignTemplate, /Frontier Tracking/);
  assert.match(campaignTemplate, /keep, discard, crash/);
  const frontierResults = await readFile(
    join(target, "experiments/campaigns/frontier-results.tsv"),
    "utf8"
  );
  assert.match(frontierResults, /^run_id\tgit_commit\tmetric_value\tresource_value\tstatus\tdescription/m);
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
    if (scriptName === "update") {
      assert.equal(
        generatedCommand,
        "npm exec --yes --package=create-academic-research@latest -- academic-research update"
      );
      continue;
    }
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

test("built package bin files are executable for local file package installs", async () => {
  for (const binPath of [
    "dist/bin/academic-research.js",
    "dist/bin/create-academic-research.js"
  ]) {
    const info = await stat(join(packageRoot, binPath));
    assert.notEqual(info.mode & 0o111, 0, `${binPath} should be executable`);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function rewriteManifestEntry(root, relativePath, content) {
  const manifestPath = join(root, ".academic-research/managed-files.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files[relativePath].generated_checksum = `sha256:${sha256(content)}`;
  manifest.files[relativePath].baseline_checksum = `sha256:${sha256(content)}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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
  await mkdir(join(target, "sources/zotero"), { recursive: true });
  await writeFile(join(target, "sources/zotero/import-log.csv"), "import_id,zotero_item_key\n", "utf8");
  await writeFile(join(target, "sota/sota-claim-ledger.csv"), "claim_id,claim_text\n", "utf8");
  await mkdir(join(target, "survey"), { recursive: true });
  await writeFile(join(target, "survey/survey-claim-ledger.csv"), "survey_claim_id,claim_text\n", "utf8");
  await mkdir(join(target, "research_agenda"), { recursive: true });
  await writeFile(join(target, "research_agenda/opportunity-ledger.csv"), "opportunity_id,title\n", "utf8");
  await mkdir(join(target, "contributions/templates"), { recursive: true });
  await writeFile(join(target, "contributions/contribution-ledger.csv"), "contribution_id,title\n", "utf8");
  await writeFile(join(target, "contributions/templates/contribution.yaml"), "contribution: [\n", "utf8");
  await writeFile(join(target, "experiments/campaigns/frontier-results.tsv"), "run_id\tstatus\n", "utf8");
  await rm(join(target, "wiki/templates/source-page.md"));
  await rm(join(target, ".env.example"));
  await rm(join(target, "docs/agent/research-workflow.md"), { force: true });
  await rm(join(target, "compliance/profiles.yaml"), { force: true });

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("invalid configs/default.yaml")));
  assert.ok(result.errors.some((error) => error.includes("invalid configs/capabilities.yaml")));
  assert.ok(result.errors.some((error) => error.includes("sources/source-ledger.csv missing column type")));
  assert.ok(result.errors.some((error) => error.includes("sources/zotero/import-log.csv missing column imported_on")));
  assert.ok(result.errors.some((error) => error.includes("sota/sota-claim-ledger.csv missing column source_ids")));
  assert.ok(result.errors.some((error) => error.includes("survey/survey-claim-ledger.csv missing column sota_claim_ids")));
  assert.ok(result.errors.some((error) => error.includes("research_agenda/opportunity-ledger.csv missing column evidence_summary")));
  assert.ok(result.errors.some((error) => error.includes("contributions/contribution-ledger.csv missing column type")));
  assert.ok(result.errors.some((error) => error.includes("invalid contributions/templates/contribution.yaml")));
  assert.ok(result.errors.some((error) => error.includes("experiments/campaigns/frontier-results.tsv missing column git_commit")));
  assert.ok(result.errors.some((error) => error.includes("missing wiki/templates/source-page.md")));
  assert.ok(result.errors.some((error) => error.includes("missing .env.example")));
  assert.ok(result.errors.some((error) => error.includes("missing docs/agent/research-workflow.md")));
  assert.ok(result.errors.some((error) => error.includes("missing compliance/profiles.yaml")));
});

test("doctorProject reports incomplete workflow contract in default config", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-workflow-config-"));
  const target = join(root, "doctor-workflow-config-project");
  await createProject({
    target,
    title: "Doctor Workflow Config Project",
    preset: "minimal",
    installSkills: false
  });

  const configPath = join(target, "configs/default.yaml");
  const config = YAML.parse(await readFile(configPath, "utf8"));
  config.workflow = {
    active_stage: "source-ingestion",
    available_stages: [
      "source-ingestion",
      "sota",
      "survey",
      "research-agenda",
      "contribution",
      "analysis",
      "paper-framing",
      "paper-release",
      "manuscript",
      "submission"
    ]
  };
  config.paths = {
    ...config.paths,
    survey: "survey",
    research_agenda: "research_agenda",
    contributions: "contributions",
    paper_frames: "paper_frames",
    paper_releases: "paper_releases",
    reports: "reports",
    compliance: "compliance",
    wiki: "wiki",
    experiments: "experiments",
    outputs: "outputs"
  };
  delete config.paths.paper_submissions;
  await writeFile(configPath, YAML.stringify(config), "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("configs/default.yaml missing workflow.available_stages response")));
  assert.ok(result.errors.some((error) => error.includes("configs/default.yaml missing paths.paper_submissions")));
});

test("doctorProject reports stale lifecycle commands and managed-file drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-stale-"));
  const target = join(root, "doctor-stale-project");
  await createProject({
    target,
    title: "Doctor Stale Project",
    preset: "minimal",
    installSkills: false
  });

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.doctor = "academic-research doctor";
  packageJson.scripts["mcp:env"] = "npx academic-research mcp env";
  packageJson.devDependencies["create-academic-research"] = "0.1.12";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  await writeFile(join(target, ".env.example"), "STALE=1\n", "utf8");
  await writeFile(join(target, "README.md"), "# Doctor Stale Project\n\nRun `npx academic-research doctor`.\n", "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("package.json script doctor uses stale")));
  assert.ok(result.errors.some((error) => error.includes("package.json script mcp:env uses stale")));
  assert.ok(result.warnings.some((warning) => warning.includes("create-academic-research 0.1.12 is older")));
  assert.ok(result.warnings.some((warning) => warning.includes("npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply")));
  assert.ok(result.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(result.warnings.some((warning) => warning.includes("stale command reference in README.md")));
});

test("doctorProject uses the managed manifest for drift warnings", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-manifest-"));
  const target = join(root, "doctor-manifest-project");
  await createProject({
    target,
    title: "Doctor Manifest Project",
    preset: "minimal",
    installSkills: false
  });

  await writeFile(join(target, ".env.example"), "LOCAL_EDIT=1\n", "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(result.warnings.some((warning) => warning.includes("npm run update")));
});

test("updateProject previews and applies only managed project files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-"));
  const target = join(root, "update-project");
  await createProject({
    target,
    title: "Update Project",
    preset: "minimal",
    installSkills: false
  });

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.doctor = "academic-research doctor";
  packageJson.scripts.update = "npm exec --yes --package=create-academic-research@0.1.12 -- academic-research update";
  packageJson.devDependencies["create-academic-research"] = "0.1.12";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const dryRun = await updateProject(target, { apply: false });

  assert.equal(dryRun.applied, false);
  assert.deepEqual(
    dryRun.changes.map((change) => change.path).sort(),
    ["package.json"].sort()
  );
  assert.equal(JSON.parse(await readFile(packagePath, "utf8")).scripts.doctor, "academic-research doctor");

  const applied = await updateProject(target, { apply: true });
  const updatedPackage = JSON.parse(await readFile(packagePath, "utf8"));
  const result = await doctorProject(target);

  assert.equal(applied.applied, true);
  assert.equal(updatedPackage.devDependencies["create-academic-research"], packageVersion);
  assert.equal(
    updatedPackage.scripts.update,
    "npm exec --yes --package=create-academic-research@latest -- academic-research update"
  );
  assert.match(
    updatedPackage.scripts.doctor,
    new RegExp(`^npm exec --yes --package=create-academic-research@${escapeRegExp(packageVersion)} -- academic-research doctor$`)
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("updateProject apply is idempotent for a clean generated project", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-idempotent-"));
  const target = join(root, "update-idempotent-project");
  await createProject({
    target,
    title: "Update Idempotent Project",
    preset: "minimal",
    installSkills: false
  });

  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const result = await updateProject(target, { apply: true });
  const after = await readFile(manifestPath, "utf8");

  assert.equal(result.applied, true);
  assert.deepEqual(result.changes, []);
  assert.equal(after, before);
});

test("updateProject applies unchanged managed files and skips locally edited managed files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-manifest-"));
  const target = join(root, "update-manifest-project");
  await createProject({
    target,
    title: "Update Manifest Project",
    preset: "minimal",
    installSkills: false
  });

  const envPath = join(target, ".env.example");
  const oldEnv = "OLD_GENERATED=1\n";
  await writeFile(envPath, oldEnv, "utf8");
  await rewriteManifestEntry(target, ".env.example", oldEnv);

  const setupPath = join(target, "docs/agent/mcp-setup.md");
  const locallyEdited = "local user edit\n";
  await writeFile(setupPath, locallyEdited, "utf8");

  const result = await updateProject(target, { apply: true });
  const envExample = await readFile(envPath, "utf8");
  const setup = await readFile(setupPath, "utf8");

  assert.ok(result.changes.some((change) => change.path === ".env.example" && change.action === "update"));
  assert.ok(
    result.changes.some(
      (change) => change.path === ".academic-research/managed-files.json" && change.action === "update"
    )
  );
  assert.ok(
    result.changes.some(
      (change) =>
        change.path === "docs/agent/mcp-setup.md" &&
        change.action === "skip" &&
        /local edits/.test(change.reason ?? "")
    )
  );
  assert.match(envExample, /^OPENALEX_API_KEY=/m);
  assert.equal(setup, locallyEdited);
});

test("updateProject adds missing workflow defaults to user-owned config without overwriting project fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-workflow-config-"));
  const target = join(root, "update-workflow-config-project");
  await createProject({
    target,
    title: "Update Workflow Config Project",
    slug: "update-workflow-config-project",
    packageName: "update_workflow_config_project",
    preset: "minimal",
    installSkills: false
  });

  const configPath = join(target, "configs/default.yaml");
  const config = YAML.parse(await readFile(configPath, "utf8"));
  delete config.workflow;
  config.paths.sources = "library/sources";
  delete config.paths.survey;
  delete config.paths.paper_submissions;
  config.paths.custom_local_path = "custom";
  config.project.title = "Locally Edited Title";
  await writeFile(configPath, YAML.stringify(config), "utf8");

  const dryRun = await updateProject(target, { apply: false });
  const stillOld = YAML.parse(await readFile(configPath, "utf8"));
  assert.ok(dryRun.changes.some((change) => change.path === "configs/default.yaml" && change.action === "update"));
  assert.equal(stillOld.workflow, undefined);
  assert.equal(stillOld.project.title, "Locally Edited Title");

  const applied = await updateProject(target, { apply: true });
  const updated = YAML.parse(await readFile(configPath, "utf8"));
  const doctor = await doctorProject(target);

  assert.ok(applied.changes.some((change) => change.path === "configs/default.yaml" && change.action === "update"));
  assert.equal(updated.project.title, "Locally Edited Title");
  assert.equal(updated.paths.sources, "library/sources");
  assert.equal(updated.paths.custom_local_path, "custom");
  assert.equal(updated.paths.survey, "survey");
  assert.equal(updated.paths.paper_submissions, "paper_submissions");
  assert.equal(updated.workflow.active_stage, "source-ingestion");
  assert.ok(updated.workflow.available_stages.includes("response"));
  assert.equal(doctor.ok, true);
});

test("updateProject adds missing Zotero ledgers and appends missing bibliography columns conservatively", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-zotero-contract-"));
  const target = join(root, "update-zotero-contract-project");
  await createProject({
    target,
    title: "Update Zotero Contract Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "sources/zotero"), { recursive: true, force: true });
  await writeFile(
    join(target, "sources/source-ledger.csv"),
    "source_id,type,title\ns1,paper,Existing Source\n",
    "utf8"
  );
  await writeFile(
    join(target, "sources/bib/citation-audit.csv"),
    "citation_key,status,issue\nsmith2024,ok,\n",
    "utf8"
  );

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "sources/zotero/import-log.csv" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "sources/source-ledger.csv" && change.action === "update"));

  await updateProject(target, { apply: true });
  const sourceLedger = await readFile(join(target, "sources/source-ledger.csv"), "utf8");
  const citationAudit = await readFile(join(target, "sources/bib/citation-audit.csv"), "utf8");
  const doctor = await doctorProject(target);

  assert.match(
    sourceLedger,
    /^source_id,type,title,authors,year,venue,identifiers,raw_path,derived_path,bib_path,status,relevance,evidence_level,quality_notes,added_on,last_checked,discovery_source,zotero_item_key,zotero_attachment_path,notes/m
  );
  assert.match(sourceLedger, /^s1,paper,Existing Source,/m);
  assert.match(
    citationAudit,
    /^citation_key,status,issue,source_id,claim_or_location,expected_fix,checked_on,zotero_item_key,zotero_exported_bib_key,reconciliation_status,notes/m
  );
  assert.match(citationAudit, /^smith2024,ok,/m);
  await stat(join(target, "sources/zotero/import-log.csv"));
  await stat(join(target, "sources/zotero/collection-map.csv"));
  assert.equal(doctor.ok, true);
});

test("updateProject adds SOTA promotion files and appends missing literature matrix columns", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-sota-promotion-"));
  const target = join(root, "update-sota-promotion-project");
  await createProject({
    target,
    title: "Update SOTA Promotion Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "sota/sota-claim-ledger.csv"), { force: true });
  await rm(join(target, "sota/promotion-rules.md"), { force: true });
  await writeFile(
    join(target, "sota/literature-matrix.csv"),
    "source_id,bib_key,role,title\ns1,smith2024,core,Existing Matrix Row\n",
    "utf8"
  );

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "sota/sota-claim-ledger.csv" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "sota/promotion-rules.md" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "sota/literature-matrix.csv" && change.action === "update"));

  await updateProject(target, { apply: true });
  const literatureMatrix = await readFile(join(target, "sota/literature-matrix.csv"), "utf8");
  const doctor = await doctorProject(target);

  assert.match(literatureMatrix, /claim_ids/);
  assert.match(literatureMatrix, /evidence_strength/);
  assert.match(literatureMatrix, /downstream_status/);
  assert.match(literatureMatrix, /^s1,smith2024,core,Existing Matrix Row,/m);
  await stat(join(target, "sota/sota-claim-ledger.csv"));
  await stat(join(target, "sota/promotion-rules.md"));
  assert.equal(doctor.ok, true);
});

test("updateProject adds survey workflow files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-survey-workflow-"));
  const target = join(root, "update-survey-workflow-project");
  await createProject({
    target,
    title: "Update Survey Workflow Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "survey"), { recursive: true, force: true });

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "survey/survey-contract.md" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "survey/survey-claim-ledger.csv" && change.action === "create"));

  await updateProject(target, { apply: true });
  const doctor = await doctorProject(target);

  await stat(join(target, "survey/survey-contract.md"));
  await stat(join(target, "survey/survey-claim-ledger.csv"));
  await stat(join(target, "survey/compliance/README.md"));
  assert.equal(doctor.ok, true);
});

test("updateProject adds research agenda workflow files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-agenda-workflow-"));
  const target = join(root, "update-agenda-workflow-project");
  await createProject({
    target,
    title: "Update Agenda Workflow Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "research_agenda"), { recursive: true, force: true });

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "research_agenda/agenda-contract.md" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "research_agenda/opportunity-ledger.csv" && change.action === "create"));

  await updateProject(target, { apply: true });
  const doctor = await doctorProject(target);

  await stat(join(target, "research_agenda/agenda-contract.md"));
  await stat(join(target, "research_agenda/opportunity-ledger.csv"));
  assert.equal(doctor.ok, true);
});

test("updateProject adds contribution package workflow files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-contribution-workflow-"));
  const target = join(root, "update-contribution-workflow-project");
  await createProject({
    target,
    title: "Update Contribution Workflow Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "contributions"), { recursive: true, force: true });

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "contributions/contribution-ledger.csv" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "contributions/templates/contribution.yaml" && change.action === "create"));

  await updateProject(target, { apply: true });
  const doctor = await doctorProject(target);

  await stat(join(target, "contributions/contribution-ledger.csv"));
  await stat(join(target, "contributions/templates/contribution.yaml"));
  assert.equal(doctor.ok, true);
});

test("updateProject migrates 0.1.17 projects to the 0.1.18 research contract", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-017-to-018-"));
  const target = join(root, "update-017-to-018-project");
  await createProject({
    target,
    title: "Update 017 To 018 Project",
    preset: "minimal",
    installSkills: false
  });

  const addedIn018 = [
    "analysis_outputs/claim-audit.md",
    "artifacts/badge-evidence-ledger.csv",
    "docs/agent/project-quality.md",
    "docs/agent/repo-migration-playbook.md",
    "docs/reproducibility/commands.md",
    "experiments/campaigns/autonomous-campaign-template.md",
    "experiments/campaigns/frontier-results.tsv",
    "reports/paper/sota-survey.tex",
    "repro_outputs/COMMANDS.md",
    "repro_outputs/LOG.md",
    "repro_outputs/PATCHES.md",
    "repro_outputs/SUMMARY.md",
    "repro_outputs/status.json",
    "sota/citation-chasing-log.csv",
    "sota/paper-syntheses/.gitkeep",
    "sota/reading-log.csv",
    "sources/markdown-linear/.gitkeep"
  ];

  for (const relative of addedIn018) {
    await rm(join(target, relative), { force: true });
  }

  const packagePath = join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.devDependencies["create-academic-research"] = "0.1.17";
  for (const [name, command] of Object.entries(packageJson.scripts)) {
    if (name !== "update") {
      packageJson.scripts[name] = command.replace(packageVersion, "0.1.17");
    }
  }
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  const manifestPath = join(target, ".academic-research/managed-files.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.generator.version = "0.1.17";
  for (const relative of addedIn018) {
    delete manifest.files[relative];
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const applied = await updateProject(target, { apply: true });
  const updatedPackage = JSON.parse(await readFile(packagePath, "utf8"));
  const updatedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const doctor = await doctorProject(target);
  const rootReadme = await readFile(join(packageRoot, "README.md"), "utf8");
  const templateReadme = await readFile(join(packageRoot, "template/README.md"), "utf8");

  for (const relative of addedIn018) {
    await stat(join(target, relative));
    assert.ok(applied.changes.some((change) => change.path === relative && change.action === "create"));
    assert.ok(updatedManifest.files[relative], `${relative} should be tracked after migration`);
  }

  assert.equal(updatedPackage.devDependencies["create-academic-research"], packageVersion);
  assert.equal(updatedManifest.generator.version, packageVersion);
  assert.equal(updatedManifest.files["analysis_outputs/claim-audit.md"].policy, "user-owned");
  assert.equal(updatedManifest.files["repro_outputs/SUMMARY.md"].policy, "user-owned");
  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.errors, []);
  assert.match(rootReadme, /0\.1\.17 -> 0\.1\.18/);
  assert.match(templateReadme, /0\.1\.17 -> 0\.1\.18/);
});

test("updateProject migrates legacy projects without a managed manifest conservatively", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-manifest-"));
  const target = join(root, "legacy-manifest-project");
  await createProject({
    target,
    title: "Legacy Manifest Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await rm(join(target, "docs/getting-started.md"), { force: true });

  const dryRun = await updateProject(target, { apply: false });
  await assert.rejects(stat(join(target, ".academic-research/managed-files.json")));

  const applied = await updateProject(target, { apply: true });
  const manifest = JSON.parse(await readFile(join(target, ".academic-research/managed-files.json"), "utf8"));
  const envExample = await readFile(join(target, ".env.example"), "utf8");

  assert.ok(dryRun.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.ok(applied.changes.some((change) => change.path === "docs/getting-started.md" && change.action === "create"));
  assert.ok(applied.changes.some((change) => change.path === ".env.example" && change.action === "skip"));
  assert.equal(envExample, "LEGACY_LOCAL=1\n");
  assert.equal(manifest.files["docs/getting-started.md"].policy, "managed");
  assert.doesNotMatch(JSON.stringify(manifest), /LEGACY_LOCAL|secret|token|api[_-]?key/i);
});

test("updateProject is idempotent after legacy migration with skipped files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-idempotent-"));
  const target = join(root, "legacy-idempotent-project");
  await createProject({
    target,
    title: "Legacy Idempotent Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await writeFile(join(target, "docs/agent/mcp-setup.md"), "LEGACY_SETUP=1\n", "utf8");

  const first = await updateProject(target, { apply: true });
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const before = await readFile(manifestPath, "utf8");
  const beforeManifest = JSON.parse(before);
  const second = await updateProject(target, { apply: true });
  const after = await readFile(manifestPath, "utf8");
  const doctor = await doctorProject(target);

  assert.ok(first.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.equal(beforeManifest.files[".env.example"].reason, "unknown legacy content");
  assert.equal(beforeManifest.files["docs/agent/mcp-setup.md"].reason, "unknown legacy content");
  assert.deepEqual(second.changes, []);
  assert.equal(after, before);
  assert.ok(!doctor.warnings.some((warning) => warning.includes(".env.example has local edits")));
  assert.ok(!doctor.warnings.some((warning) => warning.includes("docs/agent/mcp-setup.md has local edits")));
});

test("updateProject reclassifies only changed skipped legacy files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-legacy-edited-"));
  const target = join(root, "legacy-edited-project");
  await createProject({
    target,
    title: "Legacy Edited Project",
    preset: "minimal",
    installSkills: false
  });
  await rm(join(target, ".academic-research/managed-files.json"), { force: true });
  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=1\n", "utf8");
  await writeFile(join(target, "docs/agent/mcp-setup.md"), "LEGACY_SETUP=1\n", "utf8");

  await updateProject(target, { apply: true });
  const manifestPath = join(target, ".academic-research/managed-files.json");
  const beforeManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const unchangedSetupRecord = beforeManifest.files["docs/agent/mcp-setup.md"];

  await writeFile(join(target, ".env.example"), "LEGACY_LOCAL=2\n", "utf8");

  const result = await updateProject(target, { apply: true });
  const afterManifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.ok(
    result.changes.some(
      (change) =>
        change.path === ".env.example" &&
        change.action === "skip" &&
        change.reason === "local edits detected"
    )
  );
  assert.ok(result.changes.some((change) => change.path === ".academic-research/managed-files.json"));
  assert.ok(!result.changes.some((change) => change.path === "docs/agent/mcp-setup.md"));
  assert.equal(afterManifest.files[".env.example"].reason, "local edits detected");
  assert.deepEqual(afterManifest.files["docs/agent/mcp-setup.md"], unchangedSetupRecord);
});

test("initProject bootstraps an existing repository without overwriting local files", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-init-"));
  const target = join(root, "existing-repo");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "README.md"), "# Existing README\n", "utf8");
  await writeFile(join(target, ".gitignore"), "custom-ignore\n", "utf8");
  await writeFile(
    join(target, "package.json"),
    `${JSON.stringify({ name: "existing-repo", scripts: { test: "node --test" } }, null, 2)}\n`,
    "utf8"
  );

  const result = await initProject({
    target,
    title: "Existing Study",
    slug: "existing-study",
    packageName: "existing_study",
    preset: "minimal",
    installSkills: false
  });
  const readme = await readFile(join(target, "README.md"), "utf8");
  const gitignore = await readFile(join(target, ".gitignore"), "utf8");
  const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  const config = YAML.parse(await readFile(join(target, "configs/default.yaml"), "utf8"));
  const doctor = await doctorProject(target);

  assert.equal(result.slug, "existing-study");
  assert.equal(readme, "# Existing README\n");
  assert.equal(gitignore, "custom-ignore\n");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.scripts.doctor, /academic-research doctor$/);
  assert.equal(config.project.slug, "existing-study");
  assert.equal(config.project.package, "existing_study");
  await stat(join(target, "src/existing_study/__init__.py"));
  await assert.rejects(stat(join(target, "_gitignore")));
  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.errors, []);
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
