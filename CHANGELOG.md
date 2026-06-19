# Changelog

## 0.3.0

Usability and conventions release. The scaffold is feature-complete on the
four-entity architecture; this release sharpens the agent-facing guidance and
adds a balanced, optional data convention. No structural change to generated
projects.

- `template/AGENTS.md` now frames the **two-repo system**: the project is
  scaffolded by create-academic-research and operated through the
  academic-research-skills skill set (installed under `.claude/skills/`, pinned
  in `skills-lock.json`). The guide makes explicit where each thing lives, how to
  do each task, and what never to do — the full usability map of both repos.
- Light, optional **data routing**: `template/contributions/README.md` and
  `template/AGENTS.md` point to the new `develop-contribution` skill reference
  `references/data.md` for shared/large/sensitive data and inter-contribution
  data dependencies; `template/gitignore` ignores a root `data/` (root only — a
  contribution's intentionally-tracked `data/` is unaffected). The convention is
  opt-in and does not weight data-driven projects over theory/survey/reproduction
  projects.
- Pairs with academic-research-skills 0.3.0.

## 0.2.2

Bibliography-style conventions per document type, and a usable base paper.

- Survey renders **author-year** (`template/survey/survey.tex` →
  `style=authoryear,natbib=true`): a discursive literature review reads better as
  "Author (Year)" than numbered `[1]`. Contribution reports stay **numeric**. A
  paper's style is the venue's; the base manuscript (below) defaults to numeric.
- The paper `_template/manuscript/main.tex` is now a **general, compilable base**
  manuscript (standard preamble; biblatex numeric reading the root
  `references.bib` via the relative path; no imposed sections) instead of a
  one-line stub — start drafting before a venue is fixed, then replace it with the
  venue's official template. Venue-neutral (no venue named).
- The per-document-type convention is documented in `survey/README.md` and
  `papers/README.md`.

## 0.2.1

Fixes to MCP environment handling, default servers, the SOTA start gate, and
Python version handling (no scaffold-shape changes; safe to apply to a 0.2.0
project).

- `paper-search` joins the always-on stack; the default stays Node-free. The
  always-on scholarly MCPs are now `arxiv`, `semantic-scholar`, `dblp`, and
  `paper-search` — all via `uvx`, no Node. Their keys (where any) remain optional
  boosts read from `.env`. `paper-search`'s Sci-Hub and Google Scholar connectors
  are opt-in and off by default. `openalex` is **opt-in** (its only comprehensive
  servers need Node/`npx`); OpenAlex is still reachable through the always-on
  `paper-search`. `zotero` (needs the desktop app) and `overleaf` (needs a token)
  stay opt-in. Preserves 0.2.0's "no Node dependency" for generated projects.
- Python is provisioned at ">=3.11" via uv. `make check` and the tests run
  `uv run --no-project --python '>=3.11' python …`, so the structural checks no
  longer depend on the system `python3` (which may be <3.11 and lack `tomllib`).
  `requires-python = ">=3.11"` is unchanged — 3.11 is the floor, any newer
  interpreter is used if present (no pinned `.python-version`).
- `.mcp.json` now actually loads `.env`. `${VAR}` expansion reads the MCP
  client's own environment and Claude Code does not auto-load `.env`, so keys
  placed in `.env` never reached the servers. Each server that needs a key is
  now launched through a small POSIX-sh prologue that sources `.env` before
  exec (`set -a; [ -f .env ] && . ./.env; set +a; exec "$@"`), passing the
  real command and args positionally. Keyless servers (arxiv, dblp) launch
  directly. Keys stay in `.env`: never committed, never globally exported.
- Single env file. `.env` is the only secret store; `.env.example` documents
  the `cp .env.example .env` workflow. (No `.env.local`.)
- SOTA start gate is by capability, never by API key. Work starts when `arxiv`
  (full text) and at least one bibliographic source (`semantic-scholar`,
  `dblp`, or `openalex`) are reachable; a missing key only throttles, and a
  reachable source being down degrades the cross-check rather than stopping.
  (Companion preflight rule updated in academic-research-skills 0.2.1.)
- Full-text fallback pipeline documented (`sota/README.md`): fetch `paper.pdf`
  most-authoritative/legal first — arxiv → publisher/DOI open-access →
  Unpaywall → green-OA repositories → Sci-Hub (opt-in, last resort). The PDF is
  only the reading copy; the citation and authoritative version always come
  from the scholarly MCPs (reconciled by DOI). Source URL recorded in
  `pdf_source`. (Companion `digest-paper` step updated in
  academic-research-skills 0.2.1.)

## 0.2.0

Full from-scratch rewrite around four entities: SOTA, survey,
contributions, papers.

- The generated project drops ~25 v0.1 directories and all CSV ledgers for
  four entity trees + one root `references.bib` (1:1:1 invariant with
  `sota/papers/` and `sota/index.md`, enforced by `scripts/check.py`).
- The CLI shrinks to a single scaffold wizard (`--yes`,
  `--no-install-skills`, `--no-git`). Removed: doctor, update, rename,
  init, setup, and the `mcp:*`, `skills:*`, `workflow:*` command families.
- Generated projects have no Node dependency: Makefile + latexmk +
  python3 + uv. Built PDFs are committed next to every required `.tex`.
- MCP config is three files (`.mcp.json`, `.env.example`, README catalog);
  arxiv, semantic-scholar, dblp always on; openalex strongly recommended;
  zotero/overleaf opt-in; pubmed/crossref/paper-search dropped.
- One root venv via uv workspace; per-contribution `pyproject.toml`.
- Companion skills rewritten as 8 skills in academic-research-skills 0.2.0.

Migration: v0.1 projects are not auto-migrated (the `update` command is
gone). Keep them on 0.1.x or start a fresh project and move content.

Release notes are generated from merged commits and pull requests in GitHub
Releases:

https://github.com/VincenzoImp/create-academic-research/releases

This file intentionally does not duplicate release entries, so the repository
has one authoritative changelog source.
