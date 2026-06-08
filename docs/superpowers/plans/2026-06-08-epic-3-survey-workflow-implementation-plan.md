# Epic 3 Survey Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class survey workflow that turns SOTA claim ledgers into section-by-section reviewed survey artifacts instead of treating survey writing as a side effect of SOTA prose.

**Architecture:** Create the `survey/` scaffold, add a survey claim ledger validated by doctor, add `workflow survey` and `workflow:survey`, and document survey mode/compliance/review gates. Keep the workflow command as a preflight/router; it does not generate survey prose.

**Tech Stack:** TypeScript ESM CLI/generator, Markdown and CSV templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## Scope Boundary

Epic 3 does not create research agenda files. It creates survey inputs, outputs, compliance notes, and review structure. Research agenda consumes survey outputs in Epic 4.

## File Structure

Create:

- `template/survey/survey-contract.md`
- `template/survey/outline.md`
- `template/survey/section-plans/.gitkeep`
- `template/survey/drafts/.gitkeep`
- `template/survey/final/.gitkeep`
- `template/survey/reviews/.gitkeep`
- `template/survey/compliance/README.md`
- `template/survey/survey-claim-ledger.csv`

Modify:

- `src/project.ts`: required headers, required files, managed specs, generated lifecycle script.
- `src/cli.ts`: `workflow survey` and workflow help.
- `template/package.json`: add `workflow:survey`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document survey as first-class.
- `template/tests/test_project_structure.py`: assert survey scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

---

## Task 1: Add Failing Tests

**Files:**

- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

- [ ] **Step 1: Add createProject survey assertions**

Assert these paths exist:

```js
  await stat(join(target, "survey/survey-contract.md"));
  await stat(join(target, "survey/outline.md"));
  await stat(join(target, "survey/section-plans/.gitkeep"));
  await stat(join(target, "survey/drafts/.gitkeep"));
  await stat(join(target, "survey/final/.gitkeep"));
  await stat(join(target, "survey/reviews/.gitkeep"));
  await stat(join(target, "survey/compliance/README.md"));
  await stat(join(target, "survey/survey-claim-ledger.csv"));
```

Assert claim ledger and contract markers:

```js
  const surveyClaimLedger = await readFile(join(target, "survey/survey-claim-ledger.csv"), "utf8");
  assert.match(
    surveyClaimLedger,
    /^survey_claim_id,sota_claim_ids,section_id,claim_text,source_ids,evidence_strength,synthesis_role,allowed_wording,limitations,contradictions,review_status,downstream_status,notes/m
  );
  const surveyContract = await readFile(join(target, "survey/survey-contract.md"), "utf8");
  assert.match(surveyContract, /Survey Mode/);
  assert.match(surveyContract, /narrative \| systematic \| scoping \| meta-analysis \| mixed/);
  assert.match(surveyContract, /Section-By-Section Drafting/);
```

- [ ] **Step 2: Add doctor assertion**

In the broken doctor test:

```js
  await writeFile(join(target, "survey/survey-claim-ledger.csv"), "survey_claim_id,claim_text\n", "utf8");
```

Assert:

```js
  assert.ok(result.errors.some((error) => error.includes("survey/survey-claim-ledger.csv missing column sota_claim_ids")));
```

- [ ] **Step 3: Add update migration assertion**

Add:

```js
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
```

- [ ] **Step 4: Add CLI assertions**

In workflow help test:

```js
  assert.match(workflowHelp.stdout, /workflow <literature\|survey>/);
  assert.match(workflowHelp.stdout, /survey/);
```

Add a new CLI test:

```js
test("academic-research workflow survey prints survey workflow routing", async () => {
  const temp = await mkdtemp(join(tmpdir(), "academic-cli-workflow-survey-"));
  const target = join(temp, "cli-workflow-survey-project");
  spawnSync(
    process.execPath,
    ["dist/bin/create-academic-research.js", target, "--yes", "--preset", "minimal", "--no-install-skills"],
    { cwd: root, encoding: "utf8" }
  );

  const workflow = spawnSync(process.execPath, ["dist/bin/academic-research.js", "workflow", "survey", "--root", target], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(workflow.status, 0, workflow.stderr + workflow.stdout);
  assert.match(workflow.stdout, /Survey Workflow/);
  assert.match(workflow.stdout, /contract\tsurvey\/survey-contract\.md/);
  assert.match(workflow.stdout, /input\tsota\/sota-claim-ledger\.csv/);
  assert.match(workflow.stdout, /next_skill\tsurvey-synthesis/);
  assert.match(workflow.stdout, /next_skill\tsystematic-review-prisma/);
  assert.match(workflow.stdout, /next_skill\tcitation-claim-audit/);
  assert.match(workflow.stdout, /next_skill\tadversarial-peer-review/);
});
```

- [ ] **Step 5: Run RED**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because survey scaffold, command, script, and doctor validation are missing.

---

## Task 2: Add Survey Templates

**Files:**

- Create all `template/survey/**` files.
- Modify documentation templates and project structure test.

- [ ] **Step 1: Add survey claim ledger**

Use:

```csv
survey_claim_id,sota_claim_ids,section_id,claim_text,source_ids,evidence_strength,synthesis_role,allowed_wording,limitations,contradictions,review_status,downstream_status,notes
```

- [ ] **Step 2: Add survey contract**

`survey-contract.md` must include:

- `Survey Mode`
- `narrative | systematic | scoping | meta-analysis | mixed`
- inputs from SOTA claim ledger and gaps
- Section-By-Section Drafting
- review loop and clean-final gate
- compliance activation rule for systematic/scoping/meta-analysis modes

- [ ] **Step 3: Add outline and compliance docs**

`outline.md` should define section IDs and source/claim anchors.

`survey/compliance/README.md` should state that systematic/scoping/meta-analysis modes require PRISMA-style counts and reporting evidence.

---

## Task 3: Wire Generator, Doctor, Scripts, CLI

**Files:**

- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`

- [ ] **Step 1: Add required CSV header and required files**

Add `survey/survey-claim-ledger.csv` to `REQUIRED_CSV_COLUMNS` and all survey files to the `doctorProject` required list.

- [ ] **Step 2: Add managed specs**

Use `managed` for contract/docs/.gitkeep files and `user-owned` for `survey/survey-claim-ledger.csv`.

- [ ] **Step 3: Add lifecycle script**

Add `"workflow:survey": "${command} workflow survey"` in `generatedLifecycleScripts` and in `template/package.json`.

- [ ] **Step 4: Add CLI command**

`workflow survey` should print project root, contract path, inputs, outputs, review path, and next skills. It must not generate survey text.

---

## Task 4: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/survey docs/superpowers/plans/2026-06-08-epic-3-survey-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-3-survey-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add survey workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include the `survey/` scaffold.
- Doctor validates `survey/survey-claim-ledger.csv`.
- `workflow survey` prints routing and next skills.
- Generated package scripts include `workflow:survey`.
- `npm run lint` passes.
- `npm test` passes.
