# Epic 9 Paper Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manifest-driven paper release workflow that exports paper-specific public/review artifacts without stale copies or publishing the whole internal project repo.

**Architecture:** Create `paper_releases/` with a release ledger, release manifest, source map, lock, checksums, staging folders, metadata docs, reviews, archive, and release script guidance. Release packages are built from canonical frame/contribution/analysis paths and source maps; staging directories are outputs, not sources of truth.

**Tech Stack:** TypeScript ESM generator/CLI/doctor, CSV/YAML/Markdown templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/paper_releases/release-ledger.csv`
- `template/paper_releases/templates/release.yaml`
- `template/paper_releases/templates/source-map.csv`
- `template/paper_releases/templates/release-plan.lock`
- `template/paper_releases/templates/checksums.txt`
- `template/paper_releases/templates/artifact/.gitkeep`
- `template/paper_releases/templates/manuscript/.gitkeep`
- `template/paper_releases/templates/supplement/.gitkeep`
- `template/paper_releases/templates/data/.gitkeep`
- `template/paper_releases/templates/models/.gitkeep`
- `template/paper_releases/templates/metadata/README.md`
- `template/paper_releases/templates/reviews/.gitkeep`
- `template/paper_releases/templates/archive/.gitkeep`
- `template/scripts/release-paper/README.md`

Modify:

- `src/project.ts`: release ledger/source-map headers, YAML validation, required files, managed specs, lifecycle script.
- `src/cli.ts`: `workflow release` route and help.
- `template/package.json`: add `workflow:release`.
- `template/README.md`, `template/AGENTS.md`, `template/docs/getting-started.md`, `template/docs/agent/output-contracts.md`, `template/docs/agent/research-workflow.md`: document release contract.
- `template/tests/test_project_structure.py`: assert release scaffold exists.
- `tests/create.test.mjs`: creation, doctor, migration assertions.
- `tests/cli.test.mjs`: help and command assertions.

## Task 1: Add Failing Tests

- [ ] Add generated file assertions for release ledger, release YAML, source map, lock, checksums, staging dirs, metadata README, reviews, archive, and release script README.
- [ ] Assert release ledger and source-map headers.
- [ ] Parse `release.yaml` and assert `release.status === "planned"` and `frame_id === "frame-example"`.
- [ ] Corrupt `paper_releases/release-ledger.csv`, `source-map.csv`, and `release.yaml` in the doctor broken test.
- [ ] Add update migration test that removes `paper_releases/` and verifies dry-run/apply recreate the release files.
- [ ] Add CLI help and `workflow release` test.
- [ ] Run RED:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because release files, command, script, and validation are missing.

## Task 2: Implement Templates And Wiring

- [ ] Create release templates and script guidance.
- [ ] Add release ledger and source-map required columns.
- [ ] Add release YAML required paths.
- [ ] Add required files and managed specs.
- [ ] Add `workflow:release` to generated scripts and `template/package.json`.
- [ ] Add `workflow release` CLI routing and help.
- [ ] Update docs and project structure test.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/paper_releases template/scripts/release-paper docs/superpowers/plans/2026-06-08-epic-9-paper-release-workflow-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-9-paper-release-workflow-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add paper release workflow scaffold"
git push
```

## Acceptance Criteria

- New projects include `paper_releases/` and release script guidance.
- Doctor validates release ledger, source-map headers, and release YAML.
- `workflow release` prints manifest/source-map/lock/checksum release routing.
- Generated package scripts include `workflow:release`.
- Release docs state staging is generated from canonical sources and must not become a second source of truth.
- `npm run lint` passes.
- `npm test` passes.
