# Epic 5 Contribution Package Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contribution package workflow that turns accepted agenda opportunities into reviewed contribution records for analyses, experiments, artifacts, pipelines, datasets, software, benchmarks, systems, protocols, reproductions, replications, and negative results.

**Architecture:** Create `contributions/` as the bridge between agenda and paper frames. The project gets a contribution ledger, package templates, output subdirectories, claim and badge plans, compliance selection, a report template, doctor validation, lifecycle script, and `workflow contribution` routing. The command reports required inputs and next skills; it does not create scientific claims or infer contributions.

**Tech Stack:** TypeScript ESM CLI/generator, Markdown/CSV/YAML templates, Node test runner, `yaml` parser, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/contributions/contribution-ledger.csv`
- `template/contributions/templates/contribution.yaml`
- `template/contributions/templates/README.md`
- `template/contributions/templates/claim-map.md`
- `template/contributions/templates/badge-plan.md`
- `template/contributions/templates/compliance/profiles.yaml`
- `template/contributions/templates/components/.gitkeep`
- `template/contributions/templates/inputs/.gitkeep`
- `template/contributions/templates/outputs/data/.gitkeep`
- `template/contributions/templates/outputs/tables/.gitkeep`
- `template/contributions/templates/outputs/figures/.gitkeep`
- `template/contributions/templates/outputs/models/.gitkeep`
- `template/contributions/templates/outputs/software/.gitkeep`
- `template/contributions/templates/outputs/artifacts/.gitkeep`
- `template/contributions/templates/report.md`
- `template/contributions/templates/paper-export/.gitkeep`
- `template/contributions/templates/reviews/.gitkeep`
- `template/contributions/templates/archive/.gitkeep`

Modify:

- `src/project.ts`: contribution ledger headers, required files, YAML template validation, managed specs, generated lifecycle script.
- `src/cli.ts`: `workflow contribution` route and workflow help.
- `template/package.json`: add `workflow:contribution`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`, `template/docs/agent/project-quality.md`: document contribution packages as first-class.
- `template/tests/test_project_structure.py`: assert contribution scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] **Step 1: Add creation assertions**

Add path assertions in `tests/create.test.mjs`:

```js
  await stat(join(target, "contributions/contribution-ledger.csv"));
  await stat(join(target, "contributions/templates/contribution.yaml"));
  await stat(join(target, "contributions/templates/README.md"));
  await stat(join(target, "contributions/templates/claim-map.md"));
  await stat(join(target, "contributions/templates/badge-plan.md"));
  await stat(join(target, "contributions/templates/compliance/profiles.yaml"));
  await stat(join(target, "contributions/templates/outputs/data/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/tables/.gitkeep"));
  await stat(join(target, "contributions/templates/outputs/figures/.gitkeep"));
  await stat(join(target, "contributions/templates/report.md"));
  await stat(join(target, "contributions/templates/paper-export/.gitkeep"));
  await stat(join(target, "contributions/templates/reviews/.gitkeep"));
```

Assert ledger and manifest markers:

```js
  const contributionLedger = await readFile(join(target, "contributions/contribution-ledger.csv"), "utf8");
  assert.match(
    contributionLedger,
    /^contribution_id,title,type,agenda_opportunity_ids,status,primary_claim_ids,source_ids,sota_claim_ids,survey_claim_ids,analysis_ids,experiment_ids,artifact_paths,output_data_paths,output_table_paths,output_figure_paths,badge_targets,compliance_profiles,report_path,claim_map_path,badge_plan_path,review_status,clean_copy_status,supersession_status,next_step,notes/m
  );
  const contributionManifest = YAML.parse(await readFile(join(target, "contributions/templates/contribution.yaml"), "utf8"));
  assert.equal(contributionManifest.contribution.status, "planned");
  assert.deepEqual(contributionManifest.outputs.tables, []);
  assert.deepEqual(contributionManifest.badge_targets, []);
```

- [ ] **Step 2: Add doctor assertions**

In the broken doctor test, corrupt the contribution ledger and manifest:

```js
  await mkdir(join(target, "contributions/templates"), { recursive: true });
  await writeFile(join(target, "contributions/contribution-ledger.csv"), "contribution_id,title\n", "utf8");
  await writeFile(join(target, "contributions/templates/contribution.yaml"), "contribution: [\n", "utf8");
```

Assert:

```js
  assert.ok(result.errors.some((error) => error.includes("contributions/contribution-ledger.csv missing column type")));
  assert.ok(result.errors.some((error) => error.includes("invalid contributions/templates/contribution.yaml")));
```

- [ ] **Step 3: Add update migration assertion**

Add:

```js
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
```

- [ ] **Step 4: Add CLI assertions**

Update workflow help to:

```js
assert.match(workflowHelp.stdout, /workflow <literature\|survey\|agenda\|contribution>/);
```

Add a `workflow contribution` test asserting:

- `Contribution Workflow`
- `ledger\tcontributions/contribution-ledger.csv`
- `template\tcontributions/templates/contribution.yaml`
- `input\tresearch_agenda/opportunity-ledger.csv`
- next skills `contribution-package`, `research-data-analysis`, `research-results-reporting`, `experiment-logbook`, `publication-figures-tables`, `badge-compliance-profiles`

- [ ] **Step 5: Run RED**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because contribution files, doctor validation, lifecycle script, and workflow command do not exist yet.

## Task 2: Implement Templates And Wiring

- [ ] Create contribution templates with parseable YAML and no generated final claims.
- [ ] Add `contributions/contribution-ledger.csv` to `REQUIRED_CSV_COLUMNS`.
- [ ] Add `contributions/templates/contribution.yaml` and `contributions/templates/compliance/profiles.yaml` to YAML validation.
- [ ] Add contribution paths to the required doctor file list.
- [ ] Add contribution specs to `managedFileSpecs`.
- [ ] Add `workflow:contribution` to generated lifecycle scripts and `template/package.json`.
- [ ] Add `workflow contribution` CLI routing and help.
- [ ] Update generated docs and Python structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/contributions docs/superpowers/plans/2026-06-08-epic-5-contribution-package-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-5-contribution-package-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add contribution package workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include `contributions/` package templates.
- Doctor validates the contribution ledger header.
- Doctor parses contribution YAML templates and reports invalid YAML.
- `workflow contribution` prints routing and next skills.
- Generated package scripts include `workflow:contribution`.
- Contribution reports instruct agents to reference generated data, table, and figure paths instead of rewriting numeric truth.
- `npm run lint` passes.
- `npm test` passes.
