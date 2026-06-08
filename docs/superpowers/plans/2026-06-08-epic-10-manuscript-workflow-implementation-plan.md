# Epic 10 Manuscript Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frame-driven manuscript assembly workflow that turns an accepted paper frame into a clean paper draft without duplicating citation truth, numeric results, tables, figures, or unsupported claims.

**Architecture:** Extend `reports/paper/` with a manuscript ledger, manuscript manifest, paper claim map, citation map, asset map, LaTeX main file, section templates, review/archive folders, and script guidance. The manuscript consumes accepted frames, contribution reports, analysis paper exports, generated tables/figures, and the central bibliography. It does not become the canonical source for results or citations.

**Tech Stack:** TypeScript ESM generator/CLI/doctor, CSV/YAML/LaTeX/Markdown templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/reports/paper/manuscript-ledger.csv`
- `template/reports/paper/templates/manuscript.yaml`
- `template/reports/paper/templates/paper-claim-map.csv`
- `template/reports/paper/templates/citation-map.csv`
- `template/reports/paper/templates/asset-map.csv`
- `template/reports/paper/templates/main.tex`
- `template/reports/paper/templates/sections/abstract.tex`
- `template/reports/paper/templates/sections/introduction.tex`
- `template/reports/paper/templates/sections/related-work.tex`
- `template/reports/paper/templates/sections/method.tex`
- `template/reports/paper/templates/sections/results.tex`
- `template/reports/paper/templates/sections/discussion.tex`
- `template/reports/paper/templates/sections/limitations.tex`
- `template/reports/paper/templates/sections/ethics-and-availability.tex`
- `template/reports/paper/templates/sections/conclusion.tex`
- `template/reports/paper/templates/reviews/.gitkeep`
- `template/reports/paper/templates/archive/.gitkeep`
- `template/scripts/write-paper/README.md`

Modify:

- `src/project.ts`: manuscript CSV/YAML validation, required files, managed specs, lifecycle script.
- `src/cli.ts`: `workflow manuscript` route and help.
- `template/package.json`: add `workflow:manuscript`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document manuscript contract.
- `template/tests/test_project_structure.py`: assert manuscript scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] Add generated file assertions for manuscript ledger, manifest, claim map, citation map, asset map, LaTeX main, section files, reviews, archive, and write script README.
- [ ] Assert manuscript ledger, claim map, citation map, and asset map headers.
- [ ] Parse `manuscript.yaml` and assert `manuscript.status === "planned"`, `frame_id === "frame-example"`, and `bibliography.primary_bib === "sources/bib/references.bib"`.
- [ ] Assert `main.tex` uses the central BibTeX file and inputs section files.
- [ ] Corrupt manuscript ledger, maps, and manifest in the doctor broken test.
- [ ] Add update migration test that removes manuscript templates and script docs and verifies dry-run/apply recreate them.
- [ ] Add CLI help and `workflow manuscript` test.
- [ ] Run RED:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because manuscript files, command, script, and validation are missing.

## Task 2: Implement Templates And Wiring

- [ ] Create manuscript templates and script guidance.
- [ ] Add manuscript CSV required columns.
- [ ] Add manuscript YAML required paths.
- [ ] Add required files and managed specs.
- [ ] Add `workflow:manuscript` to generated scripts and `template/package.json`.
- [ ] Add `workflow manuscript` CLI routing and help.
- [ ] Update docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/reports/paper/templates template/scripts/write-paper docs/superpowers/plans/2026-06-08-epic-10-manuscript-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-10-manuscript-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add manuscript workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include a manuscript assembly contract under `reports/paper/`.
- Doctor validates manuscript ledger, claim map, citation map, asset map, and manifest.
- `workflow manuscript` prints frame, contribution, release, bibliography, claim, citation, asset, and review routing.
- Generated package scripts include `workflow:manuscript`.
- Manuscript docs state that claims, citations, numbers, tables, and figures must be traced to upstream canonical sources before final review can pass.
- `npm run lint` passes.
- `npm test` passes.
