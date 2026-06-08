# Output Contracts

Use this file with `docs/agent/project-quality.md` before writing generated or
derived material. The Project Quality Contract decides when an output can move
from exploratory work to trusted project evidence.

## Trust Levels

- `explore_outputs/`: exploratory variants, early hypotheses, and caveated runs.
- `debug_outputs/`: diagnosis artifacts for failures, data issues, or scientific bugs.
- `analysis_outputs/`: analysis reports, audits, intermediate tables, and draft figures.
- `repro_outputs/`: trusted reproduction evidence for external or internal results.
- `train_outputs/`: trusted training run evidence when model training is part of the research.
- `outputs/`: curated paper-facing figures, tables, models, and exportable derived assets.

## Research Records

- `sources/`: immutable source evidence, metadata, derived Markdown, and BibTeX.
- `sources/markdown-linear/`: cover-to-cover reading copies for core/supporting papers.
- `sota/`: search strategies, screening, literature matrix, syntheses, gaps, and logs.
- `sota/paper-syntheses/`: structured full-text syntheses for core/supporting papers.
- `sota/reading-log.csv`: full-text reading progress.
- `sota/citation-chasing-log.csv`: backward/forward citation expansion rounds.
- `experiments/`: curated experiment registry and human-readable run records.
- `experiments/campaigns/`: autonomous or overnight campaign plans and frontier ledgers.
- `experiments/campaigns/frontier-results.tsv`: machine-readable frontier ledger for `keep`, `discard`, and `crash` campaign outcomes.
- `reports/paper/sota-survey.tex`: survey-scale LaTeX draft when the task asks for a SOTA chapter or survey.
- `artifacts/badge-evidence-ledger.csv`: badge evidence paths, linked claims/results, procedures, and validation status.
- `survey/`: survey contracts, outlines, section plans, claims, drafts, final survey artifacts, and reviews.
- `research_agenda/`: opportunity ledgers, direction records, final agenda artifacts, and reviews.
- `contributions/`: contribution packages, claim maps, component outputs, badge plans, compliance files, reports, and reviews.
- `paper_frames/`: frame contracts, selected contributions, evidence maps, venue fit, badge fit, compliance fit, release plans, outlines, and decisions.
- `paper_releases/`: materialized paper-specific release packages, source maps, locks, checksums, metadata, and release reviews.
- `paper_submissions/`: cover letters, submitted snapshots, decision letters, reviewer comments, response letters, rebuttals, revision plans, and private correspondence.
- `compliance/`: project-level compliance profile registry and evidence files.

`paper_submissions/` is private communication state. New reviewer-requested
scientific work belongs in `contributions/` and analysis bundles, not in
rebuttal folders.

## Promotion Rules

Do not promote an output into `outputs/`, `repro_outputs/`, `train_outputs/`,
`reports/`, or `artifacts/` until it names:

- input sources, datasets, or run records
- command, script, notebook, or manual procedure
- environment or dependency notes
- expected output or validation criterion
- linked claim, research question, experiment, source, or artifact checklist row
- known limitations

If any item is missing, keep the material in `explore_outputs/`,
`analysis_outputs/`, or `debug_outputs/` and record the gap in the relevant
wiki page, ledger, or checklist.

## Badge Evidence

When an output supports artifact availability, functionality, reusability,
reproduction, or replication, update both:

- `artifacts/artifact-checklist.md`
- `artifacts/badge-evidence-ledger.csv`
