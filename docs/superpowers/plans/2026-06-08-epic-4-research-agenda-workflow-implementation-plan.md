# Epic 4 Research Agenda Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reviewed research agenda workflow that turns SOTA gaps and survey claims into prioritized opportunity records rather than generic future-work prose.

**Architecture:** Create `research_agenda/` with an agenda contract, opportunity ledger, direction/final/review folders, doctor validation, lifecycle script, and `workflow agenda` routing. The command prints required inputs and next skills but does not invent agenda items.

**Tech Stack:** TypeScript ESM CLI/generator, Markdown and CSV templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/research_agenda/agenda-contract.md`
- `template/research_agenda/opportunity-ledger.csv`
- `template/research_agenda/directions/.gitkeep`
- `template/research_agenda/final/.gitkeep`
- `template/research_agenda/reviews/.gitkeep`

Modify:

- `src/project.ts`: required headers, required files, managed specs, generated lifecycle script.
- `src/cli.ts`: `workflow agenda` and workflow help.
- `template/package.json`: add `workflow:agenda`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document agenda as first-class.
- `template/tests/test_project_structure.py`: assert agenda scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] **Step 1: Add createProject assertions**

Assert these paths exist:

```js
  await stat(join(target, "research_agenda/agenda-contract.md"));
  await stat(join(target, "research_agenda/opportunity-ledger.csv"));
  await stat(join(target, "research_agenda/directions/.gitkeep"));
  await stat(join(target, "research_agenda/final/.gitkeep"));
  await stat(join(target, "research_agenda/reviews/.gitkeep"));
```

Assert ledger and contract markers:

```js
  const opportunityLedger = await readFile(join(target, "research_agenda/opportunity-ledger.csv"), "utf8");
  assert.match(
    opportunityLedger,
    /^opportunity_id,title,evidence_summary,source_gap_ids,sota_claim_ids,survey_claim_ids,nearest_prior_work,method_or_experiment_idea,feasibility,expected_contribution,failure_condition,risks,cost,priority,publishability,ethical_or_release_constraints,decision,decision_rationale,review_status,next_step,notes/m
  );
  const agendaContract = await readFile(join(target, "research_agenda/agenda-contract.md"), "utf8");
  assert.match(agendaContract, /Agenda Review Gate/);
  assert.match(agendaContract, /novelty, feasibility, evidence, publishability, and ethical\/release constraints/);
```

- [ ] **Step 2: Add doctor assertion**

In the broken doctor test:

```js
  await mkdir(join(target, "research_agenda"), { recursive: true });
  await writeFile(join(target, "research_agenda/opportunity-ledger.csv"), "opportunity_id,title\n", "utf8");
```

Assert:

```js
  assert.ok(result.errors.some((error) => error.includes("research_agenda/opportunity-ledger.csv missing column evidence_summary")));
```

- [ ] **Step 3: Add update migration assertion**

Add:

```js
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
```

- [ ] **Step 4: Add CLI assertions**

Update help regex to `workflow <literature|survey|agenda>` and add `workflow agenda` test asserting:

- `Agenda Workflow`
- `input\tsota/gaps.md`
- `input\tsota/sota-claim-ledger.csv`
- `input\tsurvey/survey-claim-ledger.csv`
- `input\tsurvey/final/`
- next skills `research-agenda`, `research-design-positioning`, `cs-methodology-evaluation`, `adversarial-peer-review`

- [ ] **Step 5: Run RED**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because agenda scaffold, command, script, and doctor validation are missing.

## Task 2: Implement Templates And Wiring

- [ ] Create agenda templates with the opportunity ledger header above.
- [ ] Add required header and files to `src/project.ts`.
- [ ] Add `workflow:agenda` to generated lifecycle scripts and `template/package.json`.
- [ ] Add `workflow agenda` CLI routing and help.
- [ ] Update docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/research_agenda docs/superpowers/plans/2026-06-08-epic-4-research-agenda-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-4-research-agenda-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add research agenda workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include `research_agenda/`.
- Doctor validates `research_agenda/opportunity-ledger.csv`.
- `workflow agenda` prints routing and next skills.
- Generated package scripts include `workflow:agenda`.
- `npm run lint` passes.
- `npm test` passes.
