# Changelog

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
