# Agent Operating Guide

Research topic: __PROJECT_TOPIC__

create-academic-research v0.2 scaffold: four entities, four directories.

## The Four Entities

| Directory | Entity | Local contract |
|---|---|---|
| `sota/` | digested papers + exploration queue | `sota/README.md` |
| `survey/` | THE reading reference for the whole SOTA | `survey/README.md` |
| `contributions/` | self-contained badge-compliant research units | `contributions/README.md` |
| `papers/` | one folder per venue submission | `papers/README.md` |

Read the local README before touching a directory: it owns the format, so
things land in the right place. The skills own the procedures — match the task
to a skill, which writes into the entity shown:

- grow the SOTA → `explore-sota` (the loop) / `digest-paper` (one paper) → `sota/`
- write or update the survey → `write-survey` → `survey/survey.tex`
- build a research unit (analysis, experiment, dataset, code, reproduction) →
  `develop-contribution` → `contributions/<slug>/`
- assemble a venue paper → `write-paper` → `papers/<slug>/`
- bundle the submission artifacts → `package-artifacts` → `papers/<slug>/artifacts/`
- submit / rebut / revise / camera-ready → `manage-submission` → `papers/<slug>/`
- review before submitting → `adversarial-review` (survey, contribution, or paper)

Typical order: explore/digest → survey → contribution → paper → artifacts →
submission, with `adversarial-review` before any submission.

## Invariants

- One paper = one `sota/papers/<citekey>/` folder = one `references.bib`
  entry = one `sota/index.md` row (1:1:1).
- `references.bib` is the only bibliography. Survey, reports, and
  manuscripts all cite it. Non-paper entries live under its WHITELIST
  marker.
- A citation exists only if an MCP lookup produced it — never fall back to
  memory or web scraping. SOTA work does not start until `arxiv` (full text)
  and at least one bibliographic source (`semantic-scholar`, `dblp`, or
  `openalex`) are reachable. API keys never gate: a missing key means
  throttled access, not a stop. When a reachable source is down, proceed with
  the rest and note the reduced cross-check in the synthesis.
- Every required `.tex` keeps its built PDF committed beside it. After
  editing any `.tex`, run its make target.
- Removing a SOTA paper is a soft exclusion (`status: excluded` in
  metadata.yaml and index.md). Hard deletion only after
  `grep -rF '\cite{<key>}' survey contributions papers/*/manuscript`
  comes back empty.
- Run `make check` before finishing any task. Fix what it reports.

## Scholarly MCP Routing

The SOTA start gate is by capability, never by API key (a missing key only
throttles). `explore-sota`/`digest-paper` start when both hold:

- **fetch full text** → `arxiv` (required)
- **resolve identity / version / metadata** → at least one of
  `semantic-scholar`, `dblp`, `openalex` (any one)

Roles when reachable — use every reachable source, reconcile by DOI:

- find/download papers → `arxiv`
- citation graph and authoritative-version resolution → `semantic-scholar`
- CS venue names and BibTeX → `dblp`
- open-metadata cross-check → `openalex`
- precedence on conflicts: dblp > semantic-scholar > openalex > arxiv

Optional discovery aggregators never gate.

## Commands

`make check` · `make survey` · `make contribution C=<slug>` ·
`make paper P=<slug>` · `make pdfs` · `uv sync`

## Out of Bounds

- never commit `.env*` (except `.env.example`), secrets, or `.venv/`
- never edit `papers/*/archive/` — frozen submissions are immutable
- never write a bibliography entry from memory
