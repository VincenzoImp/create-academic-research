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

Read the local README before touching a directory. READMEs define formats;
the project skills define procedures — use them for every pipeline task:
digest-paper, explore-sota, write-survey, develop-contribution, write-paper,
package-artifacts, manage-submission, adversarial-review.

## Invariants

- One paper = one `sota/papers/<citekey>/` folder = one `references.bib`
  entry = one `sota/index.md` row (1:1:1).
- `references.bib` is the only bibliography. Survey, reports, and
  manuscripts all cite it. Non-paper entries live under its WHITELIST
  marker.
- A citation exists only if an MCP lookup produced it. If the scholarly
  MCPs are unavailable, SOTA work stops — never fall back to memory or web
  scraping.
- Every required `.tex` keeps its built PDF committed beside it. After
  editing any `.tex`, run its make target.
- Removing a SOTA paper is a soft exclusion (`status: excluded` in
  metadata.yaml and index.md). Hard deletion only after
  `grep -rF '\cite{<key>}' survey contributions papers/*/manuscript`
  comes back empty.
- Run `make check` before finishing any task. Fix what it reports.

## Scholarly MCP Routing

- find/download papers → `arxiv`
- citation graph and authoritative-version resolution → `semantic-scholar`
- CS venue names and BibTeX → `dblp`
- cross-check every configured source; precedence on conflicts:
  dblp > semantic-scholar > openalex > arxiv (DOI reconciles records)

## Commands

`make check` · `make survey` · `make contribution C=<slug>` ·
`make paper P=<slug>` · `make pdfs` · `uv sync`

## Out of Bounds

- never commit `.env*` (except `.env.example`), secrets, or `.venv/`
- never edit `papers/*/archive/` — frozen submissions are immutable
- never write a bibliography entry from memory
