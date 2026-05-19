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

The repository is agent-neutral. Capability state uses `agent: auto` unless a
specific agent target is selected with `--agent`.

## Quickstart

Use Python 3.11 or newer.

```bash
npm install
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
npx academic-research doctor
```

## Core Folders

- `sources/`: curated papers, reports, metadata, BibTeX, and conversion ledgers.
- `sota/`: search strategy, screening, literature matrix, synthesis, and gaps.
- `wiki/`: LLM-maintained durable research memory.
- `docs/agent/`: active agent workflows, capability profile, and MCP setup.
- `docs/methodology/`: research design, evaluation plan, and validity threats.
- `experiments/`: curated experiment registry and run records.
- `notebooks/`: optional exploratory and narrative notebooks.
- `outputs/`: final figures, tables, models, and paper-supporting derived assets.
- `reports/`: proposal, paper, slides, reviews, and rebuttal material.
- `artifacts/`: open science and artifact evaluation preparation.
- `src/`: reusable project code.

## Agent Capabilities

Project-local skills and MCP records are managed with:

```bash
npx academic-research skills presets
npx academic-research skills install --preset default
npx academic-research skills list
npx academic-research skills status
npx academic-research mcp enable arxiv semantic-scholar openalex
npx academic-research mcp list
npx academic-research mcp commands arxiv
npx academic-research mcp install arxiv
```

`skills list` reports installed project-local skills. `skills presets` reports
available install presets. `mcp enable` changes project records. `mcp commands`
prints external install commands without running them. `mcp install` runs
external tool installation commands and should be used only after reviewing the
selected MCP.
