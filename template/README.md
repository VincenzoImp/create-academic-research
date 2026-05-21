# Academic Research Project

This repository is an academic research project created with
`create-academic-research`.

The repository is structured for reproducibility, scholarly evidence tracking,
and LLM-assisted research work. Notebooks are allowed for exploration and final
narrative analysis, but repeatable logic belongs in `src/`, `scripts/`, and
tested project code.

## Discipline Scope

This template is discipline-general. Use it for academic research projects in
any field, then specialize the methods, evidence standards, and venues for the
actual discipline. The companion `academic-research-skills` package gives
first-class support to computer science research while keeping the repository
structure useful for broader academic work.

The repository is agent-neutral. Capability state uses `agent: universal` by
default, which installs one shared project-local `.agents/skills` copy unless a
specific agent target is selected with `--agent`.

## Quickstart

Use Python 3.11 or newer.

```bash
npm install
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
npm run doctor
npm run update
```

## Core Folders

- `sources/`: curated papers, reports, metadata, BibTeX, and conversion ledgers.
- `sota/`: search strategy, screening, literature matrix, synthesis, and gaps.
- `wiki/`: LLM-maintained durable research memory.
- `docs/agent/`: active agent workflows, capability profile, and MCP setup.
- `docs/methodology/`: research design, evaluation plan, and validity threats.
- `experiments/`: curated experiment registry and run records.
- `scripts/`: thin repeatable entrypoints that call reusable code in `src/`.
- `notebooks/`: optional exploratory and narrative notebooks.
- `outputs/`: final figures, tables, models, and paper-supporting derived assets.
- `reports/`: proposal, paper, slides, reviews, and rebuttal material.
- `artifacts/`: open science and artifact evaluation preparation.
- `src/`: reusable project code.

## Agent Capabilities

Project-local skills and MCP records are managed with:

```bash
npm run skills:presets
npm run agents:list
npm run skills:install
npm run skills:install -- --preset enhanced
npm run skills:install -- source-ingestion sota-literature-review
npm run skills:list
npm run skills:status
npm run update
npm run setup
npm run mcp:dotenv
npm run mcp:list
npm run mcp:env -- openalex semantic-scholar zotero
npm run mcp:enable -- arxiv dblp
npm run mcp:commands -- arxiv
npm run mcp:install -- arxiv
npm run mcp:smoke -- --env-file .env.local
npm run mcp:doctor -- --env-file .env.local
npm run mcp:probe -- arxiv --timeout-ms 5000
```

`skills list` reports installed project-local skills. `skills presets` reports
available install presets. `mcp enable` changes project records. `mcp commands`
prints finite external install commands without running them. `mcp env` prints
env vars, hosted endpoints, local prerequisites, and setup commands before you
enable optional servers. `mcp install` runs only finite tool installation
commands; runtime-only `uvx`/`npx` MCP servers may have no install step and are
started later by the MCP client.

`.env.example` is the committed MCP environment reference. Regenerate it with
`npm run mcp:dotenv`. Copy it to `.env.local`, your shell profile, or your MCP
client secret store when secrets are needed. Filled `.env` files are ignored by
git. `mcp doctor` checks the current process environment unless you explicitly
pass `--env-file .env.local`.

`setup` prints the current project capability state, installed skill counts,
enabled MCP records, and the next onboarding commands without changing files.
`mcp smoke` performs a non-launching MCP readiness check: it reports required
env vars, local/manual setup, and whether client runtime commands such as `uvx`
or `npx` are available. `mcp probe` is opt-in and starts selected MCP servers
for a real stdio JSON-RPC handshake.

`default` installs the companion academic research skill package and keeps the
MCP records focused on low-friction arXiv discovery. `literature` and `full`
add DBLP for computer science bibliography. Credentialed, local-service, or
domain-specific MCP servers such as OpenAlex, Semantic Scholar, PubMed, Zotero,
and Overleaf should be enabled only after reading `docs/agent/mcp-setup.md` and
checking their prerequisites with `mcp env`.

See `docs/getting-started.md` for the recommended first session workflow.
