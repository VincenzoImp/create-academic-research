# Epic 2 SOTA Promotion Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SOTA claims promotable through an explicit ledger so survey, research agenda, and paper framing do not inherit loose prose or unsupported claim strength.

**Architecture:** Add `sota/sota-claim-ledger.csv` and `sota/promotion-rules.md`, extend `sota/literature-matrix.csv` with claim/promotion fields, and validate all required headers through `doctorProject`. Use the existing conservative delimited-header migration to append missing SOTA columns in older projects without dropping rows.

**Tech Stack:** TypeScript ESM generator, CSV/Markdown templates, Node test runner, `npm test -- tests/create.test.mjs`, `npm run lint`.

---

## Scope Boundary

Epic 2 does not create the survey or agenda directories. It only makes SOTA outputs ready to feed those later workflows through explicit claim IDs, allowed wording, evidence strength, downstream status, and unresolved risks.

## File Structure

Create:

- `template/sota/sota-claim-ledger.csv`: machine-readable SOTA claim promotion ledger.
- `template/sota/promotion-rules.md`: rules for moving claims downstream.

Modify:

- `template/sota/literature-matrix.csv`: add claim and downstream columns.
- `template/sota/synthesis.md`: require synthesis claims to cite claim ledger rows.
- `template/sota/gaps.md`: make gaps structured inputs to survey and agenda.
- `template/docs/agent/research-workflow.md`: mention SOTA claim promotion.
- `template/docs/agent/output-contracts.md`: list the SOTA claim ledger.
- `template/docs/getting-started.md`: route SOTA synthesis through claim ledger.
- `template/tests/test_project_structure.py`: assert new SOTA files exist.
- `src/project.ts`: required headers, required files, managed specs.
- `tests/create.test.mjs`: creation, doctor, and migration assertions.

---

## Task 1: Add Failing Tests

**Files:**

- Modify: `tests/create.test.mjs`

- [ ] **Step 1: Add creation assertions**

After existing SOTA file stats, add:

```js
  await stat(join(target, "sota/sota-claim-ledger.csv"));
  await stat(join(target, "sota/promotion-rules.md"));
```

After reading `literatureMatrix`, add:

```js
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
```

- [ ] **Step 2: Add doctor assertion**

In the broken doctor test, add:

```js
  await writeFile(join(target, "sota/sota-claim-ledger.csv"), "claim_id,claim_text\n", "utf8");
```

Then assert:

```js
  assert.ok(result.errors.some((error) => error.includes("sota/sota-claim-ledger.csv missing column source_ids")));
```

- [ ] **Step 3: Add update migration assertion**

Add a test after the Zotero migration test:

```js
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
```

- [ ] **Step 4: Run RED**

```bash
npm test -- tests/create.test.mjs
```

Expected: FAIL because SOTA claim ledger files and required headers are not implemented yet.

---

## Task 2: Add SOTA Templates

**Files:**

- Create: `template/sota/sota-claim-ledger.csv`
- Create: `template/sota/promotion-rules.md`
- Modify: `template/sota/literature-matrix.csv`
- Modify: `template/sota/synthesis.md`
- Modify: `template/sota/gaps.md`

- [ ] **Step 1: Add claim ledger header**

Use:

```csv
claim_id,claim_text,source_ids,bib_keys,evidence_strength,allowed_wording,forbidden_stronger_wording,method_context,limitations,contradictions,downstream_status,downstream_targets,unresolved_risks,review_status,last_checked,notes
```

- [ ] **Step 2: Add literature matrix columns**

Use:

```csv
source_id,bib_key,role,title,authors,year,venue,method,dataset_or_sample,task_or_problem,key_claim,metric_or_result,limitations,relevance,full_text_status,reading_status,synthesis_path,citation_count_or_signal,identifiers,claim_ids,evidence_strength,downstream_status,notes
```

- [ ] **Step 3: Replace SOTA prose templates with structured sections**

`sota/synthesis.md` must include `## Claim-Ledger Anchors`.

`sota/gaps.md` must include a table with `Gap ID`, `Linked Claim IDs`, `Survey Need`, and `Agenda Potential`.

`sota/promotion-rules.md` must define the Claim Promotion Gate and state that allowed wording controls downstream phrasing.

---

## Task 3: Wire Generator, Doctor, And Migration

**Files:**

- Modify: `src/project.ts`
- Modify: `template/tests/test_project_structure.py`

- [ ] **Step 1: Add required CSV headers**

Add `sota/sota-claim-ledger.csv` to `REQUIRED_CSV_COLUMNS` and add `claim_ids`, `evidence_strength`, and `downstream_status` to the literature matrix required columns.

- [ ] **Step 2: Add required files**

Add `sota/sota-claim-ledger.csv` and `sota/promotion-rules.md` to the `doctorProject` required list.

- [ ] **Step 3: Add managed specs**

Add:

- `sota/sota-claim-ledger.csv` as `user-owned`.
- `sota/promotion-rules.md` as `managed`.

The existing delimited-header updater handles older `sota/literature-matrix.csv` files.

---

## Task 4: Verify, Commit, Push

- [ ] **Step 1: Focused tests**

```bash
npm test -- tests/create.test.mjs
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Full tests**

```bash
npm test
```

- [ ] **Step 4: Self-review**

```bash
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/sota/sota-claim-ledger.csv template/sota/promotion-rules.md template/sota/synthesis.md template/sota/gaps.md
git diff --check
git status --short --untracked-files=all
```

- [ ] **Step 5: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-08-epic-2-sota-promotion-contract-implementation-plan.md src/project.ts template/sota template/docs template/tests tests/create.test.mjs
git commit -m "feat: add sota claim promotion contract"
git push
```

## Acceptance Criteria

- New projects include `sota/sota-claim-ledger.csv`.
- New projects include `sota/promotion-rules.md`.
- Doctor validates `sota/sota-claim-ledger.csv`.
- `updateProject` can create missing SOTA promotion files and append missing literature-matrix columns while preserving existing rows.
- `npm run lint` passes.
- `npm test` passes.
