# Epic 0 Master Workflow Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the repository-level workflow contracts that let a generated project describe the full end-to-end research pipeline before the later workflow folders are implemented.

**Architecture:** Keep Epic 0 focused on stable contracts, starter docs, default workflow config, compliance profile registry, managed-file tracking, and doctor validation. Preserve `configs/default.yaml` as user-owned by adding a conservative merge for missing workflow/path keys instead of overwriting local project configuration. Do not implement survey, agenda, contribution, analysis, frame, release, submission, or response directories yet.

**Tech Stack:** TypeScript ESM generator, YAML config, Markdown templates, CSV/YAML starter files, Node test runner, `npm run build`, `npm test -- tests/create.test.mjs`, `npm run lint`.

---

## Scope Boundary

Epic 0 implements only the master contracts and readiness docs.

It does not add:

- `survey/`
- `research_agenda/`
- `contributions/`
- `paper_frames/`
- `paper_releases/`
- `paper_submissions/`
- workflow commands beyond the current `workflow:literature`
- operational doctor skill-readiness checks
- companion skill repository changes

Those belong to later epics. Epic 0 may name the future stages and describe their contracts.

## Canonical Workflow Stages

Use this exact ordered list in config, docs, tests, and doctor checks:

```ts
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
```

## Canonical Path Registry

Use these exact path keys in `configs/default.yaml`:

```yaml
paths:
  sources: sources
  sota: sota
  survey: survey
  research_agenda: research_agenda
  contributions: contributions
  paper_frames: paper_frames
  paper_releases: paper_releases
  paper_submissions: paper_submissions
  reports: reports
  compliance: compliance
  wiki: wiki
  experiments: experiments
  outputs: outputs
```

---

## File Structure

Create these files:

- `template/docs/agent/skill-readiness.md`: required academic research skills, recommended Superpowers, install/readiness modes.
- `template/docs/agent/research-workflow.md`: full source-to-response workflow map and stage handoffs.
- `template/docs/agent/review-loop.md`: universal review, fix, re-review, clean-final gate.
- `template/docs/agent/workflow-prompts/README.md`: prompt command model and future prompt files.
- `template/compliance/profiles.yaml`: inactive but documented compliance profile registry.
- `template/compliance/README.md`: human explanation of badges versus compliance profiles.

Modify these files:

- `template/configs/default.yaml`: add `workflow` and full `paths` registry.
- `template/AGENTS.md`: route agents through the expanded workflow.
- `template/README.md`: list the full scaffold contract and new docs.
- `template/docs/getting-started.md`: first-session path and workflow docs.
- `template/docs/agent/project-quality.md`: add iterative loop, clean-final rule, and new work zones.
- `template/docs/agent/output-contracts.md`: add future stage zones and promotion rules.
- `src/project.ts`: workflow defaults, config merge, managed-file specs, required files, doctor config checks.
- `tests/create.test.mjs`: creation, doctor, and update migration assertions.

---

## Task 1: Add Failing Creation Assertions

**Files:**

- Modify: `tests/create.test.mjs`

- [ ] **Step 1: Extend the main createProject test with workflow config assertions**

In `createProject generates a personalized research project without global side effects`, after the existing `config.project.*` assertions, add:

```js
  assert.equal(config.workflow.active_stage, "source-ingestion");
  assert.deepEqual(config.workflow.available_stages, [
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
```

- [ ] **Step 2: Extend the main createProject test with new file assertions**

After the existing `docs/agent/project-quality.md` and `docs/agent/output-contracts.md` checks, add:

```js
  await stat(join(target, "docs/agent/skill-readiness.md"));
  await stat(join(target, "docs/agent/research-workflow.md"));
  await stat(join(target, "docs/agent/review-loop.md"));
  await stat(join(target, "docs/agent/workflow-prompts/README.md"));
  await stat(join(target, "compliance/profiles.yaml"));
  await stat(join(target, "compliance/README.md"));
```

- [ ] **Step 3: Assert new managed-file policies**

After the existing manifest policy assertions, add:

```js
  assert.equal(manifest.files["docs/agent/skill-readiness.md"].policy, "managed");
  assert.equal(manifest.files["docs/agent/research-workflow.md"].policy, "managed");
  assert.equal(manifest.files["docs/agent/review-loop.md"].policy, "managed");
  assert.equal(manifest.files["docs/agent/workflow-prompts/README.md"].policy, "managed");
  assert.equal(manifest.files["compliance/profiles.yaml"].policy, "managed");
  assert.equal(manifest.files["compliance/README.md"].policy, "managed");
```

- [ ] **Step 4: Assert document content markers**

After the existing `projectQuality` and `outputContracts` assertions, add:

```js
  assert.match(projectQuality, /Universal Review Loop/);
  assert.match(projectQuality, /Final Clean-Copy Gate/);
  assert.match(projectQuality, /paper_submissions\//);
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
```

- [ ] **Step 5: Run the focused test and verify it fails**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: FAIL with missing `config.workflow`, missing new files, or missing manifest entries.

---

## Task 2: Add Failing Doctor And Migration Assertions

**Files:**

- Modify: `tests/create.test.mjs`

- [ ] **Step 1: Extend the broken doctor test**

In `doctorProject reports broken configs and research ledger headers`, after removing `.env.example`, add:

```js
  await rm(join(target, "docs/agent/research-workflow.md"));
  await rm(join(target, "compliance/profiles.yaml"));
```

Then after the existing missing-file assertions, add:

```js
  assert.ok(result.errors.some((error) => error.includes("missing docs/agent/research-workflow.md")));
  assert.ok(result.errors.some((error) => error.includes("missing compliance/profiles.yaml")));
```

- [ ] **Step 2: Add a doctor test for incomplete workflow config**

Create this new test after `doctorProject reports broken configs and research ledger headers`:

```js
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
  config.workflow.available_stages = config.workflow.available_stages.filter((stage) => stage !== "response");
  delete config.paths.paper_submissions;
  await writeFile(configPath, YAML.stringify(config), "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("configs/default.yaml missing workflow.available_stages response")));
  assert.ok(result.errors.some((error) => error.includes("configs/default.yaml missing paths.paper_submissions")));
});
```

- [ ] **Step 3: Add a conservative config migration test**

Create this new test after `updateProject applies unchanged managed files and skips locally edited managed files`:

```js
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
```

- [ ] **Step 4: Run the focused tests and verify they fail**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: FAIL because `doctorProject` and `updateProject` do not yet validate or merge the workflow config and new docs.

---

## Task 3: Update The Template Config

**Files:**

- Modify: `template/configs/default.yaml`

- [ ] **Step 1: Replace the config with the expanded workflow registry**

Use this exact content:

```yaml
project:
  slug: academic-research-project
  title: Academic Research Project
  profile: academic-general
  package: project_package

workflow:
  active_stage: source-ingestion
  available_stages:
    - source-ingestion
    - sota
    - survey
    - research-agenda
    - contribution
    - analysis
    - paper-framing
    - paper-release
    - manuscript
    - submission
    - response

paths:
  sources: sources
  sota: sota
  survey: survey
  research_agenda: research_agenda
  contributions: contributions
  paper_frames: paper_frames
  paper_releases: paper_releases
  paper_submissions: paper_submissions
  reports: reports
  compliance: compliance
  wiki: wiki
  experiments: experiments
  outputs: outputs

run:
  seed: 42
```

- [ ] **Step 2: Run the focused tests**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: creation assertions for config begin passing; new docs and doctor assertions still fail.

---

## Task 4: Add Master Contract Template Files

**Files:**

- Create: `template/docs/agent/skill-readiness.md`
- Create: `template/docs/agent/research-workflow.md`
- Create: `template/docs/agent/review-loop.md`
- Create: `template/docs/agent/workflow-prompts/README.md`
- Create: `template/compliance/profiles.yaml`
- Create: `template/compliance/README.md`

- [ ] **Step 1: Create `template/docs/agent/skill-readiness.md`**

Use sections:

```md
# Skill Readiness

Academic research skills are required for the intended end-to-end agentic research workflow.

## Required Research Skills

Install the project-local academic research skill package before running serious workflow stages.

## Recommended Engineering Skills

Superpowers is the recommended complementary skill family for implementation planning, TDD, debugging, verification, and execution discipline.

## Readiness Modes

- Structural readiness validates scaffold files and schemas.
- Operational readiness validates the agentic workflow substrate, including required project-local skills.

## Commands

Use:

`npm run skills:install`
`npm run skills:status`
`npm run doctor`

## Missing Skills

If required academic skills are missing, stop agent-driven research execution and install them before continuing.
```

- [ ] **Step 2: Create `template/docs/agent/research-workflow.md`**

Use sections:

```md
# Research Workflow

The project workflow is:

source ingestion -> SOTA -> survey -> research agenda -> contribution packages -> analysis / experiment / artifact subworkflows -> paper framing -> paper release + manuscript -> submission -> response/revision

## Stage Contracts

Each stage has a contract, expected inputs, expected outputs, review state, and handoff target.

## Claim Promotion

Claims move through source evidence, SOTA claim ledgers, survey claims, agenda opportunities, contribution claim maps, analysis bundles, paper frames, manuscript claim maps, and response/revision evidence.

## New Sources

New late-stage citations return to source ingestion, bibliography normalization, SOTA linkage, and claim audit before they enter manuscript or response text.

## Submission And Response

Cover letters, decision letters, reviewer comments, rebuttals, response letters, and revision plans are communication artifacts. Reviewer-requested new scientific work belongs in contribution packages and analysis bundles, then is linked from the response package.
```

- [ ] **Step 3: Create `template/docs/agent/review-loop.md`**

Use sections:

```md
# Review Loop

Every substantial artifact uses:

contract -> outline -> partial draft or analysis slice -> adversarial review -> fix -> re-review

## Stop Rule

The loop stops only when the latest review has no blocker or major issue and no meaningful cleanup issue remains.

## Final Clean-Copy Gate

Final artifacts must not contain stale alternatives, old table references, obsolete figures, contradictory claims, unresolved review notes, unresolved insertion markers, or visible iteration residue.

## Review History

Review history belongs in `reviews/`, response folders, or archives, not in final artifacts.

## Severity

- blocker: invalid evidence, false claim, broken provenance, wrong method, stale output, duplicate citation, or contradiction.
- major: weak framing, incomplete analysis, missing limitation, unclear logic, or unconvincing direction.
- minor: local clarity, wording, formatting, or non-blocking detail.
- cosmetic: polish only.
```

- [ ] **Step 4: Create `template/docs/agent/workflow-prompts/README.md`**

Use sections:

```md
# Prompt-Level Workflow Commands

Prompt-level workflow commands are the agent-facing entrypoints. They are Markdown playbooks that tell an agent how to execute a research stage.

## Relationship To npm Workflow Commands

`npm run workflow:<stage>` is a preflight and routing command. It reports project state, required files, missing prerequisites, required skills, and next commands.

The prompt file tells the agent how to perform the stage using skills, ledgers, review loops, and handoff gates.

## Planned Prompt Files

- `literature.md`
- `survey.md`
- `agenda.md`
- `contribution.md`
- `analysis.md`
- `frame.md`
- `release.md`
- `manuscript.md`
- `submission.md`
- `response.md`
- `full-research-loop.md`

## Rule

The portable Markdown prompt is the source of truth. Agent-specific slash commands may wrap these files but must not diverge from them.
```

- [ ] **Step 5: Create `template/compliance/profiles.yaml`**

Use this exact starter registry:

```yaml
version: 1
active_profiles: []
profiles:
  acm-artifact-review:
    status: available
    applies_to: code, data, models, benchmarks, systems, reproducibility packages
    evidence_file: compliance/acm-artifact-review.md
  usenix-artifact-evaluation:
    status: available
    applies_to: venue-specific artifact evaluation
    evidence_file: compliance/acm-artifact-review.md
  sigplan-acm-artifact-evaluation:
    status: available
    applies_to: SIGPLAN and ACM artifact evaluation variants
    evidence_file: compliance/acm-artifact-review.md
  cos-open-science-badges:
    status: available
    applies_to: open data, open materials, preregistration
    evidence_file: compliance/open-practice-badges.md
  osf-open-practice-resource-badges:
    status: available
    applies_to: data, analytic code, materials, papers, supplements
    evidence_file: compliance/open-practice-badges.md
  top-transparency:
    status: available
    applies_to: transparency and reproducibility standards
    evidence_file: compliance/top-transparency.md
  venue-reproducibility-checklist:
    status: available
    applies_to: venue-year submission checklists
    evidence_file: compliance/venue-checklist.md
  method-reporting-standards:
    status: available
    applies_to: evaluation methods, threats to validity, statistical reporting
    evidence_file: compliance/method-reporting.md
  survey-reporting:
    status: available
    applies_to: systematic, scoping, or meta-analytic reviews
    evidence_file: compliance/survey-reporting.md
  dataset-metadata:
    status: available
    applies_to: dataset releases and FAIR metadata
    evidence_file: compliance/dataset-metadata.md
  ai-model-release:
    status: available
    applies_to: model, checkpoint, inference code, training code, and provenance releases
    evidence_file: compliance/ai-model-release.md
```

- [ ] **Step 6: Create `template/compliance/README.md`**

Use sections:

```md
# Compliance Profiles

Badges are external labels. Compliance profiles are local evidence contracts.

Use `profiles.yaml` to declare which profiles are active for the project, a contribution package, a paper frame, or a paper release.

Do not claim badge readiness because a directory exists. Badge readiness requires current evidence paths, validation status, and final review sign-off.

The project-level registry lists available profiles. Later workflow layers select the profiles that apply to their actual contribution type and target venue.
```

- [ ] **Step 7: Run the focused tests**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: new file assertions begin passing; manifest and doctor assertions still fail until `src/project.ts` is updated.

---

## Task 5: Update Existing Template Docs

**Files:**

- Modify: `template/AGENTS.md`
- Modify: `template/README.md`
- Modify: `template/docs/getting-started.md`
- Modify: `template/docs/agent/project-quality.md`
- Modify: `template/docs/agent/output-contracts.md`

- [ ] **Step 1: Update `template/AGENTS.md`**

Add the full workflow to `## Standard Workflow`:

```md
For multi-stage research, preserve this order unless the user explicitly narrows the task:

source ingestion -> SOTA -> survey -> research agenda -> contribution -> analysis -> paper framing -> paper release + manuscript -> submission -> response/revision
```

Add first-read entries:

```md
8. `docs/agent/research-workflow.md`
9. `docs/agent/review-loop.md`
10. `docs/agent/skill-readiness.md`
```

- [ ] **Step 2: Update `template/README.md`**

Add these core folder bullets:

```md
- `compliance/`: project-level badge, open-science, method-reporting, survey-reporting, dataset, model-release, and venue checklist profile registry.
- Future workflow layers: `survey/`, `research_agenda/`, `contributions/`, `paper_frames/`, `paper_releases/`, and `paper_submissions/` are introduced by later scaffold workflow epics and governed by `docs/agent/research-workflow.md`.
```

Add these command mentions near the agent capability command block:

```bash
npm run workflow:literature
```

Keep only `workflow:literature` in Epic 0 because later stage commands are implemented in a later epic.

- [ ] **Step 3: Update `template/docs/getting-started.md`**

After the paragraph that asks users to read `docs/agent/project-quality.md`, add:

```md
Also read:

- `docs/agent/research-workflow.md`
- `docs/agent/review-loop.md`
- `docs/agent/skill-readiness.md`
- `docs/agent/workflow-prompts/README.md`
- `compliance/README.md`
```

- [ ] **Step 4: Update `template/docs/agent/project-quality.md`**

Add sections named exactly:

```md
## Universal Review Loop

Substantial artifacts repeat contract -> outline -> partial draft or analysis slice -> adversarial review -> fix -> re-review until no blocker or major issue remains.

## Final Clean-Copy Gate

Final artifacts must not contain draft residue, stale tables, stale figures, unsupported claims, contradictory claims, unresolved notes, or obsolete alternatives.
```

Extend `Clean Work Zones` with:

```md
- `survey/`: survey contracts, outlines, section plans, claims, drafts, final survey artifacts, and reviews.
- `research_agenda/`: opportunity ledgers, direction records, final agenda artifacts, and reviews.
- `contributions/`: contribution packages, claim maps, component outputs, badge plans, compliance files, reports, and reviews.
- `paper_frames/`: frame contracts, selected contributions, evidence maps, venue fit, badge fit, compliance fit, release plans, outlines, and decisions.
- `paper_releases/`: materialized paper-specific release packages, source maps, locks, checksums, metadata, and release reviews.
- `paper_submissions/`: cover letters, submitted snapshots, decision letters, reviewer comments, response letters, rebuttals, revision plans, and private correspondence.
- `compliance/`: project-level compliance profile registry and evidence files.
```

- [ ] **Step 5: Update `template/docs/agent/output-contracts.md`**

Add the same future workflow zones and state:

```md
`paper_submissions/` is private communication state. New reviewer-requested scientific work belongs in `contributions/` and analysis bundles, not in rebuttal folders.
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: content marker assertions pass once `src/project.ts` tracks the new files.

---

## Task 6: Implement Workflow Defaults And Doctor Checks

**Files:**

- Modify: `src/project.ts`

- [ ] **Step 1: Add workflow constants near `REQUIRED_TSV_COLUMNS`**

Add:

```ts
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
```

- [ ] **Step 2: Add a conservative config merge helper**

Add below `readProjectConfig`:

```ts
function withWorkflowDefaults(config: ProjectConfig): ProjectConfig {
  const currentWorkflow =
    typeof config.workflow === "object" && config.workflow !== null
      ? (config.workflow as Record<string, unknown>)
      : {};
  const currentStages = Array.isArray(currentWorkflow.available_stages)
    ? currentWorkflow.available_stages.filter((stage): stage is string => typeof stage === "string")
    : [];
  const mergedStages = [...currentStages];
  for (const stage of REQUIRED_WORKFLOW_STAGES) {
    if (!mergedStages.includes(stage)) mergedStages.push(stage);
  }
  const currentPaths =
    typeof config.paths === "object" && config.paths !== null
      ? (config.paths as Record<string, unknown>)
      : {};
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
```

- [ ] **Step 3: Use the helper in `personalizeProject`**

Change:

```ts
  const config = YAML.parse(await readFile(configPath, "utf8")) as ProjectConfig;
```

to:

```ts
  const config = withWorkflowDefaults(YAML.parse(await readFile(configPath, "utf8")) as ProjectConfig);
```

- [ ] **Step 4: Use the helper in `personalizeInitializedProject`**

Before writing `configs/default.yaml` when created, set:

```ts
    config = withWorkflowDefaults(config);
```

Then keep the existing project field replacement.

- [ ] **Step 5: Add a staged config updater**

Add this function near `updateGeneratedPackageJson`:

```ts
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
```

- [ ] **Step 6: Call the staged config updater in `updateProject`**

In `updateProject`, before `const specs = await managedFileSpecs(target);`, add:

```ts
  await updateProjectConfigDefaults(target, { apply: options.apply === true, changes });
```

- [ ] **Step 7: Add new managed file specs**

In `managedFileSpecs`, after `project-quality.md`, add:

```ts
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
      path: "compliance/profiles.yaml",
      policy: "managed",
      content: await templateText("compliance/profiles.yaml")
    },
    {
      path: "compliance/README.md",
      policy: "managed",
      content: await templateText("compliance/README.md")
    },
```

- [ ] **Step 8: Add new required doctor files**

In the `required` array in `doctorProject`, add:

```ts
    "docs/agent/skill-readiness.md",
    "docs/agent/research-workflow.md",
    "docs/agent/review-loop.md",
    "docs/agent/workflow-prompts/README.md",
    "compliance/profiles.yaml",
    "compliance/README.md",
```

- [ ] **Step 9: Validate workflow config in `doctorProject`**

Inside the existing `if (await exists(join(target, "configs/default.yaml")))` parse block, after the `project.package` checks, add:

```ts
      validateWorkflowConfig(config, errors);
```

Add this helper near `validateDelimitedHeader`:

```ts
function validateWorkflowConfig(config: ProjectConfig, errors: string[]): void {
  const workflow =
    typeof config.workflow === "object" && config.workflow !== null
      ? (config.workflow as Record<string, unknown>)
      : undefined;
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
  const paths =
    typeof config.paths === "object" && config.paths !== null
      ? (config.paths as Record<string, unknown>)
      : undefined;
  if (!paths) {
    errors.push("configs/default.yaml missing paths");
    return;
  }
  for (const key of Object.keys(REQUIRED_PROJECT_PATHS)) {
    if (typeof paths[key] !== "string" || (paths[key] as string).trim() === "") {
      errors.push(`configs/default.yaml missing paths.${key}`);
    }
  }
}
```

- [ ] **Step 10: Run focused tests**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: creation, doctor, update migration tests pass or fail only because template docs still need small wording adjustments.

---

## Task 7: Update Documentation Markers And Re-Run Tests

**Files:**

- Modify any files from Task 5 that fail content marker assertions.

- [ ] **Step 1: Run the focused test**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with `OK: create-academic-research validated`.

- [ ] **Step 3: Run full tests if focused tests pass**

Run:

```bash
npm test
```

Expected: PASS.

---

## Task 8: Epic 0 Self-Review And Stale-State Review

**Files:**

- Read: `docs/superpowers/specs/2026-06-08-research-workflow-transformation-design.md`
- Read: `docs/superpowers/plans/2026-06-08-research-workflow-transformation-master-plan.md`
- Read: `docs/superpowers/plans/2026-06-08-epic-0-master-workflow-contracts-implementation-plan.md`

- [ ] **Step 1: Search for forbidden draft marker text in new templates**

Run:

```bash
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/docs/agent template/compliance
```

Expected: no matches.

- [ ] **Step 2: Confirm no unsupported later-epic directories were added**

Run:

```bash
test ! -d template/survey && test ! -d template/research_agenda && test ! -d template/contributions && test ! -d template/paper_frames && test ! -d template/paper_releases && test ! -d template/paper_submissions
```

Expected: exit 0.

- [ ] **Step 3: Confirm generated projects expose the contract but not fake workflow commands**

Run:

```bash
npm test -- tests/create.test.mjs
```

Expected: PASS. The generated package should still contain only `workflow:literature` until Epic 12 adds the rest.

- [ ] **Step 4: Review changed files**

Run:

```bash
git diff -- template/configs/default.yaml template/AGENTS.md template/README.md template/docs/getting-started.md template/docs/agent/project-quality.md template/docs/agent/output-contracts.md src/project.ts tests/create.test.mjs
```

Expected: diff only contains Epic 0 contract, config, doctor, and test changes.

- [ ] **Step 5: Record residual scope intentionally deferred**

Add a final note in the implementation summary, not in template files:

```text
Deferred by design: stage directories, stage workflow commands, operational skill-readiness doctor checks, and companion skill repo changes.
```

---

## Acceptance Criteria

Epic 0 is complete when all of these are true:

- A new project includes `docs/agent/skill-readiness.md`.
- A new project includes `docs/agent/research-workflow.md`.
- A new project includes `docs/agent/review-loop.md`.
- A new project includes `docs/agent/workflow-prompts/README.md`.
- A new project includes `compliance/profiles.yaml`.
- A new project includes `compliance/README.md`.
- `configs/default.yaml` has workflow stages through `response`.
- `configs/default.yaml` has the canonical path registry.
- `doctorProject` reports missing new contract files.
- `doctorProject` reports incomplete workflow config.
- `updateProject` can add missing workflow/path defaults without overwriting local project fields.
- Managed-file manifest tracks new stable contract files as `managed`.
- `npm test -- tests/create.test.mjs` passes.
- `npm run lint` passes.
- `npm test` passes.

## Self-Review Notes

Spec coverage:

- Master workflow contracts: covered by Tasks 3, 4, and 5.
- Skill readiness doc: covered by Task 4.
- Review-loop doc: covered by Task 4.
- Compliance profile registry: covered by Task 4.
- Doctor validation: covered by Task 6.
- Update/migration behavior: covered by Tasks 2 and 6.
- Managed/user-owned boundary: covered by Task 6 conservative config merge and manifest assertions.

No later epic is implemented in this plan. This is deliberate because later workflow directories and commands need separate failing tests and implementation plans.
