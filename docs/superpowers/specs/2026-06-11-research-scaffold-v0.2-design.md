# Research Scaffold v0.2 — Design

Date: 2026-06-11
Scope: full from-scratch rewrite of two companion repos, released together as v0.2.0:

- `create-academic-research` — npm creator that scaffolds a research project
- `academic-research-skills` — agent skill package operating on that scaffold

## Problem

The v0.1 scaffold is too complex: ~30 top-level template directories, ~15 CSV
ledgers, an 8,500-line CLI with 35+ subcommands, and 32 partially overlapping
skills with per-skill agent yaml and reference-sync machinery. Users and agents
get lost; the structure does not make the research pipeline obvious.

## Goal

A simple, immediate environment built around exactly four entities:

1. **SOTA** — digested papers (PDF + standard synthesis + authoritative bib
   entry + citation graph), grown through an iterative exploration loop.
2. **Survey** — one detailed LaTeX survey that digests *all* paper syntheses,
   groups the SOTA by themes/concepts/methodologies, includes a gaps &
   research-directions section, and becomes the single reading reference.
3. **Contributions** — self-contained folders (any analysis, experiment, data
   collection, software…), each badge-general compliant, each with a detailed
   LaTeX report sufficient to integrate it into a paper later.
4. **Papers** — per-venue submission folders: framing, manuscript on the venue
   template, packaged artifacts meeting venue-specific badges, correspondence,
   archived submission rounds, current version always live.

One root `references.bib` is the single bibliography for survey, contribution
reports, and papers. The research agenda concept from v0.1 is removed.

Neither the user nor the agent should ever need to step outside this
structure. Scaffold owns **structure and formats**; skills own **procedures**.

## Decisions taken (user-confirmed)

- Citation graph lives **in-repo** (per-paper `metadata.yaml`), fetched via
  scholarly MCPs. Zotero is an optional convenience MCP, never the system of
  record.
- The creator CLI is **minimal**: scaffold only. No doctor/update/rename,
  no `mcp:*`/`skills:*`/`workflow:*` command families. Structure discipline
  comes from template READMEs, `scripts/check.py`, and the skills.
- Survey template is a **single-column article**: ToC, no length limit,
  bibliography from the root `.bib`.
- Skills are **portable SKILL.md only**: no per-skill `openai.yaml`, no
  reference-sync machinery, installable project-locally via the `skills` CLI.
- **Every `.tex` always has its generated PDF available**: built PDFs are
  committed next to their sources; only aux files are gitignored.
- **One root venv via uv workspace**: a single `.venv` for the whole project;
  each Python contribution declares its own deps in a member `pyproject.toml`.

---

## Repo 1: `create-academic-research` v0.2.0

### CLI

`npm create academic-research@latest my-project`

Wizard prompts:

1. Project title
2. One-line research topic (seeds README and AGENTS.md)
3. MCP servers to enable (multi-select; arxiv + semantic-scholar pre-selected)
4. Install companion skills? (default yes)

Flags: `--yes` (accept defaults), `--no-install-skills`, `--no-git`.

Behavior: copy template, substitute placeholders, write `.mcp.json` and
`.env.example` for the selected MCPs, run
`npx skills add VincenzoImp/academic-research-skills` (project-local copy),
`git init` + initial commit. Nothing else. Target ~500–800 lines of
TypeScript. Keep: typecheck, slim test suite, validate + tag-driven release
workflows (npm publish).

Generated projects have **zero Node dependency**: Makefile + latexmk +
python3, plus uv when contributions contain Python code.

### Generated project layout

```
my-project/
├── README.md            # what this project studies; the 4-entity pipeline explained
├── AGENTS.md            # agent contract: rules + pointers to local READMEs
├── CLAUDE.md            # single line importing AGENTS.md
├── references.bib       # THE single bibliography for everything
├── .mcp.json            # enabled scholarly MCP servers
├── .env.example         # API key placeholders for opt-in MCPs
├── .gitignore           # ignores .venv/, .build/ (LaTeX aux); built PDFs are committed
├── pyproject.toml       # uv workspace root: empty member list, no deps initially
├── Makefile             # make check | make pdfs | make survey | make contribution C=<slug> | make paper P=<slug>
├── scripts/check.py     # structure validator, Python stdlib only
│
├── sota/
│   ├── README.md        # digestion rules + the synthesis.md standard format
│   ├── index.md         # one row per digested paper
│   ├── queue.md         # exploration frontier: candidates + triage decisions
│   └── papers/<citekey>/
│       ├── paper.pdf
│       ├── synthesis.md
│       └── metadata.yaml
│
├── survey/
│   ├── README.md        # survey contract
│   ├── survey.tex       # single-column article skeleton
│   ├── survey.pdf       # committed, kept fresh via make survey
│   └── coverage.md      # citekeys currently integrated — diff anchor
│
├── contributions/
│   ├── README.md        # badge-general contract
│   ├── _template/
│   │   ├── README.md    # badge checklist template
│   │   └── report/report.tex   # report.pdf committed next to it once built
│   └── <slug>/          # created by copying _template; free-form inside
│
└── papers/
    ├── README.md        # paper lifecycle contract
    ├── _template/
    │   ├── venue.md
    │   ├── framing.md
    │   ├── manuscript/
    │   ├── artifacts/
    │   ├── correspondence/
    │   └── archive/
    └── <slug>/
```

Removed relative to v0.1: `research_agenda`, `wiki`, `compliance`, `sources`
(absorbed into `sota/papers/`), `experiments`, `data`, `notebooks`, all
`*_outputs` dirs (each contribution owns its data/outputs internally),
`paper_frames` + `paper_releases` + `paper_submissions` + `reports` (merged
into `papers/<slug>/`), `configs`, `src` Python package, `tests`,
`package.json` in the template, all CSV ledgers.

### Code & environments (what replaces v0.1's global `src/`)

There is no project-global `src/`, `tests/`, or notebook/data tree: **code is
a property of the contribution that uses it**. Each `contributions/<slug>/`
is a self-contained mini-project (free-form inside: `src/`, `data/`,
`figures/`, `outputs/`, notebooks — whatever it needs). The scaffold enforces
only the interface: `README.md` (filled badge checklist) +
`report/report.tex` (+ built PDF).

Environments use a **uv workspace with a single root venv**:

- The root `pyproject.toml` is a uv workspace with an explicit (initially
  empty) member list and no dependencies of its own.
- When a contribution has Python code, it gets its own small
  `pyproject.toml` declaring *its* dependencies and is added to the root
  member list (done by the `develop-contribution` skill, or by hand).
- `uv sync` at the root installs everything into one `.venv`. Users and
  agents only ever deal with one environment.
- Non-Python contributions simply aren't members.
- Escape hatch: a contribution with genuinely conflicting dependencies is
  removed from the workspace and gets a local venv, documented in its README.
- Badge packaging stays trivial: the contribution folder already carries its
  own dependency declaration, so `package-artifacts` ships it as-is.

Shared code between contributions: duplicate small utilities, or promote
substantial shared tooling to its own contribution (a software artifact with
its own README/report) that others reference in their READMEs. There is no
import mechanism between contributions.

Tests: no global suite. A contribution with code carries its own
verification/smoke command, documented in its README (the "exercisable"
badge item). The only project-level check is `make check`.

### PDF rule

Every required `.tex` always has its generated PDF committed next to it:
`survey/survey.pdf`, `contributions/<slug>/report/report.pdf`,
`papers/<slug>/manuscript/main.pdf`, and frozen PDFs inside
`papers/<slug>/archive/<round>/`. latexmk sends aux files to a gitignored
`.build/` directory; PDFs land beside their sources. `make pdfs` rebuilds
everything that changed. AGENTS.md rule: after editing any `.tex`, run its
make target before finishing.

### Formats (defined in the scaffold, used by the skills)

**`sota/papers/<citekey>/synthesis.md`** — standard sections, defined in
`sota/README.md`:

1. Header: title, authors, year, venue, citekey
2. Problem & motivation
3. Approach / method
4. Key contributions
5. Results & evidence
6. Limitations & assumptions
7. Relevance to this project
8. Connections (related citekeys in this SOTA, with one-line why)

**`sota/papers/<citekey>/metadata.yaml`**:

```yaml
citekey: lamport1998paxos
title: ...
authors: [...]
year: 1998
venue: ...            # most authoritative published version
doi: ...
arxiv: ...            # optional
pdf_source: <url>
status: digested      # digested | excluded
tags: [consensus, distributed-systems]
cites:                # outgoing references (selected, relevant ones)
  - citekey-or-external-id  # citekey if in SOTA, else DOI/arXiv id + title
cited_by:             # incoming citations (selected, relevant ones)
  - citekey-or-external-id
```

**`sota/index.md`** — markdown table: citekey | title | year | venue | tags |
status. One row per digested paper.

**`sota/queue.md`** — markdown table of exploration candidates: title | id
(DOI/arXiv) | found via (citation of X / keyword Y) | decision
(pending / accepted / rejected: reason).

**`survey/survey.tex`** — `\documentclass[11pt,a4paper]{article}`, onecolumn,
`hyperref`, `\tableofcontents`, biblatex with
`\addbibresource{../references.bib}`, built with latexmk/biber. No length
limit.

**`survey/coverage.md`** — flat list of citekeys integrated into the current
survey text. The write-survey skill diffs this against `sota/index.md` to
perform incremental updates.

**`contributions/_template/README.md`** — badge-general checklist distilled
from ACM artifact badging, venue-agnostic: purpose stated; complete and
self-contained; documented how to run; environment/dependencies captured;
data provenance recorded; outputs reproducible from inputs.

**`contributions/_template/report/report.tex`** — same document style as the
survey, `\addbibresource{../../../references.bib}`. Must fully present the
contribution: motivation, method, setup, results, limitations — sufficient for
later paper integration without re-reading the code.

**`papers/_template/`** — `venue.md` (venue, template source, formatting
rules, deadlines, venue-specific badge/artifact requirements), `framing.md`
(story, claims, selected contributions and what each provides), `manuscript/`
(current version on the venue template, citing the root `.bib`; the packaging
step produces the self-contained bundle), `artifacts/` (packaged
deliverables), `correspondence/` (received reviews, rebuttals, response
letters), `archive/` (frozen snapshot per submitted round: `r1/`, `r2/`,
`camera-ready/`).

### Rails / enforcement

`scripts/check.py` validates:

- every `sota/papers/<citekey>/` has `paper.pdf`, `synthesis.md`,
  `metadata.yaml`; citekey appears exactly once in `references.bib` and once
  in `sota/index.md` (1:1:1 invariant);
- `references.bib` keys are unique; no bib entry without a SOTA folder unless
  whitelisted in the file header comment (e.g., tool citations);
- `survey/coverage.md` citekeys all exist in the SOTA;
- every `contributions/<slug>/` has `README.md` and `report/report.tex`;
- every `papers/<slug>/` has `venue.md`, `framing.md`, `manuscript/`;
- every required `.tex` has its sibling `.pdf` (fail if missing; warn if the
  `.tex` is newer than the `.pdf` — warn-only because git scrambles mtimes);
- Python workspace coherence: every contribution with a `pyproject.toml` is
  listed in the root workspace members (warn if not).

`Makefile` targets: `check` (runs the validator), `pdfs` (build every LaTeX
target; latexmk skips up-to-date ones), `survey`, `contribution C=<slug>`,
`paper P=<slug>`, `clean`.

`AGENTS.md` is short: the four entities, the 1:1:1 invariant, "read the
local README before touching a directory", "run make check before finishing",
"after editing any .tex, rebuild its PDF", "use the project skills for every
pipeline task", MCP usage notes.

### MCP catalog

| Server | Default | Notes |
|---|---|---|
| arxiv | on | low-friction local runtime |
| semantic-scholar | on | citation-graph backbone; key recommended |
| dblp | off | CS bibliography |
| openalex | off | cross-discipline metadata |
| zotero | off | reading convenience only; never system of record |
| overleaf | off | interface to an *external* LaTeX project outside the scaffold |

The creator writes `.mcp.json` entries for the selected servers and matching
`.env.example` placeholders. No install/probe/doctor machinery — `.mcp.json`
plus a short MCP section in AGENTS.md is the whole story.

---

## Repo 2: `academic-research-skills` v0.2.0

8 skills replace the 32 of v0.1. Each is a self-contained
`skills/<name>/SKILL.md` (+ optional `references/`), portable, no agent yaml.
Formats are NOT duplicated into skills — skills point at the scaffold READMEs.

| Skill | Replaces (v0.1) | Procedure |
|---|---|---|
| `digest-paper` | source-ingestion, document-conversion, citation-bibliography-tooling | One paper end-to-end: resolve most authoritative version → fetch PDF → write synthesis.md per the standard format → add normalized entry to root references.bib → fetch in/out citations via MCP into metadata.yaml → append to index.md. Atomic; used standalone or as the unit step of explore-sota. |
| `explore-sota` | sota-literature-review, systematic-review-prisma, academic-mcp-tooling | The loop: from an idea, keywords, seed papers, or the existing SOTA → MCP keyword search + bidirectional citation chasing → triage candidates into queue.md with reasons → digest accepted ones → iterate; explicit stopping criteria (saturation, scope bounds). Designed for long autonomous sessions and for targeted expansions. |
| `write-survey` | survey-synthesis, parts of research-agenda | Hard gate: read ALL syntheses first. Design grouping (themes / concepts / methodologies), write the complete LaTeX survey with detailed per-group discussion of contributions and notable aspects, plus a gaps & research-directions section. Maintains coverage.md. Update mode: diff coverage.md vs index.md, integrate/remove exactly the delta, rebalance affected sections. |
| `develop-contribution` | contribution-package, experiment-logbook, research-data-analysis, cs-methodology-evaluation | Create a new contribution from scratch or regularize an existing draft folder into badge-general compliance; for Python code, create the member pyproject.toml and register it in the root uv workspace; write/refresh the detailed report.tex and its PDF. |
| `write-paper` | paper-framing, cs-venue-strategy, paper-writing-review, publication-figures-tables | Venue selection support, framing.md, contribution selection, full manuscript on the venue template, pulling related work from the survey and content from contribution reports; citations only from the root .bib. |
| `package-artifacts` | paper-release, artifact-open-science, badge-compliance-profiles | Build papers/<slug>/artifacts/: everything promised in the paper plus the venue's specific badge/artifact requirements, self-contained and submission-ready. |
| `manage-submission` | paper-submission-lifecycle, rebuttal-revision-strategy | Freeze archive rounds, track decisions, draft rebuttals/response letters from received reviews, integrate revisions into the current manuscript, camera-ready. |
| `adversarial-review` | adversarial-peer-review, citation-claim-audit | Adversarial review of a survey, contribution, or paper draft: claim audit, methodology critique, venue-reviewer simulation; writes findings next to the artifact. |

Dropped without replacement: research-project-router (AGENTS.md routes),
research-agenda (removed by design), repo-migration, research-repo-reproduction,
research-ui-prototyping, skill-evaluation, ethics-data-governance (folded as a
checklist item into develop-contribution and write-paper references),
research-project-maintenance, research-results-reporting (folded into
develop-contribution), research-design-positioning (folded into write-paper).

Repo keeps: README, CHANGELOG, a slim skill-frontmatter validation script,
validate + tag-driven release workflows. Drops: pyproject/egg-info, evals
dir, examples dir, the 16 shared root `references/` files and
`sync_skill_references.py`.

---

## Execution & release plan

1. Branch `redesign-0.2` in both repos; rebuild content from scratch on it.
2. Order: skills repo first (the creator's install step points at it), then
   the creator.
3. Both repos: version `0.2.0`, CHANGELOG rewritten with a migration note
   (v0.1 projects are not auto-migrated; the update command is gone).
4. Merge to main, tag `v0.2.0`, existing tag-driven release workflows publish
   (npm for the creator; GitHub release for the skills).

## Testing

- Creator: unit tests for scaffold generation (all template files land,
  placeholder substitution, flag combinations), a smoke test that runs the
  wizard non-interactively and then `python3 scripts/check.py` inside the
  generated project; `make check` passes on a fresh project.
- Template: `scripts/check.py` has self-tests run by the creator's CI against
  fixture projects (valid + each invariant violated).
- Skills: frontmatter/structure validation in CI; trigger-description review
  by hand.

## Out of scope

- Migration tooling from v0.1 projects.
- Zotero/Overleaf deep integration beyond optional MCP records.
- Any workflow CLI inside generated projects.
