# Prompt-Level Workflow Commands

Prompt-level workflow commands are the agent-facing entrypoints. They are Markdown playbooks that tell an agent how to execute a research stage.

## Relationship To npm Workflow Commands

`npm run workflow:<stage>` is a preflight and routing command. It reports project state, required files, missing prerequisites, required skills, and next commands.

The prompt file tells the agent how to perform the stage using skills, ledgers, review loops, and handoff gates.

## Planned Prompt Files

- `literature.md`
- `survey.md`
- `agenda.md`
- `contribution.md`
- `analysis.md`
- `frame.md`
- `release.md`
- `manuscript.md`
- `submission.md`
- `response.md`
- `full-research-loop.md`

## Rule

The portable Markdown prompt is the source of truth. Agent-specific slash commands may wrap these files but must not diverge from them.
