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
- `survey/`: survey contracts, outlines, section plans, claims, drafts, final survey artifacts, and reviews.
- `research_agenda/`: opportunity ledgers, direction records, final agenda artifacts, and reviews.
- `contributions/`: contribution packages, claim maps, component outputs, badge plans, compliance files, reports, and reviews.
- `paper_frames/`: frame contracts, selected contributions, evidence maps, venue fit, badge fit, compliance fit, release plans, outlines, and decisions.
- `paper_releases/`: materialized paper-specific release packages, source maps, locks, checksums, metadata, and release reviews.
- `paper_submissions/`: cover letters, submitted snapshots, decision letters, reviewer comments, response letters, rebuttals, revision plans, and private correspondence.
- `compliance/`: project-level compliance profile registry and evidence files.

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

## Universal Review Loop

Substantial artifacts repeat contract -> outline -> partial draft or analysis slice -> adversarial review -> fix -> re-review until no blocker or major issue remains.

## Final Clean-Copy Gate

Final artifacts must not contain draft residue, stale tables, stale figures, unsupported claims, contradictory claims, unresolved notes, or obsolete alternatives.

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

Contribution packages should select active compliance profiles early, but a
badge claim is valid only after the package report, output paths, validation
commands, and final review all agree.

Analysis reports should be written only after strict preflight passes. Figure
and table claims stay tied to generated source-data paths, stats appendix rows,
figure-catalog rows, and paper-export snippets.

Badge claims require a selected profile, evidence paths, missing-evidence
state, blocking-gap state, reviewer, checked date, and status. Do not claim a
badge because the repository has a folder or checklist.

Map work to these targets:

- Artifacts Available
- Artifacts Evaluated: Functional
- Artifacts Evaluated: Reusable
- Results Reproduced
- Results Replicated

Do not wait for submission week to recover install commands, expected outputs,
data access notes, or result-to-claim mappings.
