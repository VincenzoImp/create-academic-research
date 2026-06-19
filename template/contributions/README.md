# Contributions

One folder per contribution: any analysis, experiment, data collection,
software, or reproduction. Free-form inside; rigorous at the interface.

## Contract (badge-general)

Every `contributions/<slug>/` has:

- `README.md` — filled badge checklist (start from `_template/README.md`)
- `report/report.tex` + committed `report/report.pdf` — detailed enough
  that paper writing never needs to re-read the code

The checklist distills ACM-style artifact badging, venue-agnostic: purpose
stated; self-contained; documented run path; environment captured; data
provenance recorded; outputs verifiable. Venue-specific badge work happens
later, in `papers/<slug>/artifacts/`.

## Environments

One root venv (uv workspace). A contribution with Python code keeps its own
`pyproject.toml` and registers in the root `[tool.uv.workspace] members`;
run `uv sync --all-packages` from the root (plain `uv sync` prunes the
members' dependencies on a `package = false` root). Conflicting dependencies
→ root `exclude` list + a local venv documented in the contribution README.

## Rules

- self-contained: no imports across contributions; promote shared tooling
  to its own contribution
- start new contributions by copying `_template/`
- keep run logs for claim-supporting experiments (develop-contribution
  skill)
- data: free-form inside; for shared/large/sensitive data or
  inter-contribution data dependencies, see the develop-contribution skill's
  `references/data.md`
