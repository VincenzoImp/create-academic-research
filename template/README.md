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
- `sources/zotero/`: optional Zotero import, collection, attachment, BibTeX, and source-ID reconciliation ledgers.
- `sota/`: search strategy, screening, literature matrix, synthesis, and gaps.
- `survey/`: SOTA-derived survey contract, outline, claim ledger, section plans, drafts, final artifacts, compliance notes, and reviews.
- `research_agenda/`: reviewed opportunity ledger, direction records, final agenda synthesis, and agenda reviews.
- `contributions/`: contribution packages, strict analysis templates, claim maps, badge plans, component outputs, reports, paper exports, reviews, and archives.
- `paper_frames/`: paper frame ledger, selected contributions, argument/evidence maps, venue fit, badge fit, release plan, outline, reviews, and decisions.
- `paper_releases/`: paper-specific release manifests, source maps, locks, checksums, staged artifacts, metadata, reviews, and archives.
- `paper_submissions/`: submission manifests, cover letters, submitted locks, decision letters, concern maps, response letters, rebuttals, revision plans, and camera-ready state.
- `reports/paper/`: manuscript ledgers, LaTeX templates, claim maps, citation maps, asset maps, reviews, and paper reports.
- `wiki/`: LLM-maintained durable research memory.
- `docs/agent/`: active agent workflows, capability profile, and MCP setup.
- `docs/agent/project-quality.md`: cross-project quality, hygiene, and badge-readiness contract.
- `compliance/`: project-level badge, open-science, method-reporting, survey-reporting, dataset, model-release, and venue checklist profile registry.
- `docs/methodology/`: research design, evaluation plan, and validity threats.
- `experiments/`: curated experiment registry and run records.
- `experiments/campaigns/`: autonomous campaign templates and frontier result ledgers.
- `scripts/`: thin repeatable entrypoints that call reusable code in `src/`.
- `notebooks/`: optional exploratory and narrative notebooks.
- `outputs/`: final figures, tables, models, and paper-supporting derived assets.
- `reports/`: proposal, paper, slides, reviews, and rebuttal material.
- `artifacts/`: open science and artifact evaluation preparation.
- `src/`: reusable project code.

Future workflow layers, including `paper_submissions/`, are governed by
`docs/agent/research-workflow.md`.

Prompt-level workflow playbooks live in `docs/agent/workflow-prompts/`. Run the
matching `npm run workflow:<stage>` command first, then follow the prompt for
skills, ledgers, review loops, and handoff gates.

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
npm run workflow:literature
npm run workflow:survey
npm run workflow:agenda
npm run workflow:contribution
npm run workflow:analysis
npm run workflow:frame
npm run workflow:release
npm run workflow:manuscript
npm run workflow:submission
npm run workflow:response
npm run mcp:dotenv
npm run mcp:list
npm run mcp:modes
npm run mcp:status
npm run mcp:env -- openalex semantic-scholar zotero
npm run mcp:enable -- openalex --mode remote
npm run mcp:enable -- arxiv dblp
npm run mcp:setup -- overleaf --mode local --env-file .env.local
npm run mcp:client:add -- overleaf --agent codex --dry-run
npm run mcp:commands -- arxiv
npm run mcp:install -- arxiv
npm run mcp:smoke -- --env-file .env.local
npm run mcp:doctor -- --env-file .env.local
npm run mcp:probe -- arxiv --timeout-ms 5000
```

`skills list` reports installed project-local skills. `skills presets` reports
available install presets. `mcp enable` changes selected project records and
can record explicit modes such as `--mode remote`. Use `mcp modes` to see
which integrations support local, remote, custom remote, local-app, or manual
setup paths. `mcp status` separates selected records from setup, snippet,
client registration, and probe readiness; add `--verbose` for technical fields.
`mcp commands`
prints finite external install commands without running them. `mcp env` prints
env vars, hosted endpoints, local prerequisites, and setup commands before you
enable optional servers. `mcp install` runs only finite tool installation
commands; runtime-only `uvx`/`npx` MCP servers may have no install step and are
started later by the MCP client.

`npm run update` always uses `create-academic-research@latest` so older
projects can preview scaffold migrations with one command. It is a dry-run
unless you pass `-- --apply`; safe managed files are tracked in
`.academic-research/managed-files.json` and locally edited files are skipped
instead of overwritten. If this project was created before the latest update
script existed, run:

```bash
npm exec --yes --package=create-academic-research@latest -- academic-research update --root .
npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply
```

### Migration 0.1.17 -> 0.1.18

Projects created with `0.1.17` can migrate in place:

```bash
npm run update
npm run update -- --apply
npm run doctor
```

The migration adds the project-quality contract, badge evidence ledger, SOTA
reading and citation-chasing ledgers, paper synthesis folders, linear reading
copies, autonomous experiment campaign files, claim-audit and reproduction
templates, and `workflow:literature`. Locally edited managed files are skipped;
new research record templates are created for the project to fill over time.

`.env.example` is the committed MCP environment reference. Regenerate it with
`npm run mcp:dotenv`. Copy it to `.env.local`, your shell profile, or your MCP
client secret store when secrets are needed. Filled `.env` files are ignored by
git. `mcp doctor` checks the current process environment unless you explicitly
pass `--env-file .env.local`.

`setup` prints the current project capability state, installed skill counts,
selected MCP records, and the next onboarding commands. With
`-- --env-file .env.local`, it can complete safe project-local setup such as the
Overleaf wrapper and generated MCP snippet. It does not register global MCP
clients.
`mcp smoke` performs a non-launching MCP readiness check: it reports required
env vars, local/manual setup, and whether client runtime commands such as `uvx`
or `npx` are available. `mcp probe` is opt-in: local stdio servers get a real
JSON-RPC handshake, while remote endpoints are reported as configured without a
network probe.

Overleaf setup creates a local wrapper under `.academic-research/mcp/` that
parses `.env.local` safely at runtime. The wrapper path and client/probe
observations are recorded in `docs/agent/capability-lock.json`; project-local
skill install/update/remove observations are recorded there too.
`configs/capabilities.yaml` is intended state, while the capability lock is
observed setup state. Token values are not stored there or in generated
snippets.

`default` installs the companion academic research skill package and keeps the
MCP records focused on low-friction arXiv discovery. `literature` and `full`
add DBLP for computer science bibliography. Credentialed, local-service, or
domain-specific MCP servers such as OpenAlex, Semantic Scholar, PubMed, Zotero,
and Overleaf should be enabled only after reading `docs/agent/mcp-setup.md` and
checking their prerequisites with `mcp env`.

See `docs/getting-started.md` for the recommended first session workflow.

For a serious SOTA or survey, start with:

```bash
npm run workflow:literature
npm run skills:install -- --preset literature
npm run mcp:status
npm run mcp:smoke -- --env-file .env.local
```

This configures arXiv, DBLP, Semantic Scholar, and OpenAlex remote graph search
as the practical citation-discovery stack. MCP output still becomes evidence
only after source ingestion, full-text reading, bibliography normalization, and
claim audit.
