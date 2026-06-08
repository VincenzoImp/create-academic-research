# Epic 12 Workflow Prompts And Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every workflow stage discoverable through a stable npm/CLI preflight and a matching Markdown prompt-level workflow command.

**Architecture:** Add `docs/agent/workflow-prompts/<stage>.md` for every stage and `full-research-loop.md` for the whole program. Update workflow CLI commands to print a uniform `stage` and `prompt` route. Keep the CLI as a router/preflight; the Markdown prompt remains the operational procedure for agents.

**Tech Stack:** TypeScript ESM CLI/generator/doctor, Markdown templates, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/docs/agent/workflow-prompts/literature.md`
- `template/docs/agent/workflow-prompts/survey.md`
- `template/docs/agent/workflow-prompts/agenda.md`
- `template/docs/agent/workflow-prompts/contribution.md`
- `template/docs/agent/workflow-prompts/analysis.md`
- `template/docs/agent/workflow-prompts/frame.md`
- `template/docs/agent/workflow-prompts/release.md`
- `template/docs/agent/workflow-prompts/manuscript.md`
- `template/docs/agent/workflow-prompts/submission.md`
- `template/docs/agent/workflow-prompts/response.md`
- `template/docs/agent/workflow-prompts/full-research-loop.md`

Modify:

- `src/cli.ts`: every workflow command prints `stage` and `prompt`.
- `src/project.ts`: required files and managed specs for prompt files.
- `template/docs/agent/workflow-prompts/README.md`: update from planned files to active prompt contract.
- `template/README.md`, `template/docs/getting-started.md`: mention prompt-level workflow commands.
- `template/tests/test_project_structure.py`: assert prompt files exist.
- `tests/create.test.mjs`: generated project contains prompt files.
- `tests/cli.test.mjs`: workflow commands print stage and prompt.

## Task 1: Add Failing Tests

- [ ] Assert generated projects contain every prompt file.
- [ ] Assert representative prompt files include review-loop, ledger, skill, and handoff instructions.
- [ ] Assert each workflow command prints `stage\t<stage>` and `prompt\tdocs/agent/workflow-prompts/<stage>.md`.
- [ ] Run RED:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
```

Expected: FAIL because prompt files and CLI prompt routes are missing.

## Task 2: Implement Prompt Files And Routing

- [ ] Create prompt files with common structure: purpose, preflight, required skills, required inputs, execution loop, review gate, handoff.
- [ ] Add prompt files to required file list and managed specs.
- [ ] Add CLI `stage` and `prompt` lines to every workflow command.
- [ ] Update workflow prompt README and user docs.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/docs/agent/workflow-prompts docs/superpowers/plans/2026-06-08-epic-12-workflow-prompts-routing-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-12-workflow-prompts-routing-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add workflow prompt routing"
git push
```

## Acceptance Criteria

- Every workflow stage has a matching Markdown prompt file.
- Every workflow CLI command prints a stage id and prompt path.
- Generated projects include prompt files as managed files.
- Prompt files tell agents to run npm preflight, use skills, follow iterative review loops, update ledgers, and hand off only through clean reviewed outputs.
- `npm run lint` passes.
- `npm test` passes.
