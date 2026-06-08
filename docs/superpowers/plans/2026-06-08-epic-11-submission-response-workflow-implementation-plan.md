# Epic 11 Submission And Response Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-paper submission and response lifecycle so cover letters, submitted snapshots, venue-system notes, decisions, reviewer concerns, rebuttals, response letters, revisions, and camera-ready state are organized without hiding new scientific work inside communication folders.

**Architecture:** Create `paper_submissions/` with a submission ledger, submission manifest, cover letter, checklist, submitted-version lock, venue-system notes, correspondence/decision folders, review-round package, concern map, linked-work map, manuscript-change map, response strategy, response letter, rebuttal, revision plan, camera-ready folder, and archive. Submission and response artifacts are communication state; reviewer-requested new work routes back to contributions, analyses, citations, or artifacts before being cited in a rebuttal or response.

**Tech Stack:** TypeScript ESM generator/CLI/doctor, CSV/YAML/Markdown templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/paper_submissions/submission-ledger.csv`
- `template/paper_submissions/templates/submission.yaml`
- `template/paper_submissions/templates/cover-letter.md`
- `template/paper_submissions/templates/submission-checklist.md`
- `template/paper_submissions/templates/submitted-version.lock`
- `template/paper_submissions/templates/venue-system-notes.md`
- `template/paper_submissions/templates/correspondence/.gitkeep`
- `template/paper_submissions/templates/decisions/.gitkeep`
- `template/paper_submissions/templates/review-rounds/r1/decision-letter.md`
- `template/paper_submissions/templates/review-rounds/r1/reviewer-comments.md`
- `template/paper_submissions/templates/review-rounds/r1/concern-map.csv`
- `template/paper_submissions/templates/review-rounds/r1/response-strategy.md`
- `template/paper_submissions/templates/review-rounds/r1/revision-plan.md`
- `template/paper_submissions/templates/review-rounds/r1/linked-work.csv`
- `template/paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv`
- `template/paper_submissions/templates/review-rounds/r1/response-letter.md`
- `template/paper_submissions/templates/review-rounds/r1/rebuttal.md`
- `template/paper_submissions/templates/review-rounds/r1/reviews/.gitkeep`
- `template/paper_submissions/templates/camera-ready/.gitkeep`
- `template/paper_submissions/templates/archive/.gitkeep`

Modify:

- `src/project.ts`: submission CSV/YAML validation, required files, managed specs, lifecycle scripts.
- `src/cli.ts`: `workflow submission` and `workflow response` routes and help.
- `template/package.json`: add `workflow:submission` and `workflow:response`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document submission and response contract.
- `template/tests/test_project_structure.py`: assert submission scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] Add generated file assertions for submission ledger, manifest, cover letter, checklist, submitted lock, venue notes, correspondence, decisions, review-round templates, camera-ready, and archive.
- [ ] Assert submission ledger, concern map, linked-work map, and manuscript-change map headers.
- [ ] Parse `submission.yaml` and assert `submission.status === "planned"`, `frame_id === "frame-example"`, `manuscript_id === "manuscript-example"`, and `release_id === "release-example"`.
- [ ] Corrupt submission ledger, review-round maps, and manifest in the doctor broken test.
- [ ] Add update migration test that removes `paper_submissions/` and verifies dry-run/apply recreate the submission files.
- [ ] Add CLI help and `workflow submission` / `workflow response` tests.
- [ ] Run RED:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because submission files, response files, commands, and validation are missing.

## Task 2: Implement Templates And Wiring

- [ ] Create submission and response templates.
- [ ] Add submission CSV required columns.
- [ ] Add response review-round CSV required columns.
- [ ] Add submission YAML required paths.
- [ ] Add required files and managed specs.
- [ ] Add lifecycle scripts to generated scripts and `template/package.json`.
- [ ] Add `workflow submission` and `workflow response` CLI routing and help.
- [ ] Update docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/paper_submissions docs/superpowers/plans/2026-06-08-epic-11-submission-response-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-11-submission-response-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add submission response workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include a per-paper submission and response contract under `paper_submissions/`.
- Doctor validates submission ledger, submission manifest, concern map, linked-work map, and manuscript-change map.
- `workflow submission` prints frame, manuscript, release, cover-letter, submission checklist, submitted lock, venue-system, anonymity, and review-round routing.
- `workflow response` prints decision-letter, reviewer-comments, concern-map, linked-work, manuscript-change-map, rebuttal, response-letter, and revision-plan routing.
- Submission docs state that cover letters, response letters, and rebuttals cannot introduce unsupported claims.
- Response docs state that reviewer-requested new scientific work belongs in contribution packages, analyses, citation work, or artifact work before being cited in the response.
- `npm run lint` passes.
- `npm test` passes.
