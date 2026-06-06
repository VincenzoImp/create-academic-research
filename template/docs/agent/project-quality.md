# Project Quality Contract

This repository should stay usable for an entire academic research project, not
only for the current task. Every agent action should leave durable state,
evidence, and outputs in the right place.

## Request Intake

Before acting, classify the user's request:

- idea, question, or positioning
- source, PDF, bibliography, or SOTA work
- experiment, reproduction, analysis, or artifact work
- manuscript, LaTeX, review, rebuttal, or venue work
- project maintenance, MCP, skills, or repository hygiene

Route through the narrowest matching skill. If multiple workflows are involved,
update the durable records for each workflow instead of relying on chat history.

## Clean Work Zones

- `sources/`: immutable source evidence and derived reading copies.
- `sota/`: search protocol, screening, matrix, syntheses, gaps, and citation-chasing logs.
- `experiments/`: curated run registry and human-readable experiment records.
- `experiments/campaigns/`: bounded autonomous campaign plans and frontier ledgers.
- `explore_outputs/`: exploratory work that is not trusted evidence.
- `debug_outputs/`: diagnostic artifacts.
- `analysis_outputs/`: analysis reports and audit outputs.
- `repro_outputs/`: trusted reproduction evidence.
- `outputs/`: final paper-facing tables, figures, models, and exports.
- `reports/`: proposal, manuscript, slides, reviews, rebuttal, and LaTeX.
- `artifacts/`: release package, badge evidence, public artifact preparation.
- `wiki/`: durable project memory, claims, decisions, contradictions, questions.

Do not mix exploratory, trusted, raw, and final outputs. Promote artifacts only
when provenance, command, input, and validation are recorded.

## Trusted Outputs

An output becomes trusted only when it has:

- input sources or datasets
- command, script, notebook, or manual procedure
- environment or dependency notes
- expected output or validation criterion
- linked claim, research question, experiment, or source record
- known limitations

If any of these are missing, keep the output in `explore_outputs/`,
`analysis_outputs/`, or `debug_outputs/` and record the gap.

## Project Hygiene Gate

Before finishing a task:

- update the relevant ledger, matrix, wiki page, or checklist
- keep raw sources immutable
- keep reusable logic in `src/` and thin commands in `scripts/`
- keep generated caches, secrets, private data, and bulky outputs out of git
- reconcile bibliography keys, source IDs, run IDs, and claim IDs
- mark unresolved questions in `wiki/open_questions.md`
- append durable changes to `wiki/log.md`
- run the smallest meaningful validation command

## Badge Readiness

Badge evidence should accumulate throughout the project. When a task affects
code, data, benchmarks, models, experiments, reproduction, or release material,
update `artifacts/badge-evidence-ledger.csv` and `artifacts/artifact-checklist.md`.

Map work to these targets:

- Artifacts Available
- Artifacts Evaluated: Functional
- Artifacts Evaluated: Reusable
- Results Reproduced
- Results Replicated

Do not wait for submission week to recover install commands, expected outputs,
data access notes, or result-to-claim mappings.
