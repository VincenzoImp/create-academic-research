# __PROJECT_TITLE__

__PROJECT_TOPIC__

This project follows the create-academic-research v0.2 scaffold: four
entities, four directories, one bibliography.

```
sota/           digested papers (PDF + synthesis + metadata) + exploration queue
survey/         THE reading reference for the whole SOTA (LaTeX + committed PDF)
contributions/  self-contained, badge-compliant research units
papers/         one folder per venue submission (manuscript, artifacts, archive)
references.bib  the single bibliography for everything
```

## Quickstart

```bash
cp .env.example .env   # add API keys (recommended)
make check             # structure validation — run before finishing any task
```

Work through the project skills (installed in this repo): `explore-sota` to
build the SOTA, `digest-paper` for single papers, `write-survey`,
`develop-contribution`, `write-paper`, `package-artifacts`,
`manage-submission`, `adversarial-review`.

Skills are installed for Claude Code under `.claude/skills/`. Using another
agent? Re-run from the project root with your agent id:
`npx -y skills add VincenzoImp/academic-research-skills --skill '*' --copy --agent <id> -y`

## Toolchain

- `git`, `make`, `latexmk` (TeX distribution)
- `uv` — required: provisions Python (≥3.11, auto-installed), runs the scholarly
  MCP servers via `uvx`, and manages the project venv via `uv sync`
- `node` — required: the always-on `openalex` MCP server runs via `npx`

## Build targets

| Command | Effect |
|---|---|
| `make check` | validate structure (scripts/check.py) |
| `make survey` | build survey/survey.pdf |
| `make contribution C=<slug>` | build a contribution report |
| `make paper P=<slug>` | build a manuscript |
| `make pdfs` | rebuild everything that changed |
| `make clean` | remove the LaTeX aux dir (.build/) — never the PDFs |

## Environments

One root venv (uv workspace). Python contributions keep their own
`pyproject.toml` and register in `[tool.uv.workspace] members`; run
`uv sync` from the root. Conflicting dependencies: move the contribution to
the `exclude` list and give it a local venv (document it in its README).

## MCP servers

Configured in `.mcp.json`. API keys live in the gitignored `.env` (copy it
from `.env.example`): each server that needs a key is launched through a small
shell prologue that sources `.env` before exec, so keys are never committed
and never have to be exported globally. A citation exists only if an MCP
lookup produced it.

| Server | Tier | Needs |
|---|---|---|
| arxiv | always on | nothing |
| semantic-scholar | always on | `SEMANTIC_SCHOLAR_API_KEY` optional (raises limits) |
| dblp | always on | nothing |
| openalex | always on | `OPENALEX_API_KEY` optional; runs via `npx` (Node) |
| paper-search | always on | nothing; `PAPER_SEARCH_MCP_UNPAYWALL_EMAIL` optional |
| zotero | opt-in | Zotero desktop + zoty setup |
| overleaf | opt-in | manual setup (below) |

The always-on `paper-search` aggregates many sources; keep its Sci-Hub and
Google-Scholar-scraping sources disabled (off by default).

Add an opt-in server by pasting its snippet into `.mcp.json` under
`mcpServers`:

```jsonc
// zotero — read-only mirror of your Zotero library (never system of record)
// requires the Zotero desktop app and one-time setup:
//   uvx --refresh zoty setup && uvx --refresh zoty doctor
"zotero": { "command": "uvx", "args": ["zoty", "mcp"] }
```

Overleaf (manual): clone
[YounesBensafia/overleaf-mcp-server](https://github.com/YounesBensafia/overleaf-mcp-server),
configure `OVERLEAF_TOKEN` and `PROJECT_ID`, and register it in `.mcp.json`
pointing at your local clone. It interfaces with an *external* Overleaf
project; nothing in this scaffold depends on it.
