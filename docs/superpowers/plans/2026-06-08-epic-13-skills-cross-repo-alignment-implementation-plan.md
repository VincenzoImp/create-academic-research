# Epic 13 Skills Cross-Repo Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-skills plus superpowers:executing-plans. This epic touches `create-academic-research` and the sibling `academic-research-skills` repository.

**Goal:** Make the academic research skills package match the end-to-end scaffold: SOTA, survey, research agenda, contribution packages, strict analyses, paper framing, releases, manuscript writing, submission lifecycle, response/rebuttal, badges, MCPs, and project maintenance.

**Architecture:** Keep `create-academic-research` as the project/scaffold contract and `academic-research-skills` as the operational procedure package. The scaffold supplies directories, ledgers, manifests, prompt routes, and doctor/update validation; the skills read those contracts, operate in their stage, update ledgers, iterate review loops, and hand off clean outputs.

---

## Task 1: RED Tests In `academic-research-skills`

- [ ] Update `tests/test_skill_structure.py` to require the new stage skills:
  - `survey-synthesis`
  - `research-agenda`
  - `contribution-package`
  - `research-results-reporting`
  - `publication-figures-tables`
  - `paper-framing`
  - `paper-release`
  - `paper-submission-lifecycle`
  - `badge-compliance-profiles`
- [ ] Add a test requiring every workflow-stage skill to mention its `npm run workflow:<stage>` preflight and the repository ledger it owns.
- [ ] Update trigger-boundary expectations to include every new skill.
- [ ] Run RED:

```bash
python3.11 -m pytest -q
```

Expected: FAIL because the new skills and references are missing.

## Task 2: Add And Align Skills

- [ ] Add the nine new skill directories with `SKILL.md`, `agents/openai.yaml`, and local references.
- [ ] Add a shared `references/workflow-stage-contracts.md` reference covering workflow prompts, ledgers, review loops, final clean-copy gates, and handoff.
- [ ] Update `README.md`, `examples/skill-use-cases.md`, and `evals/trigger-boundaries.json`.
- [ ] Update `research-project-router` to route in the full scaffold order.
- [ ] Update key existing skills so they mention the new contracts:
  - `sota-literature-review`
  - `research-data-analysis`
  - `paper-writing-review`
  - `rebuttal-revision-strategy`
  - `artifact-open-science`
  - `academic-mcp-tooling`

## Task 3: Verify Skill Repo

Run in `academic-research-skills`:

```bash
python3.11 scripts/sync_skill_references.py --apply
python3.11 scripts/sync_skill_references.py --check
python3.11 scripts/validate_skills.py
python3.11 -m pytest -q
python3.11 -m ruff check scripts tests
```

Commit and push in `academic-research-skills`:

```bash
git add .
git commit -m "feat: align skills with end-to-end research workflows"
git push origin improve-sota-method
```

## Task 4: Verify Scaffold Repo

Run in `create-academic-research`:

```bash
npm run lint
npm test
git status --short --branch --untracked-files=all
```

Commit and push the plan if needed:

```bash
git add docs/superpowers/plans/2026-06-08-epic-13-skills-cross-repo-alignment-implementation-plan.md
git commit -m "docs: plan skills cross-repo alignment"
git push
```

## Acceptance Criteria

- `academic-research-skills` includes the new stage skills.
- Existing and new skills reference scaffold workflow commands, ledgers, review loops, and clean handoff rules.
- Router mentions every installed skill and routes in scaffold order.
- Skill README, examples, trigger boundaries, tests, and validation all agree.
- Both repositories are committed and pushed.
