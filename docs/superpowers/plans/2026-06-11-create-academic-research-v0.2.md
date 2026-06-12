# create-academic-research v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the creator from scratch: a minimal wizard (~500–800 lines TS) that scaffolds the v0.2 four-entity research project per `docs/superpowers/specs/2026-06-11-research-scaffold-v0.2-design.md`.

**Architecture:** A static `template/` tree (the product) + three small TS units: `src/mcp.ts` (MCP catalog → `.mcp.json`), `src/scaffold.ts` (copy + substitute + git + skills install), `bin/create-academic-research.ts` (flag parsing + @clack/prompts wizard). Placeholders use `__PROJECT_TITLE__` / `__PROJECT_TOPIC__` / `__PROJECT_SLUG__` (not `{{}}`, which collides with LaTeX braces). Structure discipline in generated projects comes from `template/scripts/check.py` + `template/Makefile`.

**Tech Stack:** TypeScript (NodeNext, Node ≥20), `@clack/prompts`, `node:test`, Python 3.11+ stdlib for the in-template validator, GitHub Actions.

**Repo:** `/Users/vincenzo/Documents/GitHub/VincenzoImp/create-academic-research`, branch `redesign-0.2` (already exists). All commands run from the repo root.

**Execute AFTER the academic-research-skills v0.2 plan** (the wizard's install step pulls that repo's main branch — until it merges, test with `--no-install-skills`).

---

### Task 1: Wipe v0.1 content

**Files:**
- Delete: `src/`, `bin/`, `tests/`, `template/`, `scripts/`, `dist/`, `package-lock.json`
- Keep: `docs/` (spec + plans), `LICENSE`, `SECURITY.md`, `.gitignore`, `.github/`, `README.md`, `CHANGELOG.md`, `package.json`, `tsconfig.json` (all rewritten by later tasks)

- [ ] **Step 1: Confirm branch and remove v0.1 content**

```bash
git checkout redesign-0.2
git rm -r -q src bin tests template scripts package-lock.json
git rm -r -q --ignore-unmatch dist
rm -rf dist node_modules
```

- [ ] **Step 2: Verify what remains**

Run: `git status --short | head -5 && git ls-files | grep -v '^docs/' | sort`
Expected remaining (non-docs): `.github/*`, `.gitignore`, `CHANGELOG.md`, `LICENSE`, `README.md`, `SECURITY.md`, `package.json`, `tsconfig.json`

- [ ] **Step 3: Commit**

```bash
git commit -m "chore!: remove v0.1 CLI, template, and tests for the v0.2 rewrite"
```

---

### Task 2: Minimal package.json and tsconfig

**Files:**
- Modify: `package.json` (full rewrite)
- Modify: `tsconfig.json` (full rewrite)

- [ ] **Step 1: Rewrite `package.json`**

```json
{
  "name": "create-academic-research",
  "version": "0.2.0",
  "description": "Scaffold a four-entity academic research project: SOTA, survey, contributions, papers — one root bibliography, MCP-verified citations, agent skills.",
  "type": "module",
  "license": "MIT",
  "author": "Vincenzo Imperati",
  "keywords": [
    "academic-research",
    "research-scaffold",
    "literature-review",
    "sota",
    "survey",
    "agent-skills",
    "mcp",
    "arxiv",
    "reproducibility",
    "open-science"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/VincenzoImp/create-academic-research.git"
  },
  "bugs": {
    "url": "https://github.com/VincenzoImp/create-academic-research/issues"
  },
  "homepage": "https://github.com/VincenzoImp/create-academic-research#readme",
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "engines": {
    "node": ">=20"
  },
  "bin": {
    "create-academic-research": "dist/bin/create-academic-research.js"
  },
  "files": [
    "dist",
    "template",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "SECURITY.md"
  ],
  "scripts": {
    "clean": "rm -rf dist",
    "build": "npm run clean && tsc",
    "typecheck": "tsc --noEmit",
    "test": "npm run build && node --test",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@clack/prompts": "^0.11.0"
  },
  "devDependencies": {
    "@types/node": "^22.19.19",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Rewrite `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "declaration": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["bin/**/*.ts", "src/**/*.ts"]
}
```

- [ ] **Step 3: Install and verify**

```bash
npm install
mkdir -p src bin
printf 'export const ok = true;\n' > src/mcp.ts
printf 'console.log("wip");\n' > bin/create-academic-research.ts
npm run typecheck
```

Expected: typecheck exits 0 (placeholder sources are replaced by later tasks)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/mcp.ts bin/create-academic-research.ts
git commit -m "feat: minimal package manifest and TypeScript config for v0.2"
```

---

### Task 3: Template root files

**Files:**
- Create: `template/README.md`, `template/AGENTS.md`, `template/CLAUDE.md`, `template/references.bib`, `template/gitignore` (no dot — renamed to `.gitignore` at create time; npm strips dotted gitignore files from packages), `template/pyproject.toml`, `template/.env.example`, `template/Makefile`

- [ ] **Step 1: Write `template/README.md`**

````markdown
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
````

- [ ] **Step 2: Write `template/AGENTS.md`**

```markdown
# Agent Operating Guide

Academic research project: __PROJECT_TOPIC__

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
```

- [ ] **Step 3: Write `template/CLAUDE.md`**

```markdown
@AGENTS.md
```

- [ ] **Step 4: Write `template/references.bib`**

```bibtex
% references.bib — THE single bibliography for this project.
%
% SOTA section: one entry per sota/papers/<citekey>/ folder (1:1:1
% invariant, enforced by scripts/check.py). Entries are produced by the
% digest-paper skill from MCP lookups — never written from memory.
%
% Entries below the WHITELIST marker are exempt from the 1:1:1 check:
% software, datasets, standards, and other non-paper citations.

% =========================== WHITELIST ===========================
```

- [ ] **Step 5: Write `template/gitignore`**

```
.venv/
.build/
__pycache__/
node_modules/
.env
.env.*
!.env.example
.DS_Store
# LaTeX aux that escapes .build/
*.aux
*.bbl
*.bcf
*.blg
*.fls
*.fdb_latexmk
*.log
*.out
*.run.xml
*.synctex.gz
*.toc
```

- [ ] **Step 6: Write `template/pyproject.toml`**

```toml
[project]
name = "__PROJECT_SLUG__"
version = "0.0.0"
description = "__PROJECT_TOPIC__"
requires-python = ">=3.11"

[tool.uv]
package = false

[tool.uv.workspace]
members = []
exclude = []
```

- [ ] **Step 7: Write `template/.env.example`**

```bash
# Semantic Scholar (recommended): sustained citation chasing without
# shared-pool throttling. https://www.semanticscholar.org/product/api
SEMANTIC_SCHOLAR_API_KEY=

# OpenAlex (required only if the openalex MCP server is enabled in
# .mcp.json). https://docs.openalex.org/
OPENALEX_API_KEY=
```

- [ ] **Step 8: Write `template/Makefile`**

```make
LATEXMK = latexmk -pdf -interaction=nonstopmode -halt-on-error
AUX = $(CURDIR)/.build

.PHONY: check pdfs survey contribution paper clean

check:
	python3 scripts/check.py

survey:
	$(LATEXMK) -cd -auxdir=$(AUX)/survey survey/survey.tex

contribution:
	@test -n "$(C)" || { echo "usage: make contribution C=<slug>"; exit 1; }
	$(LATEXMK) -cd -auxdir=$(AUX)/contribution-$(C) contributions/$(C)/report/report.tex

paper:
	@test -n "$(P)" || { echo "usage: make paper P=<slug>"; exit 1; }
	$(LATEXMK) -cd -auxdir=$(AUX)/paper-$(P) papers/$(P)/manuscript/main.tex

pdfs: survey
	@for t in contributions/*/report/report.tex papers/*/manuscript/main.tex; do \
		[ -e "$$t" ] || continue; \
		case "$$t" in */_template/*) continue;; esac; \
		$(LATEXMK) -cd -auxdir=$(AUX)/$$(echo "$$t" | tr / -) "$$t"; \
	done

clean:
	rm -rf .build
```

(Tabs, not spaces, for recipe lines.)

- [ ] **Step 9: Commit**

```bash
git add template
git commit -m "feat(template): root files — README, AGENTS, bib, gitignore, pyproject, env, Makefile"
```

---

### Task 4: Template `sota/`, `survey/`, `contributions/`, `papers/`

**Files:**
- Create: `template/sota/README.md`, `template/sota/index.md`, `template/sota/queue.md`, `template/sota/papers/.gitkeep`
- Create: `template/survey/README.md`, `template/survey/survey.tex`, `template/survey/coverage.md`
- Create: `template/contributions/README.md`, `template/contributions/_template/README.md`, `template/contributions/_template/report/report.tex`
- Create: `template/papers/README.md`, `template/papers/_template/venue.md`, `template/papers/_template/framing.md`, `template/papers/_template/manuscript/main.tex`, `template/papers/_template/artifacts/.gitkeep`, `template/papers/_template/correspondence/.gitkeep`, `template/papers/_template/archive/.gitkeep`

- [ ] **Step 1: Write `template/sota/README.md`**

````markdown
# SOTA

One folder per digested paper under `papers/<citekey>/`, an index, and an
exploration queue. Grown via the digest-paper and explore-sota skills.

## Digestion rules

Digesting a paper means ALL of the following, atomically (1:1:1 invariant):

1. resolve the most authoritative version via MCP lookups (published venue
   > latest arXiv revision > other preprint) — never from memory
2. save the full-text PDF as `papers/<citekey>/paper.pdf`
3. write `synthesis.md` (format below) after reading the full paper
4. add the normalized BibTeX entry to the SOTA section of `references.bib`
5. write `metadata.yaml` (schema below), including the mandatory
   `verified:` block
6. add the row to `index.md`

No legal full text → the paper stays in `queue.md` (decision
`unresolvable-via-mcp`, or rejected with a reason). Abstract-only digestion
is forbidden.

## synthesis.md format (exact section order)

1. Header: title, authors, year, venue, citekey
2. Problem & motivation
3. Approach / method
4. Key contributions
5. Results & evidence
6. Limitations & assumptions
7. Relevance to this project
8. Connections — related citekeys in this SOTA, one line each on why
9. Safe claims / do-not-claim — what citing this paper can support, and
   what wording would overclaim
10. Citation leads — references/citers/terms/venues worth chasing (feed
    `queue.md`)

Exact numbers and quotations must be verified against `paper.pdf`.

## metadata.yaml schema

```yaml
citekey: <matches the folder name>
title: ...
authors: [ ... ]
year: 2022
venue: ...            # of the most authoritative version
doi: ...
arxiv: ...            # optional alias
pdf_source: <url>
status: digested      # digested | excluded (soft removal)
tags: [ ... ]
verified:             # mandatory — no verified block, no valid digest
  bib_source: <mcp id>
  record: <looked-up record url or id>
  citation_graph_source: semantic-scholar
  s2_id: <id>
  date: YYYY-MM-DD
cites:                # selected relevant outgoing references
  - <citekey or external id>
cited_by:             # selected relevant incoming citations
  - <citekey or external id>
```

## Removal

Soft exclusion: set `status: excluded` in `metadata.yaml` AND `index.md`;
folder, bib entry, and index row remain (1:1:1 intact); the survey drops
the key from `coverage.md`. Hard deletion only when
`grep -rF '\cite{<key>}'` over `survey/`, `contributions/`, and
`papers/*/manuscript/` is empty.

## index.md and queue.md

`index.md`: one table row per digested paper
(citekey | title | year | venue | tags | status).
`queue.md`: Scope block + candidate table
(title | id | found via | decision: pending / accepted /
rejected: reason / unresolvable-via-mcp).
````

- [ ] **Step 2: Write `template/sota/index.md`**

```markdown
# SOTA Index

One row per digested paper. Status: digested | excluded.

| citekey | title | year | venue | tags | status |
|---|---|---|---|---|---|
```

- [ ] **Step 3: Write `template/sota/queue.md`**

```markdown
# Exploration Queue

## Scope

- Research question: __PROJECT_TOPIC__
- Keywords / synonyms / adjacent terms: (fill before exploring)
- Inclusion criteria: (fill)
- Exclusion criteria: (fill)
- Review scale: (quick-scan ~8-15 | focused-sota ~20-40 | full-survey 50+)
- Stopping rule: saturation or budget; record blind spots here when
  stopping early

## Candidates

| title | id | found via | decision |
|---|---|---|---|
```

- [ ] **Step 4: Create `template/sota/papers/.gitkeep`** (empty file)

- [ ] **Step 5: Write `template/survey/README.md`**

```markdown
# Survey

`survey.tex` is the single reading reference for the whole SOTA: after
reading it, returning to syntheses or PDFs should rarely be necessary.

## Contract

- digests ALL digested papers in `sota/index.md` (the write-survey skill
  enforces the read-everything gate in create mode)
- groups the SOTA by themes/concepts/methodologies — whatever fits best
- discusses every paper's contributions and notable aspects in depth
  within its group(s); names comparisons, tensions, contradictions
- ends its content with a mandatory Gaps and Research Directions section
- single-column article, table of contents, no length limit
- cites exclusively via the root `references.bib`
- `survey.pdf` stays committed and fresh (`make survey`)

## coverage.md

Flat `- citekey` list of papers currently integrated in the text. The
write-survey skill diffs it against `sota/index.md` to apply additions and
removals surgically. Excluded papers (status `excluded`) must not appear.
```

- [ ] **Step 6: Write `template/survey/survey.tex`**

```latex
\documentclass[11pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[margin=2.5cm]{geometry}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage[hidelinks]{hyperref}
\usepackage[style=numeric,sorting=nyt,backend=biber]{biblatex}
\addbibresource{../references.bib}

\title{__PROJECT_TITLE__ --- State of the Art Survey}
\author{}
\date{\today}

\begin{document}
\maketitle
\tableofcontents
\newpage

\section{Introduction}
% Scope of this survey: what the SOTA covers and how it is organized.
% This skeleton is filled by the write-survey skill. See survey/README.md.

\section{Gaps and Research Directions}
% Mandatory final content section before the bibliography.

\printbibliography
\end{document}
```

- [ ] **Step 7: Write `template/survey/coverage.md`**

```markdown
# Survey Coverage

Citekeys currently integrated into survey.tex — the diff anchor for
write-survey update mode. One `- citekey` line each, nothing else below
this paragraph.
```

- [ ] **Step 8: Write `template/contributions/README.md`**

```markdown
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
run `uv sync` from the root. Conflicting dependencies → root `exclude`
list + a local venv documented in the contribution README.

## Rules

- self-contained: no imports across contributions; promote shared tooling
  to its own contribution
- start new contributions by copying `_template/`
- keep run logs for claim-supporting experiments (develop-contribution
  skill)
```

- [ ] **Step 9: Write `template/contributions/_template/README.md`**

```markdown
# <contribution title>

<one-paragraph purpose>

## Positioning

- Claim: <the claim this contribution supports>
- Delta vs nearest prior work: <cite citekeys>
- Evidence plan: <what is measured/collected and how>
- Falsifiability: <what outcome would refute the claim>

## Badge checklist (general — see contributions/README.md)

- [ ] Purpose stated and scoped
- [ ] Self-contained: no references outside this folder (inputs declared below)
- [ ] How to run: `<command>`
- [ ] Environment captured: <pyproject.toml | requirements.txt | Dockerfile | none needed>
- [ ] Data provenance recorded: <where inputs come from, license, collection date>
- [ ] Verifiable: `<verification command>` reproduces <expected output>
- [ ] Ethics reviewed: <none | notes per the develop-contribution ethics reference>

## Report

`report/report.pdf` — full motivation, method, setup, results, limitations.
```

- [ ] **Step 10: Write `template/contributions/_template/report/report.tex`**

```latex
\documentclass[11pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[margin=2.5cm]{geometry}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage[hidelinks]{hyperref}
\usepackage[style=numeric,sorting=nyt,backend=biber]{biblatex}
\addbibresource{../../../references.bib}

\title{Contribution Report: <title>}
\author{}
\date{\today}

\begin{document}
\maketitle
\tableofcontents

\section{Motivation}
% Why this contribution exists; the claim it supports; positioning vs the
% SOTA (cite citekeys from the root references.bib).

\section{Method}

\section{Setup}
% Environment, data, configuration — enough to re-run everything.

\section{Results}

\section{Limitations}

\printbibliography
\end{document}
```

- [ ] **Step 11: Write `template/papers/README.md`**

```markdown
# Papers

One folder per venue submission. The current version always lives in
`manuscript/`; every submitted round is frozen in `archive/`.

## Contract

Every `papers/<slug>/` has:

- `venue.md` — venue, rules, deadlines, badge/artifact requirements
- `framing.md` — story, claims → contributions mapping
- `manuscript/main.tex` (+ committed `main.pdf`) — on the venue's official
  template; the entry point is always renamed to `main.tex`; the
  bibliography reads the root `references.bib` (bibtex or biblatex,
  whichever the venue class dictates)
- `artifacts/` — the self-contained submission bundle (package-artifacts
  skill)
- `correspondence/` — reviews received, concern maps, response letters
- `archive/` — immutable frozen submissions: `r1/`, `r2/`, `camera-ready/`

## Rules

- never edit `archive/` contents
- new scientific work requested by reviewers goes through contributions
- start new papers by copying `_template/`
```

- [ ] **Step 12: Write `template/papers/_template/venue.md`**

```markdown
# Venue

- Venue / track:
- Deadline(s):
- Template source: <where the official LaTeX template comes from>
- Format rules: <page limit, anonymization, citation style>
- Badge / artifact requirements: <venue-specific>
- Review model: <single/double blind, rebuttal, revision cycles>
```

- [ ] **Step 13: Write `template/papers/_template/framing.md`**

```markdown
# Framing

- Story:
- Claims → contributions:
  - C1 <claim> → <contribution slug>
- Related work source: survey sections <...>
- Out of scope (deliberately):
```

- [ ] **Step 14: Write `template/papers/_template/manuscript/main.tex`**

```latex
% Placeholder manuscript. Replace this file and its siblings with the
% venue's official LaTeX template; keep the entry point named main.tex.
% The bibliography must read the root references.bib, e.g.:
%   \bibliography{../../../references}        % bibtex/natbib venues
%   \addbibresource{../../../references.bib}  % biblatex venues
\documentclass[11pt,a4paper]{article}
\title{<paper title>}
\begin{document}
\maketitle
Replace this placeholder with the venue template (see ../venue.md).
\end{document}
```

- [ ] **Step 15: Create the three `.gitkeep` files** (empty):
`template/papers/_template/artifacts/.gitkeep`,
`template/papers/_template/correspondence/.gitkeep`,
`template/papers/_template/archive/.gitkeep`

- [ ] **Step 16: Commit**

```bash
git add template
git commit -m "feat(template): sota, survey, contributions, papers trees with contracts and skeletons"
```

---

### Task 5: Placeholder survey.pdf generator

**Files:**
- Create: `scripts/make-placeholder-pdf.mjs` (creator repo tooling, not shipped in template)
- Create: `template/survey/survey.pdf` (generated, committed)

The placeholder PDF must exist before the check.py tests (Task 6): a fresh
template has to satisfy the PDF rule without a TeX installation.

- [ ] **Step 1: Write `scripts/make-placeholder-pdf.mjs`**

```js
// Generates a minimal valid one-page PDF used as the committed placeholder
// for template/survey/survey.pdf. Real projects replace it via `make survey`.
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "template/survey/survey.pdf";
const text = "Survey skeleton - run `make survey` to build the real PDF.";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
];
const stream = `BT /F1 12 Tf 72 770 Td (${text}) Tj ET`;
objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

const header = "%PDF-1.4\n";
let body = "";
const offsets = [];
let pos = Buffer.byteLength(header);
objects.forEach((obj, i) => {
  const s = `${i + 1} 0 obj\n${obj}\nendobj\n`;
  offsets.push(pos);
  body += s;
  pos += Buffer.byteLength(s);
});
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;

writeFileSync(out, header + body + xref + trailer);
console.log("wrote", out);
```

- [ ] **Step 2: Generate and verify the PDF**

```bash
node scripts/make-placeholder-pdf.mjs
file template/survey/survey.pdf
```

Expected: `template/survey/survey.pdf: PDF document, version 1.4`

- [ ] **Step 3: Commit**

```bash
git add scripts/make-placeholder-pdf.mjs template/survey/survey.pdf
git commit -m "feat(template): committed placeholder survey.pdf so fresh projects pass make check"
```

---

### Task 6: `template/scripts/check.py` with fixture tests

**Files:**
- Create: `template/scripts/check.py`
- Test: `tests/check.test.mjs`

- [ ] **Step 1: Write the failing test `tests/check.test.mjs`**

```js
import assert from "node:assert/strict";
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const TEMPLATE = new URL("../template", import.meta.url).pathname;
const BIB_MARKER = "% =========================== WHITELIST ===========================";

const VALID_METADATA = `citekey: qin2022quantifying
title: Quantifying Blockchain Extractable Value
authors: [Kaihua Qin]
year: 2022
venue: IEEE S&P
doi: 10.1109/SP46214.2022.9833734
arxiv: "2101.05511"
pdf_source: https://arxiv.org/pdf/2101.05511
status: digested
tags: [mev]
verified:
  bib_source: dblp
  record: https://dblp.org/rec/conf/sp/QinZG22
  citation_graph_source: semantic-scholar
  s2_id: abc123
  date: 2026-06-11
cites: []
cited_by: []
`;

async function freshProject() {
  const root = await mkdtemp(join(tmpdir(), "check-"));
  const target = join(root, "proj");
  cpSync(TEMPLATE, target, { recursive: true });
  return target;
}

function runCheck(target) {
  return spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
}

function addPaperFolder(target, metadata = VALID_METADATA) {
  const dir = join(target, "sota", "papers", "qin2022quantifying");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "paper.pdf"), "%PDF-fake");
  writeFileSync(join(dir, "synthesis.md"), "# Quantifying BEV (qin2022quantifying)\n");
  writeFileSync(join(dir, "metadata.yaml"), metadata);
  return dir;
}

function addBibAndIndex(target) {
  const bibPath = join(target, "references.bib");
  const entry = "@inproceedings{qin2022quantifying,\n  title={Quantifying},\n  year={2022}\n}\n";
  writeFileSync(bibPath, readFileSync(bibPath, "utf8").replace(BIB_MARKER, entry + "\n" + BIB_MARKER));
  appendFileSync(
    join(target, "sota", "index.md"),
    "| qin2022quantifying | Quantifying BEV | 2022 | IEEE S&P | mev | digested |\n"
  );
}

test("fresh template passes check.py", async () => {
  const target = await freshProject();
  const r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("paper folder without bib entry and index row fails 1:1:1", async () => {
  const target = await freshProject();
  addPaperFolder(target);
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /references\.bib/);
  assert.match(r.stderr, /index\.md/);
});

test("complete digested paper passes; missing verified block fails", async () => {
  const target = await freshProject();
  const dir = addPaperFolder(target);
  addBibAndIndex(target);
  let r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  writeFileSync(
    join(dir, "metadata.yaml"),
    VALID_METADATA.replace("verified:", "unverified:")
  );
  r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /verified/);
});

test("whitelisted bib entries need no SOTA folder", async () => {
  const target = await freshProject();
  appendFileSync(
    join(target, "references.bib"),
    "\n@software{foundry2023,\n  title={Foundry}\n}\n"
  );
  const r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("coverage citekey not in SOTA fails", async () => {
  const target = await freshProject();
  appendFileSync(join(target, "survey", "coverage.md"), "\n- ghost2020paper\n");
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /coverage/);
});

test("contribution without report fails; _template is skipped", async () => {
  const target = await freshProject();
  mkdirSync(join(target, "contributions", "my-analysis"), { recursive: true });
  writeFileSync(join(target, "contributions", "my-analysis", "README.md"), "# x\n");
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /my-analysis/);
});

test("missing survey.pdf fails the PDF rule", async () => {
  const target = await freshProject();
  rmSync(join(target, "survey", "survey.pdf"), { force: true });
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /survey\.pdf/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | tail -10`
Expected: FAIL — every test errors because `template/scripts/check.py` does not exist (python3 exits non-zero with "No such file")

- [ ] **Step 3: Write `template/scripts/check.py`**

```python
#!/usr/bin/env python3
"""Structure validator for this research project (create-academic-research v0.2).

Enforces the four-entity scaffold invariants. Stdlib only; Python >= 3.11
recommended (the uv-workspace check degrades to a warning below 3.11).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[1]
# Must match only the dedicated marker line in references.bib
# ("% =========================== WHITELIST ==========================="),
# not prose comments that merely mention the word WHITELIST.
WHITELIST_MARKER = "=== WHITELIST ==="

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_bib() -> tuple[dict[str, int], set[str]]:
    """Return ({sota key: count}, {whitelisted keys})."""
    sota: dict[str, int] = {}
    whitelisted: set[str] = set()
    in_whitelist = False
    for line in read(ROOT / "references.bib").splitlines():
        if re.match(r"^\s*%", line) and WHITELIST_MARKER in line:
            in_whitelist = True
            continue
        m = re.match(r"^\s*@\w+\s*\{\s*([^,\s]+)\s*,", line)
        if not m:
            continue
        key = m.group(1)
        if in_whitelist:
            whitelisted.add(key)
        else:
            sota[key] = sota.get(key, 0) + 1
    return sota, whitelisted


def parse_index() -> dict[str, str]:
    """Return {citekey: status} from sota/index.md table rows."""
    rows: dict[str, str] = {}
    for line in read(ROOT / "sota" / "index.md").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cells) < 6 or cells[0] == "citekey" or set(cells[0]) <= {"-", ":", " "}:
            continue
        rows[cells[0]] = cells[5]
    return rows


def check_metadata(paper_dir: Path) -> str | None:
    """Validate metadata.yaml; return its status field."""
    meta_path = paper_dir / "metadata.yaml"
    text = read(meta_path)
    key = paper_dir.name
    rel = meta_path.relative_to(ROOT)
    if not re.search(rf"^citekey:\s*{re.escape(key)}\s*$", text, re.M):
        err(f"{rel}: citekey field must equal folder name {key!r}")
    m = re.search(r"^status:\s*(\S+)", text, re.M)
    status = m.group(1) if m else None
    if status not in ("digested", "excluded"):
        err(f"{rel}: status must be 'digested' or 'excluded', got {status!r}")
    if not re.search(r"^verified:\s*$", text, re.M):
        err(f"{rel}: missing mandatory 'verified:' provenance block")
    if not re.search(r"^(doi|arxiv):\s*\S+", text, re.M) and not re.search(
        r"^\s+(s2_id|record):\s*\S+", text, re.M
    ):
        err(f"{rel}: needs at least one resolvable identifier (doi/arxiv/s2_id/record)")
    return status


def check_sota() -> set[str]:
    """Validate the 1:1:1 invariant; return the set of digested citekeys."""
    papers_dir = ROOT / "sota" / "papers"
    dirs = {d.name: d for d in papers_dir.iterdir() if d.is_dir()} if papers_dir.is_dir() else {}
    sota_bib, _whitelisted = parse_bib()
    index = parse_index()

    for key, count in sota_bib.items():
        if count > 1:
            err(f"references.bib: duplicate key {key!r}")

    statuses: dict[str, str] = {}
    for name, d in sorted(dirs.items()):
        for required in ("paper.pdf", "synthesis.md", "metadata.yaml"):
            if not (d / required).is_file():
                err(f"sota/papers/{name}: missing {required}")
        if (d / "metadata.yaml").is_file():
            status = check_metadata(d)
            if status:
                statuses[name] = status

    folder_keys, bib_keys, index_keys = set(dirs), set(sota_bib), set(index)
    for key in sorted(folder_keys - bib_keys):
        err(f"sota/papers/{key}: no matching entry in references.bib (1:1:1)")
    for key in sorted(bib_keys - folder_keys):
        err(f"references.bib: key {key!r} has no sota/papers/{key}/ folder (1:1:1)")
    for key in sorted(folder_keys - index_keys):
        err(f"sota/papers/{key}: no row in sota/index.md (1:1:1)")
    for key in sorted(index_keys - folder_keys):
        err(f"sota/index.md: row {key!r} has no sota/papers/{key}/ folder (1:1:1)")
    for key in sorted(folder_keys & index_keys):
        if key in statuses and index[key] != statuses[key]:
            err(
                f"{key}: status differs between index.md ({index[key]}) "
                f"and metadata.yaml ({statuses[key]})"
            )

    return {k for k, s in statuses.items() if s == "digested"}


def check_coverage(digested: set[str]) -> None:
    for line in read(ROOT / "survey" / "coverage.md").splitlines():
        m = re.match(r"^-\s+(\S+)\s*$", line.strip())
        if not m:
            continue
        key = m.group(1)
        if key not in digested:
            err(f"survey/coverage.md: {key!r} is not a digested SOTA paper")


def content_dirs(parent: Path) -> list[Path]:
    if not parent.is_dir():
        return []
    return sorted(d for d in parent.iterdir() if d.is_dir() and d.name != "_template")


def check_contributions() -> None:
    for d in content_dirs(ROOT / "contributions"):
        for required in ("README.md", "report/report.tex"):
            if not (d / required).is_file():
                err(f"contributions/{d.name}: missing {required}")


def check_papers() -> None:
    for d in content_dirs(ROOT / "papers"):
        for required in ("venue.md", "framing.md", "manuscript/main.tex"):
            if not (d / required).is_file():
                err(f"papers/{d.name}: missing {required}")


def check_pdfs() -> None:
    pairs = [ROOT / "survey" / "survey.tex"]
    pairs += [d / "report" / "report.tex" for d in content_dirs(ROOT / "contributions")]
    pairs += [d / "manuscript" / "main.tex" for d in content_dirs(ROOT / "papers")]
    for tex in pairs:
        if not tex.is_file():
            continue  # the missing .tex is reported elsewhere
        pdf = tex.with_suffix(".pdf")
        rel = pdf.relative_to(ROOT)
        if not pdf.is_file():
            err(f"{rel}: missing — every required .tex keeps its built PDF committed")
        elif tex.stat().st_mtime > pdf.stat().st_mtime:
            warn(f"{rel}: older than its .tex — rebuild (make pdfs)")


def check_workspace() -> None:
    contribs = [
        d for d in content_dirs(ROOT / "contributions") if (d / "pyproject.toml").is_file()
    ]
    if not contribs:
        return
    if tomllib is None:
        warn("python < 3.11: cannot verify uv workspace membership")
        return
    data = tomllib.loads(read(ROOT / "pyproject.toml"))
    ws = data.get("tool", {}).get("uv", {}).get("workspace", {})
    members = set(ws.get("members", []))
    exclude = set(ws.get("exclude", []))
    for d in contribs:
        rel = f"contributions/{d.name}"
        if rel not in members and rel not in exclude:
            warn(f"{rel}: has pyproject.toml but is not in workspace members or exclude")


def main() -> int:
    digested = check_sota()
    check_coverage(digested)
    check_contributions()
    check_papers()
    check_pdfs()
    check_workspace()
    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        print(f"check: FAIL ({len(errors)} errors, {len(warnings)} warnings)")
        return 1
    print(f"check: OK ({len(warnings)} warnings)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | tail -10`
Expected: all tests in `tests/check.test.mjs` PASS

- [ ] **Step 5: Commit**

```bash
git add template/scripts/check.py tests/check.test.mjs
git commit -m "feat(template): structure validator with fixture tests"
```

---

### Task 7: `src/mcp.ts`

**Files:**
- Modify: `src/mcp.ts` (replace the Task 2 placeholder)
- Test: `tests/mcp.test.mjs`

- [ ] **Step 1: Write the failing test `tests/mcp.test.mjs`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpJson, OPTIONAL_IDS } from "../dist/src/mcp.js";

test("always-on servers present with no optionals", () => {
  const cfg = JSON.parse(renderMcpJson([]));
  assert.deepEqual(Object.keys(cfg.mcpServers).sort(), ["arxiv", "dblp", "semantic-scholar"]);
  assert.equal(
    cfg.mcpServers["semantic-scholar"].env.SEMANTIC_SCHOLAR_API_KEY,
    "${SEMANTIC_SCHOLAR_API_KEY}"
  );
  assert.equal(cfg.mcpServers.arxiv.command, "uvx");
});

test("openalex and zotero are added when selected; overleaf never writes an entry", () => {
  const cfg = JSON.parse(renderMcpJson(["openalex", "zotero", "overleaf"]));
  assert.equal(cfg.mcpServers.openalex.env.OPENALEX_API_KEY, "${OPENALEX_API_KEY}");
  assert.deepEqual(cfg.mcpServers.zotero.args, ["zoty", "mcp"]);
  assert.equal(cfg.mcpServers.overleaf, undefined);
});

test("OPTIONAL_IDS lists the wizard's multi-select options in order", () => {
  assert.deepEqual(OPTIONAL_IDS, ["openalex", "zotero", "overleaf"]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — `renderMcpJson` is not exported (placeholder module)

- [ ] **Step 3: Write `src/mcp.ts`**

```ts
export interface McpServerSpec {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export const ALWAYS_ON: McpServerSpec[] = [
  {
    id: "arxiv",
    command: "uvx",
    args: ["--from", "arxiv-mcp-server[pdf]", "arxiv-mcp-server"]
  },
  {
    id: "semantic-scholar",
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/akapet00/semantic-scholar-mcp",
      "semantic-scholar-mcp"
    ],
    env: { SEMANTIC_SCHOLAR_API_KEY: "${SEMANTIC_SCHOLAR_API_KEY}" }
  },
  { id: "dblp", command: "uvx", args: ["mcp-dblp"] }
];

// overleaf is manual-setup only: documented in the generated README,
// never written to .mcp.json by the wizard.
const OPTIONAL: Record<string, McpServerSpec | null> = {
  openalex: {
    id: "openalex",
    command: "npx",
    args: ["-y", "@cyanheads/openalex-mcp-server@latest"],
    env: { OPENALEX_API_KEY: "${OPENALEX_API_KEY}" }
  },
  zotero: { id: "zotero", command: "uvx", args: ["zoty", "mcp"] },
  overleaf: null
};

export const OPTIONAL_IDS = Object.keys(OPTIONAL);

function toEntry(spec: McpServerSpec): Record<string, unknown> {
  const entry: Record<string, unknown> = { command: spec.command, args: spec.args };
  if (spec.env) entry.env = spec.env;
  return entry;
}

export function renderMcpJson(optionalIds: string[]): string {
  const servers: Record<string, unknown> = {};
  for (const spec of ALWAYS_ON) servers[spec.id] = toEntry(spec);
  for (const id of optionalIds) {
    const spec = OPTIONAL[id];
    if (spec) servers[spec.id] = toEntry(spec);
  }
  return JSON.stringify({ mcpServers: servers }, null, 2) + "\n";
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | tail -10`
Expected: all mcp tests PASS (check tests stay green)

- [ ] **Step 5: Commit**

```bash
git add src/mcp.ts tests/mcp.test.mjs
git commit -m "feat: MCP catalog and .mcp.json renderer"
```

---

### Task 8: `src/scaffold.ts`

**Files:**
- Create: `src/scaffold.ts`
- Test: `tests/scaffold.test.mjs`

- [ ] **Step 1: Write the failing test `tests/scaffold.test.mjs`**

```js
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createProject, slugify } from "../dist/src/scaffold.js";

test("slugify normalizes arbitrary names", () => {
  assert.equal(slugify("My MEV Study!"), "my-mev-study");
  assert.equal(slugify("---"), "research-project");
});

test("createProject generates a project that passes check.py", async () => {
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "mev-rollup-study");
  createProject({
    target,
    title: "MEV on Rollups",
    topic: "MEV detection on Ethereum rollups",
    optionalMcps: ["openalex"],
    installSkills: false,
    git: false
  });

  const readme = await readFile(join(target, "README.md"), "utf8");
  assert.ok(readme.includes("MEV on Rollups"));
  assert.ok(!readme.includes("__PROJECT_"));

  const queue = await readFile(join(target, "sota", "queue.md"), "utf8");
  assert.ok(queue.includes("MEV detection on Ethereum rollups"));

  const survey = await readFile(join(target, "survey", "survey.tex"), "utf8");
  assert.ok(survey.includes("MEV on Rollups"));

  const pyproject = await readFile(join(target, "pyproject.toml"), "utf8");
  assert.ok(pyproject.includes('name = "mev-rollup-study"'));

  const mcp = JSON.parse(await readFile(join(target, ".mcp.json"), "utf8"));
  assert.deepEqual(
    Object.keys(mcp.mcpServers).sort(),
    ["arxiv", "dblp", "openalex", "semantic-scholar"]
  );

  await access(join(target, ".gitignore"));
  await access(join(target, "survey", "survey.pdf"));

  const check = spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /check: OK \(0 warnings\)/);
});

test("createProject initializes git when asked", async () => {
  process.env.GIT_AUTHOR_NAME = "Test";
  process.env.GIT_AUTHOR_EMAIL = "test@example.com";
  process.env.GIT_COMMITTER_NAME = "Test";
  process.env.GIT_COMMITTER_EMAIL = "test@example.com";
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "with-git");
  createProject({
    target,
    title: "T",
    topic: "t",
    optionalMcps: [],
    installSkills: false,
    git: true
  });
  const log = spawnSync("git", ["-C", target, "log", "--oneline"], { encoding: "utf8" });
  assert.equal(log.status, 0);
  assert.match(log.stdout, /scaffold research project/);
});

test("createProject refuses a non-empty target", async () => {
  const root = await mkdtemp(join(tmpdir(), "car-"));
  const target = join(root, "busy");
  mkdirSync(target);
  writeFileSync(join(target, "existing.txt"), "x");
  assert.throws(
    () =>
      createProject({
        target,
        title: "T",
        topic: "t",
        optionalMcps: [],
        installSkills: false,
        git: false
      }),
    /not empty/
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — `../dist/src/scaffold.js` does not exist

- [ ] **Step 3: Write `src/scaffold.ts`**

```ts
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  utimesSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMcpJson } from "./mcp.js";

export interface CreateOptions {
  target: string;
  title: string;
  topic: string;
  optionalMcps: string[];
  installSkills: boolean;
  git: boolean;
}

const TEMPLATE_DIR = fileURLToPath(new URL("../../template", import.meta.url));
const BINARY_EXTENSIONS = new Set([".pdf"]);

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "research-project";
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

export function createProject(options: CreateOptions): void {
  const target = resolve(options.target);
  if (existsSync(target) && readdirSync(target).length > 0) {
    throw new Error(`target directory is not empty: ${target}`);
  }

  cpSync(TEMPLATE_DIR, target, { recursive: true });

  const slug = slugify(basename(target));
  for (const file of walk(target)) {
    if (BINARY_EXTENSIONS.has(extname(file))) continue;
    const text = readFileSync(file, "utf8");
    if (!text.includes("__PROJECT_")) continue;
    writeFileSync(
      file,
      text
        .replaceAll("__PROJECT_TITLE__", options.title)
        .replaceAll("__PROJECT_TOPIC__", options.topic)
        .replaceAll("__PROJECT_SLUG__", slug)
    );
  }

  renameSync(join(target, "gitignore"), join(target, ".gitignore"));
  writeFileSync(join(target, ".mcp.json"), renderMcpJson(options.optionalMcps));

  // cpSync does not preserve template mtimes and the substitution pass
  // rewrites survey.tex afterwards; stamp the committed placeholder PDF
  // strictly newer than its .tex (sub-millisecond mtime precision would
  // otherwise leave it "stale") so a fresh project reports zero warnings.
  const texMtimeMs = statSync(join(target, "survey", "survey.tex")).mtimeMs;
  const stamp = new Date(texMtimeMs + 1000);
  utimesSync(join(target, "survey", "survey.pdf"), stamp, stamp);

  if (options.installSkills) {
    const result = spawnSync(
      "npx",
      ["-y", "skills", "add", "VincenzoImp/academic-research-skills", "--skill", "*", "--copy", "-y"],
      { cwd: target, stdio: "inherit" }
    );
    if (result.status !== 0) {
      console.warn("warning: skills install failed; run it later from the project root:");
      console.warn("  npx -y skills add VincenzoImp/academic-research-skills --skill '*' --copy -y");
    }
  }

  if (options.git) {
    const commands: string[][] = [
      ["init"],
      ["add", "-A"],
      ["commit", "-m", "chore: scaffold research project (create-academic-research v0.2.0)"]
    ];
    for (const args of commands) {
      const result = spawnSync("git", args, { cwd: target, stdio: "ignore" });
      if (result.status !== 0) {
        console.warn(`warning: git ${args[0]} failed; finish git setup manually`);
        break;
      }
    }
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | tail -10`
Expected: all scaffold tests PASS (check.py exits 0 with 0 warnings inside the generated project)

- [ ] **Step 5: Commit**

```bash
git add src/scaffold.ts tests/scaffold.test.mjs
git commit -m "feat: scaffold engine — copy, substitute, mcp config, git init, skills install"
```

---

### Task 9: CLI `bin/create-academic-research.ts`

**Files:**
- Modify: `bin/create-academic-research.ts` (replace the Task 2 placeholder)
- Test: `tests/cli.test.mjs`

- [ ] **Step 1: Write the failing test `tests/cli.test.mjs`**

```js
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const CLI = new URL("../dist/bin/create-academic-research.js", import.meta.url).pathname;

test("--yes creates a project non-interactively and check.py passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "cli-"));
  const target = join(root, "e2e-project");
  const run = spawnSync(
    "node",
    [CLI, target, "--yes", "--no-install-skills", "--no-git"],
    { encoding: "utf8" }
  );
  assert.equal(run.status, 0, run.stdout + run.stderr);

  const check = spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
  assert.equal(check.status, 0, check.stdout + check.stderr);
});

test("--yes without a target fails with a clear message", () => {
  const run = spawnSync("node", [CLI, "--yes"], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /target directory/);
});

test("unknown flags fail fast", () => {
  const run = spawnSync("node", [CLI, "x", "--bogus"], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /unknown flag/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test 2>&1 | tail -5`
Expected: FAIL — the placeholder bin prints "wip" and ignores arguments

- [ ] **Step 3: Write `bin/create-academic-research.ts`**

```ts
#!/usr/bin/env node
import * as p from "@clack/prompts";
import { basename, resolve } from "node:path";
import { createProject } from "../src/scaffold.js";

interface CliArgs {
  target?: string;
  yes: boolean;
  installSkills: boolean;
  git: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { yes: false, installSkills: true, git: true };
  for (const a of argv) {
    if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--no-install-skills") args.installSkills = false;
    else if (a === "--no-git") args.git = false;
    else if (a.startsWith("-")) throw new Error(`unknown flag: ${a}`);
    else if (!args.target) args.target = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  return args;
}

async function guard<T>(value: Promise<T | symbol>): Promise<T> {
  const v = await value;
  if (p.isCancel(v)) {
    p.cancel("cancelled");
    process.exit(1);
  }
  return v as T;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let target = args.target;
  let title: string;
  let topic: string;
  let optionalMcps: string[];
  let installSkills = args.installSkills;

  if (args.yes) {
    if (!target) throw new Error("--yes requires a target directory argument");
    title = basename(resolve(target));
    topic = "Academic research project";
    optionalMcps = ["openalex"];
  } else {
    p.intro("create-academic-research v0.2");
    if (!target) {
      target = String(
        await guard(p.text({ message: "Project directory", placeholder: "my-research" }))
      );
    }
    title = String(
      await guard(p.text({ message: "Project title", initialValue: basename(resolve(target)) }))
    );
    topic = String(await guard(p.text({ message: "One-line research topic" })));
    optionalMcps = (await guard(
      p.multiselect({
        message: "Optional MCP servers (arxiv, semantic-scholar, dblp are always on)",
        options: [
          { value: "openalex", label: "openalex — cross-discipline coverage (needs OPENALEX_API_KEY)" },
          { value: "zotero", label: "zotero — read-only Zotero mirror (needs desktop app + zoty)" },
          { value: "overleaf", label: "overleaf — external LaTeX project (manual setup, README docs only)" }
        ],
        initialValues: ["openalex"],
        required: false
      })
    )) as string[];
    if (installSkills) {
      installSkills = Boolean(
        await guard(
          p.confirm({
            message: "Install companion skills (academic-research-skills)?",
            initialValue: true
          })
        )
      );
    }
  }

  createProject({ target, title, topic, optionalMcps, installSkills, git: args.git });

  const next = [
    `created ${resolve(target)}`,
    "next steps:",
    "  1. cp .env.example .env   # add API keys (recommended)",
    "  2. make check",
    "  3. open the project with your agent and start with the explore-sota skill"
  ].join("\n");
  if (args.yes) console.log(next);
  else p.outro(next);
}

main().catch((error: unknown) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test 2>&1 | tail -10`
Expected: all tests PASS (check, mcp, scaffold, cli)

- [ ] **Step 5: Commit**

```bash
git add bin/create-academic-research.ts tests/cli.test.mjs
git commit -m "feat: minimal wizard CLI with --yes, --no-install-skills, --no-git"
```

---

### Task 10: CI workflows

**Files:**
- Modify: `.github/workflows/validate.yml` (full rewrite)
- Modify: `.github/workflows/release.yml` (full rewrite)
- Keep: `.github/dependabot.yml`, `.github/release.yml`

- [ ] **Step 1: Rewrite `.github/workflows/validate.yml`**

```yaml
name: Validate

on:
  pull_request:
  push:
    branches: [main, redesign-0.2]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ["20", "22", "24"]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - uses: actions/setup-python@v6
        with:
          python-version: "3.12"
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm pack --dry-run
      - name: E2E generated project
        if: matrix.node-version == '22'
        shell: bash
        run: |
          set -euo pipefail
          TARBALL="$(npm pack --silent)"
          TMP="$(mktemp -d)"
          npm exec --yes --package "$PWD/$TARBALL" -- \
            create-academic-research "$TMP/e2e" --yes --no-install-skills --no-git
          cd "$TMP/e2e"
          python3 scripts/check.py
          make check
```

- [ ] **Step 2: Rewrite `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      tag:
        description: Existing vX.Y.Z tag to release
        required: true
        type: string

permissions:
  contents: write
  id-token: write

concurrency:
  group: release-${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name }}
  cancel-in-progress: false

jobs:
  release:
    if: github.event.repository.private == false
    runs-on: ubuntu-latest
    steps:
      - name: Resolve release tag
        id: release
        shell: bash
        run: |
          set -euo pipefail
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            tag="${{ inputs.tag }}"
          else
            tag="${GITHUB_REF_NAME}"
          fi
          if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Release tag must match vX.Y.Z, got: $tag" >&2
            exit 1
          fi
          echo "tag=$tag" >> "$GITHUB_OUTPUT"
          echo "version=${tag#v}" >> "$GITHUB_OUTPUT"

      - uses: actions/checkout@v6
        with:
          ref: ${{ steps.release.outputs.tag }}

      - uses: actions/setup-node@v6
        with:
          node-version: "22"
          registry-url: https://registry.npmjs.org

      - uses: actions/setup-python@v6
        with:
          python-version: "3.12"

      - name: Verify package version matches tag
        shell: bash
        run: |
          set -euo pipefail
          pkg="$(node -p "require('./package.json').version")"
          if [[ "$pkg" != "${{ steps.release.outputs.version }}" ]]; then
            echo "package.json version $pkg != tag version ${{ steps.release.outputs.version }}" >&2
            exit 1
          fi

      - run: npm ci
      - run: npm test
      - run: npm publish

      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "${{ steps.release.outputs.tag }}" --generate-notes
```

- [ ] **Step 3: Lint and commit**

```bash
npx -y github-actionlint
git add .github/workflows
git commit -m "ci: slim validate and release workflows for v0.2"
```

---

### Task 11: README and CHANGELOG

**Files:**
- Modify: `README.md` (full rewrite)
- Modify: `CHANGELOG.md` (prepend the 0.2.0 entry)

- [ ] **Step 1: Rewrite `README.md`**

````markdown
# Create Academic Research

[![npm](https://img.shields.io/npm/v/create-academic-research)](https://www.npmjs.com/package/create-academic-research)
[![Validate](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml/badge.svg)](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Scaffold a four-entity academic research project with one command:
**SOTA → survey → contributions → papers**, one root bibliography,
MCP-verified citations, agent skills included.

```bash
npm create academic-research@latest my-project
```

## What it creates

```
my-project/
├── README.md  AGENTS.md  CLAUDE.md
├── references.bib       # THE single bibliography (1:1:1 with the SOTA)
├── .mcp.json            # arxiv + semantic-scholar + dblp always on
├── pyproject.toml       # uv workspace: one venv for all contributions
├── Makefile             # make check | pdfs | survey | contribution | paper
├── scripts/check.py     # structure validator
├── sota/                # papers/<citekey>/{paper.pdf,synthesis.md,metadata.yaml} + index + queue
├── survey/              # survey.tex + committed survey.pdf + coverage.md
├── contributions/       # self-contained badge-compliant units (_template/)
└── papers/              # one folder per venue submission (_template/)
```

The wizard asks for a title, a one-line topic, optional MCP servers
(openalex pre-checked; zotero and overleaf opt-in), and installs the
companion [academic-research-skills](https://github.com/VincenzoImp/academic-research-skills)
project-locally. Flags: `--yes`, `--no-install-skills`, `--no-git`.

## The model

- **SOTA**: digesting a paper atomically produces its folder (PDF +
  standard synthesis + metadata with citation graph), its bib entry, and
  its index row. A citation exists only if a scholarly MCP lookup produced
  it — provenance is recorded per paper and enforced by `make check`.
- **Survey**: one single-column LaTeX document that digests every
  synthesis, groups the SOTA, and ends with gaps & research directions.
  `coverage.md` makes updates diff-driven when the SOTA changes.
- **Contributions**: each one self-contained and badge-general compliant,
  with a report detailed enough to write papers from.
- **Papers**: per-venue folders with framing, manuscript on the venue
  template, packaged artifacts, correspondence, and immutable submission
  archives.

Generated projects need: git, make, python3 (≥3.11), latexmk, and uv
(uvx runs the MCP servers). No Node at runtime (except the optional
openalex server).

## Develop this package

```bash
npm install
npm run typecheck
npm test
npm pack --dry-run
```

## Release

Tag-driven. Bump `package.json`, commit, tag `vX.Y.Z`, push the tag; the
release workflow validates, publishes to npm, and creates a GitHub release.
````

- [ ] **Step 2: Prepend to `CHANGELOG.md`**

```markdown
# Changelog

## 0.2.0

Full from-scratch rewrite around four entities: SOTA, survey,
contributions, papers.

- The generated project drops ~25 v0.1 directories and all CSV ledgers for
  5 content trees + one root `references.bib` (1:1:1 invariant with
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
```

(Keep existing 0.1.x entries below the new section.)

- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: rewrite README and CHANGELOG for v0.2.0"
```

---

### Task 12: Final verification and release gate

- [ ] **Step 1: Full local validation**

```bash
npm run typecheck && npm test && npm pack --dry-run
```

Expected: all green; pack lists `dist/`, `template/` (including
`template/survey/survey.pdf` and `template/gitignore`), docs files

- [ ] **Step 2: Manual end-to-end smoke**

```bash
TMP="$(mktemp -d)"
node dist/bin/create-academic-research.js "$TMP/smoke" --yes --no-install-skills --no-git
ls -a "$TMP/smoke"
(cd "$TMP/smoke" && make check)
```

Expected: project tree matches the spec layout; `check: OK (0 warnings)`

- [ ] **Step 3: Optional TeX smoke (only if latexmk is installed)**

```bash
(cd "$TMP/smoke" && make survey && make check)
```

Expected: real `survey.pdf` replaces the placeholder; check still OK

- [ ] **Step 4: STOP — user review gate**

Report completion. Do NOT merge or tag without explicit approval. When the
user approves both repos, release in this order:

```bash
# 1. skills repo first (the wizard installs from its main branch)
cd ../academic-research-skills
git checkout main && git merge --no-ff redesign-0.2 -m "release: v0.2.0 skills rewrite"
git tag -a v0.2.0 -m "v0.2.0" && git push origin main v0.2.0

# 2. then the creator
cd ../create-academic-research
git checkout main && git merge --no-ff redesign-0.2 -m "release: v0.2.0 scaffold rewrite"
git tag -a v0.2.0 -m "v0.2.0" && git push origin main v0.2.0
```

---

## Self-review notes

- Spec coverage: layout → Tasks 3–4; formats → Task 4 contents; check.py
  invariants (1:1:1, verified block, coverage⊆digested, _template skip,
  PDF rule, status consistency, workspace members/exclude) → Task 6;
  pre-built survey.pdf before the tests need it → Task 5; MCP three-file
  surface + always-on trio + overleaf-never-in-json → Tasks 3/7; wizard
  prompts + flags + openalex pre-check → Task 9; toolchain truth → Task 3
  README; CI E2E without TeX → Task 10; release ordering → Task 12.
- Fence audit: outer fences are 4 backticks wherever the embedded file
  itself contains 3-backtick blocks (Task 3 Step 1, Task 4 Step 1,
  Task 11 Step 1).
- Placeholder tokens are `__PROJECT_*__` everywhere (LaTeX-safe), replaced
  by `scaffold.ts`; the Task 8 test asserts none survive, and the
  placeholder PDF is re-touched (`utimesSync`) so fresh projects report
  `check: OK (0 warnings)`.
- Type consistency: `CreateOptions` fields (`target, title, topic,
  optionalMcps, installSkills, git`) match between scaffold.ts (Task 8)
  and the CLI (Task 9); `renderMcpJson(optionalIds: string[])` and
  `OPTIONAL_IDS` match Tasks 7–9; the git test sets `GIT_AUTHOR_*` /
  `GIT_COMMITTER_*` env so it passes on identity-less CI runners.
