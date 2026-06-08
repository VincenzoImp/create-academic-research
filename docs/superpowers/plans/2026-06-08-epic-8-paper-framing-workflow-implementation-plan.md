# Epic 8 Paper Framing Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a venue-aware paper framing workflow so manuscripts and releases start from accepted frames rather than free-floating drafts.

**Architecture:** Create `paper_frames/` with a frame ledger and templates for frame contract, selected contributions, argument/evidence maps, badge/compliance/venue fit, release plan, outline, reviews, and decision. The CLI `workflow frame` reports required inputs and next skills; it does not choose the paper narrative.

**Tech Stack:** TypeScript ESM generator/CLI/doctor, CSV/YAML/Markdown templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/paper_frames/frame-ledger.csv`
- `template/paper_frames/templates/frame-contract.md`
- `template/paper_frames/templates/selected-contributions.yaml`
- `template/paper_frames/templates/argument-map.md`
- `template/paper_frames/templates/evidence-map.md`
- `template/paper_frames/templates/badge-fit.md`
- `template/paper_frames/templates/compliance-fit.md`
- `template/paper_frames/templates/venue-fit.md`
- `template/paper_frames/templates/release-plan.yaml`
- `template/paper_frames/templates/outline.md`
- `template/paper_frames/templates/reviews/.gitkeep`
- `template/paper_frames/templates/decision.md`

Modify:

- `src/project.ts`: frame ledger headers, required files, YAML validation, managed specs, lifecycle script.
- `src/cli.ts`: `workflow frame` route and workflow help.
- `template/package.json`: add `workflow:frame`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document frame as first-class.
- `template/tests/test_project_structure.py`: assert frame scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] **Step 1: Add generated file assertions**

Assert frame paths exist and parse:

```js
  await stat(join(target, "paper_frames/frame-ledger.csv"));
  await stat(join(target, "paper_frames/templates/frame-contract.md"));
  await stat(join(target, "paper_frames/templates/selected-contributions.yaml"));
  await stat(join(target, "paper_frames/templates/release-plan.yaml"));
  await stat(join(target, "paper_frames/templates/reviews/.gitkeep"));
```

Assert ledger and YAML markers:

```js
  assert.match(frameLedger, /^frame_id,title,status,target_venue,track,year,audience,frame_type,selected_contribution_ids,selected_analysis_ids,badge_targets,compliance_profiles,release_plan_path,argument_map_path,evidence_map_path,outline_path,decision_path,review_status,next_step,notes/m);
  assert.equal(selectedContributions.frame.status, "candidate");
  assert.deepEqual(selectedContributions.selected_contributions, []);
  assert.equal(releasePlan.frame_id, "frame-example");
```

- [ ] **Step 2: Add doctor assertions**

Corrupt `paper_frames/frame-ledger.csv` and `paper_frames/templates/selected-contributions.yaml`, then assert missing column `status` and invalid YAML.

- [ ] **Step 3: Add update migration assertion**

Remove `paper_frames/`, run dry-run, assert `paper_frames/frame-ledger.csv` and `paper_frames/templates/selected-contributions.yaml` are created, apply, and doctor passes.

- [ ] **Step 4: Add CLI assertions**

Update workflow help to include `frame` and add a `workflow frame` test asserting next skills `paper-framing`, `cs-venue-strategy`, `adversarial-peer-review`, and `badge-compliance-profiles`.

- [ ] **Step 5: Run RED**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because frame files, command, script, and validation are missing.

## Task 2: Implement Templates And Wiring

- [ ] Create frame ledger and templates.
- [ ] Add required frame CSV columns and YAML paths.
- [ ] Add required files and managed specs.
- [ ] Add `workflow:frame` to generated scripts and `template/package.json`.
- [ ] Add `workflow frame` CLI routing and help.
- [ ] Update docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/paper_frames docs/superpowers/plans/2026-06-08-epic-8-paper-framing-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-8-paper-framing-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add paper framing workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include `paper_frames/`.
- Doctor validates the frame ledger and frame YAML templates.
- `workflow frame` prints venue, contribution, badge, compliance, and release framing routes.
- Generated package scripts include `workflow:frame`.
- Manuscript writing is explicitly blocked until a frame is accepted.
- `npm run lint` passes.
- `npm test` passes.
