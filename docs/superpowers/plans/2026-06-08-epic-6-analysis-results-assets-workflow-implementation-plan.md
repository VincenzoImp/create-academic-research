# Epic 6 Analysis Results Assets Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contribution-local strict analysis workflow that prevents polished result claims until the analysis bundle has provenance, method, metrics, outputs, publication asset maps, and review gates.

**Architecture:** Add nested analysis templates under `contributions/templates/analyses/templates/`. `analysis.yaml` is the strict manifest; `blocker-summary.md` is the only acceptable output when preflight fails; `report.md`, `stats-appendix.md`, `figure-catalog.md`, and `paper-export/` separate internal decision reporting from paper-facing assets. Doctor validates YAML fields and Markdown table headers.

**Tech Stack:** TypeScript ESM CLI/generator, Markdown/YAML templates, Node test runner, `yaml` parser, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/contributions/templates/analyses/templates/analysis.yaml`
- `template/contributions/templates/analyses/templates/README.md`
- `template/contributions/templates/analyses/templates/blocker-summary.md`
- `template/contributions/templates/analyses/templates/inputs/.gitkeep`
- `template/contributions/templates/analyses/templates/data/.gitkeep`
- `template/contributions/templates/analyses/templates/scripts/.gitkeep`
- `template/contributions/templates/analyses/templates/tables/.gitkeep`
- `template/contributions/templates/analyses/templates/figures/.gitkeep`
- `template/contributions/templates/analyses/templates/figure-catalog.md`
- `template/contributions/templates/analyses/templates/stats-appendix.md`
- `template/contributions/templates/analyses/templates/report.md`
- `template/contributions/templates/analyses/templates/paper-export/.gitkeep`
- `template/contributions/templates/analyses/templates/paper-export/README.md`
- `template/contributions/templates/analyses/templates/reviews/.gitkeep`
- `template/contributions/templates/analyses/templates/archive/.gitkeep`

Modify:

- `src/project.ts`: required files, YAML required paths, Markdown table header validation, managed specs, generated lifecycle script.
- `src/cli.ts`: `workflow analysis` route and help.
- `template/package.json`: add `workflow:analysis`.
- `template/docs/agent/output-contracts.md`, `template/docs/agent/project-quality.md`, `template/docs/agent/research-workflow.md`, `template/docs/getting-started.md`: document strict analysis.
- `template/tests/test_project_structure.py`: assert analysis templates exist.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] **Step 1: Add creation assertions**

Assert these paths exist:

```js
  await stat(join(target, "contributions/templates/analyses/templates/analysis.yaml"));
  await stat(join(target, "contributions/templates/analyses/templates/blocker-summary.md"));
  await stat(join(target, "contributions/templates/analyses/templates/figure-catalog.md"));
  await stat(join(target, "contributions/templates/analyses/templates/stats-appendix.md"));
  await stat(join(target, "contributions/templates/analyses/templates/report.md"));
  await stat(join(target, "contributions/templates/analyses/templates/paper-export/README.md"));
```

Assert YAML and table markers:

```js
  const analysisManifest = YAML.parse(await readFile(join(target, "contributions/templates/analyses/templates/analysis.yaml"), "utf8"));
  assert.equal(analysisManifest.analysis.status, "planned");
  assert.equal(analysisManifest.metric.direction, "higher-is-better | lower-is-better | neutral");
  assert.deepEqual(analysisManifest.outputs.tables, []);
  const figureCatalog = await readFile(join(target, "contributions/templates/analyses/templates/figure-catalog.md"), "utf8");
  assert.match(figureCatalog, /source_data_path/);
  const analysisReport = await readFile(join(target, "contributions/templates/analyses/templates/report.md"), "utf8");
  assert.match(analysisReport, /Reference generated outputs directly/);
```

- [ ] **Step 2: Add doctor assertions**

In the broken doctor test:

```js
  await mkdir(join(target, "contributions/templates/analyses/templates"), { recursive: true });
  await writeFile(join(target, "contributions/templates/analyses/templates/analysis.yaml"), "analysis: [\n", "utf8");
  await writeFile(
    join(target, "contributions/templates/analyses/templates/figure-catalog.md"),
    "| figure_id | purpose |\n| --- | --- |\n",
    "utf8"
  );
```

Assert:

```js
  assert.ok(result.errors.some((error) => error.includes("invalid contributions/templates/analyses/templates/analysis.yaml")));
  assert.ok(result.errors.some((error) => error.includes("contributions/templates/analyses/templates/figure-catalog.md missing table column source_data_path")));
```

- [ ] **Step 3: Add update migration assertion**

Add:

```js
test("updateProject adds analysis workflow templates", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-analysis-workflow-"));
  const target = join(root, "update-analysis-workflow-project");
  await createProject({
    target,
    title: "Update Analysis Workflow Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "contributions/templates/analyses"), { recursive: true, force: true });

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "contributions/templates/analyses/templates/analysis.yaml" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "contributions/templates/analyses/templates/figure-catalog.md" && change.action === "create"));

  await updateProject(target, { apply: true });
  const doctor = await doctorProject(target);

  await stat(join(target, "contributions/templates/analyses/templates/analysis.yaml"));
  await stat(join(target, "contributions/templates/analyses/templates/figure-catalog.md"));
  assert.equal(doctor.ok, true);
});
```

- [ ] **Step 4: Add CLI assertions**

Update workflow help to:

```js
assert.match(workflowHelp.stdout, /workflow <literature\|survey\|agenda\|contribution\|analysis>/);
```

Add a `workflow analysis` test asserting:

- `Analysis Workflow`
- `template\tcontributions/templates/analyses/templates/analysis.yaml`
- `blocker\tcontributions/templates/analyses/templates/blocker-summary.md`
- preflight fields `primary_question`, `unit_of_analysis`, `metric_direction`, `raw_provenance`, `sample_seed_run_counts`, `comparison_family`
- next skills `research-data-analysis`, `research-results-reporting`, `publication-figures-tables`, `citation-claim-audit`, `adversarial-peer-review`

- [ ] **Step 5: Run RED**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because analysis templates, doctor validation, lifecycle script, and workflow command do not exist yet.

## Task 2: Implement Templates And Wiring

- [ ] Create analysis templates with strict preflight, blocker summary, stats appendix, figure catalog, internal report, paper-export guidance, reviews, and archive folders.
- [ ] Add analysis YAML required paths to `REQUIRED_YAML_PATHS`.
- [ ] Add Markdown table header validation for `figure-catalog.md` and `stats-appendix.md`.
- [ ] Add analysis template paths to required doctor files.
- [ ] Add analysis specs to `managedFileSpecs`.
- [ ] Add `workflow:analysis` to generated lifecycle scripts and `template/package.json`.
- [ ] Add `workflow analysis` CLI routing and help.
- [ ] Update generated docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/contributions/templates/analyses docs/superpowers/plans/2026-06-08-epic-6-analysis-results-assets-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-6-analysis-results-assets-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add strict analysis workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include contribution-local analysis templates.
- Doctor validates `analysis.yaml` syntax and required fields.
- Doctor validates figure and stats Markdown table headers.
- `workflow analysis` prints strict preflight, blocker summary, output paths, paper-export path, and next skills.
- Generated package scripts include `workflow:analysis`.
- Analysis report and paper-export docs require generated outputs to remain canonical.
- `npm run lint` passes.
- `npm test` passes.
