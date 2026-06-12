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

- `git`, `make`, `python3` (≥3.11), `latexmk` (TeX distribution)
- `uv` — required: `uvx` runs the scholarly MCP servers, and `uv sync`
  manages the single project venv
- Node is needed only if the optional `openalex` MCP server is enabled

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

Configured in `.mcp.json`; secrets come from your shell environment via
`${VAR}` expansion (see `.env.example`). A citation exists only if an MCP
lookup produced it.

| Server | Tier | Needs |
|---|---|---|
| arxiv | always on | nothing |
| semantic-scholar | always on | `SEMANTIC_SCHOLAR_API_KEY` recommended |
| dblp | always on | nothing |
| openalex | strongly recommended | `OPENALEX_API_KEY` |
| zotero | opt-in | Zotero desktop + zoty setup |
| overleaf | opt-in | manual setup (below) |

Add an optional server by pasting its snippet into `.mcp.json` under
`mcpServers`:

```jsonc
// openalex — cross-discipline coverage (requires OPENALEX_API_KEY)
"openalex": {
  "command": "npx",
  "args": ["-y", "@cyanheads/openalex-mcp-server@latest"],
  "env": { "OPENALEX_API_KEY": "${OPENALEX_API_KEY}" }
}

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
