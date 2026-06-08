# Strict Analysis Template

Copy this directory to `contributions/<contribution_id>/analyses/<analysis_id>/`
for a substantial analysis, experiment analysis, reproduction analysis,
replication analysis, benchmark analysis, or decision-supporting result.

The bundle has three layers:

- strict manifest and preflight in `analysis.yaml`
- internal evidence record in `report.md`, `stats-appendix.md`, and
  `figure-catalog.md`
- paper-facing fragments and source links in `paper-export/`

If primary question, unit of analysis, metric direction, raw provenance,
sample/seed/run counts, or comparison family are missing, write only
`blocker-summary.md`. Do not write a polished report or promote a result claim
until the strict bundle exists.
