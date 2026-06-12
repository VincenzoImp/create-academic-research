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
- **Scholarly MCPs are mandatory for SOTA work, not optional**: the split is
  friction-driven. Every zero-config server (arxiv, semantic-scholar, dblp —
  keyless uvx runtimes) is always configured with no deselect; "optional"
  means only credential/app/manual-setup servers, and the SOTA-relevant ones
  (openalex) are strongly recommended and pre-checked in the wizard. A
  citation exists only if an MCP lookup produced it; digestion cross-checks
  all configured sources; each digested paper records lookup provenance, and
  SOTA skills hard-stop when arxiv or semantic-scholar are unavailable.

---

## Repo 1: `create-academic-research` v0.2.0

### CLI

`npm create academic-research@latest my-project`

Wizard prompts:

1. Project title
2. One-line research topic (seeds README and AGENTS.md)
3. Optional MCP servers to enable (multi-select over openalex / zotero /
   overleaf, with openalex pre-checked as strongly recommended; arxiv +
   semantic-scholar + dblp are always written — zero-config and
   pipeline-mandatory, not deselectable)
4. Install companion skills? (default yes)

Flags: `--yes` (accept defaults — including the pre-checked openalex, whose
server entry stays inert until `OPENALEX_API_KEY` is set),
`--no-install-skills`, `--no-git`.

Behavior: copy template, substitute placeholders, write `.mcp.json` and
`.env.example` for the selected MCPs, run
`npx skills add VincenzoImp/academic-research-skills` (project-local copies
placed where the detected agent loads them, e.g. `.claude/skills/` for
Claude Code; the skills CLI pulls the skills repo's main branch, which is
why the skills repo releases first),
`git init` + initial commit. Nothing else. Target ~500–800 lines of
TypeScript. Keep: typecheck, slim test suite, validate + tag-driven release
workflows (npm publish).

Generated project toolchain: git, make, latexmk, python3, and **uv** (uvx
runs the always-on MCP servers and manages the workspace venv — uv is
required for the pipeline, not optional). Node is needed only to run the
create wizard itself and, at runtime, only if the optional openalex server
(npx runtime) is enabled.

### Generated project layout

```
my-project/
├── README.md            # what this project studies; the 4-entity pipeline explained
├── AGENTS.md            # agent contract: rules + pointers to local READMEs
├── CLAUDE.md            # single line importing AGENTS.md
├── references.bib       # THE single bibliography for everything
├── .mcp.json            # enabled scholarly MCP servers
├── .env.example         # documents SEMANTIC_SCHOLAR_API_KEY + OPENALEX_API_KEY
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
9. Safe claims / do-not-claim (what citing this paper can support, and what
   wording would overclaim — carried from v0.1 per-source synthesis template)
10. Citation leads (references/citers/terms/venues worth chasing — feeds
    queue.md)

Exact numbers and quotations in a synthesis must be verified against the
native PDF.

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
status: digested      # digested | excluded (soft removal — see below)
tags: [consensus, distributed-systems]
verified:             # mandatory lookup provenance — no verified block, no valid digest
  bib_source: dblp                      # MCP that produced the BibTeX entry
  record: https://dblp.org/rec/...      # the looked-up record
  citation_graph_source: semantic-scholar
  s2_id: <semantic-scholar paper id>
  date: 2026-06-11
cites:                # outgoing references (selected, relevant ones)
  - citekey-or-external-id  # citekey if in SOTA, else DOI/arXiv id + title
cited_by:             # incoming citations (selected, relevant ones)
  - citekey-or-external-id
```

**`sota/index.md`** — markdown table: citekey | title | year | venue | tags |
status. One row per digested paper.

**Removing a paper from the SOTA is a soft exclusion**, so the 1:1:1
invariant never breaks: set `status: excluded` in `metadata.yaml` and
`index.md` — folder, bib entry, and index row all remain. Excluded keys must
not appear in `survey/coverage.md` (checked), and write-survey update mode
excises them from the survey text. Hard deletion of a folder + bib entry is
allowed only when nothing cites the key: the procedure greps `\cite{...}`
across `survey/`, `contributions/`, and `papers/*/manuscript/` (frozen
`archive/` copies don't count — they are self-contained snapshots) and
refuses while live citations exist.

**`sota/queue.md`** — opens with a **Scope block** (research question,
keywords/synonyms/adjacent terms, inclusion and exclusion criteria, declared
review scale, stopping rule), then a markdown table of exploration
candidates: title | id (DOI/arXiv) | found via (citation of X / keyword Y) |
decision (pending / accepted / rejected: reason / unresolvable-via-mcp). The
scope block makes the
exploration loop auditable and resumable across sessions; review scales are
quick-scan (~8–15 papers), focused-sota (~20–40), full-survey (50+) —
planning budgets, with stopping at saturation or documented blind spots,
never by padding.

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
(current version on the venue template; the entry point is always
`manuscript/main.tex` — venue template files are renamed to this convention
on import; the manuscript uses whatever bibliography system the venue class
dictates, bibtex/natbib or biblatex, both reading the root `.bib`; the
packaging step produces the self-contained bundle), `artifacts/` (packaged
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
- `survey/coverage.md` citekeys all exist in the SOTA with status
  `digested` (excluded keys may not be covered);
- every `contributions/<slug>/` has `README.md` and `report/report.tex`;
- every `papers/<slug>/` has `venue.md`, `framing.md`, and
  `manuscript/main.tex`;
- `_template/` directories are skipped by all checks;
- every digested paper's `metadata.yaml` carries the `verified` provenance
  block with at least one resolvable identifier (DOI, arXiv id, or DBLP/S2
  record) — an unverified bib entry is structurally invalid;
- every required `.tex` has its sibling `.pdf` (fail if missing; warn if the
  `.tex` is newer than the `.pdf` — warn-only because git scrambles mtimes);
- Python workspace coherence: every contribution with a `pyproject.toml` is
  listed in the root workspace members or in the root
  `[tool.uv.workspace] exclude` list (the escape hatch for conflicting
  dependencies registers there); warn otherwise.

The template ships a pre-built `survey.pdf` for the skeleton `survey.tex`,
so a freshly created project passes `make check` without a TeX installation
(and the creator's CI smoke test needs no TeX either).

`Makefile` targets: `check` (runs the validator), `pdfs` (build every LaTeX
target; latexmk skips up-to-date ones), `survey`, `contribution C=<slug>`,
`paper P=<slug>`, `clean`.

`AGENTS.md` is short: the four entities, the 1:1:1 invariant, "read the
local README before touching a directory", "run make check before finishing",
"after editing any .tex, rebuild its PDF", "use the project skills for every
pipeline task", MCP usage notes.

### MCP catalog

The entire MCP system is three files, all written by the wizard: `.mcp.json`
(live config, read natively by Claude Code and compatible clients),
`.env.example` (key names + where to obtain them), and a README "MCP servers"
section carrying the full catalog with a copy-paste JSON snippet per optional
server. Adding a server later means pasting its snippet into `.mcp.json`;
no CLI. Secrets never land in git: `.mcp.json` uses `${VAR}` env expansion.

The mandatory/optional split is friction-driven: everything that works with
zero configuration is always on; "optional" means only servers needing a
credential, a local app, or manual setup — and the SOTA-relevant ones among
those are strongly recommended, not second-class.

| Server | Tier | Runtime | Key | Used by | Role |
|---|---|---|---|---|---|
| arxiv | **always on** | uvx (`arxiv-mcp-server[pdf]`) | none | digest-paper, explore-sota | search/download/read papers |
| semantic-scholar | **always on** | uvx (akapet00/semantic-scholar-mcp) | recommended | digest-paper, explore-sota | citation-graph backbone: cites/cited_by, chasing, authoritative-version resolution |
| dblp | **always on** | uvx (`mcp-dblp`) | none | digest-paper | CS venue names + clean BibTeX; wins precedence for CS entries |
| openalex | strongly recommended (pre-checked) | npx (cyanheads/openalex-mcp-server) | required | digest-paper, explore-sota | cross-discipline coverage; fourth cross-check source |
| zotero | opt-in | local app (zoty) | — | user convenience | read-only mirror; never system of record |
| overleaf | opt-in | manual setup | credentials | write-paper (external mode) | read/contribute to an *external* LaTeX project outside the scaffold |

Dropped from the catalog (v0.1 had them): pubmed (biomedical-specific),
crossref (no vetted server), paper-search (aggregator with restricted-source
risk). Users can still add any server to `.mcp.json` by hand.

Wizard step 3 multi-selects only the optional servers (openalex pre-checked);
arxiv, semantic-scholar, and dblp are always written to `.mcp.json`.
`.env.example` always documents both keys (SEMANTIC_SCHOLAR_API_KEY
recommended, OPENALEX_API_KEY for the strongly recommended server) so the
upgrade path is visible from day one; the full catalog goes to the README
regardless of selection.

AGENTS.md carries a short MCP routing block (acquisition → arxiv; citation
graph/version resolution → semantic-scholar; CS BibTeX → dblp; use every
configured scholarly source and cross-check) and the hard rule: "A citation
exists only if an MCP lookup produced it. If scholarly MCPs are unavailable,
SOTA work stops."

Cross-validation in digestion: digest-paper queries every configured
scholarly MCP, not just one. Metadata disagreements resolve by precedence
among configured sources — dblp (CS venues/BibTeX) > semantic-scholar >
openalex > arxiv — with the DOI as the canonical identifier to reconcile
records across sources; conflicts are noted in metadata.yaml. The hard preflight gate covers
arxiv + semantic-scholar (the pipeline cannot function without acquisition +
citation graph); dblp/openalex are used whenever they respond, and a dblp
outage does not block digestion since semantic-scholar can source the entry.

Enforcement chain: the wizard guarantees the servers are configured →
digest-paper/explore-sota run an MCP preflight (trivial query against arxiv
and semantic-scholar; on failure they stop and report instead of falling
back to memory or web scraping) → each digest records the `verified`
provenance block → check.py fails any digested paper without it. Papers
whose metadata cannot be MCP-resolved get the queue.md decision
`unresolvable-via-mcp` and never become bib entries.

---

## Repo 2: `academic-research-skills` v0.2.0

8 skills replace the 32 of v0.1. Each is a self-contained
`skills/<name>/SKILL.md` (+ optional `references/`), portable, no agent yaml.
Formats are NOT duplicated into skills — skills point at the scaffold READMEs.

| Skill | Replaces (v0.1) | Procedure |
|---|---|---|
| `digest-paper` | source-ingestion, document-conversion, citation-bibliography-tooling | MCP preflight (hard gate: arxiv + semantic-scholar must respond, else stop). One paper end-to-end: resolve most authoritative version via MCP → fetch PDF → write synthesis.md per the standard format → add normalized MCP-sourced entry to root references.bib → fetch in/out citations via MCP into metadata.yaml with the verified provenance block → append to index.md. Atomic; used standalone or as the unit step of explore-sota. Never fills bibliographic data from model memory. |
| `explore-sota` | sota-literature-review, systematic-review-prisma, academic-mcp-tooling | MCP preflight (same hard gate). The loop: from an idea, keywords, seed papers, or the existing SOTA → MCP keyword search + bidirectional citation chasing → triage candidates into queue.md with reasons → digest accepted ones → iterate; explicit stopping criteria (saturation, scope bounds). Unresolvable candidates stay queued, never cited. Designed for long autonomous sessions and for targeted expansions. |
| `write-survey` | survey-synthesis, parts of research-agenda | Create-mode hard gate: read ALL syntheses before writing a word. Design grouping (themes / concepts / methodologies), write the complete LaTeX survey with detailed per-group discussion of contributions and notable aspects, plus a gaps & research-directions section. Maintains coverage.md. Update mode: diff coverage.md vs index.md, integrate/remove exactly the delta, rebalance affected sections. |
| `develop-contribution` | contribution-package, experiment-logbook, research-data-analysis, cs-methodology-evaluation, research-design-positioning (in part) | Before building, state the claim, the delta vs nearest prior work (from the survey), the evidence plan, and what would falsify it. Then create a new contribution from scratch or regularize an existing draft folder into badge-general compliance; for Python code, create the member pyproject.toml and register it in the root uv workspace; write/refresh the detailed report.tex and its PDF. |
| `write-paper` | paper-framing, cs-venue-strategy, paper-writing-review, publication-figures-tables | Venue selection support, framing.md, contribution selection, full manuscript on the venue template, pulling related work from the survey and content from contribution reports; citations only from the root .bib. |
| `package-artifacts` | paper-release, artifact-open-science, badge-compliance-profiles | Build papers/<slug>/artifacts/: everything promised in the paper plus the venue's specific badge/artifact requirements, self-contained and submission-ready. |
| `manage-submission` | paper-submission-lifecycle, rebuttal-revision-strategy | Freeze archive rounds, track decisions, draft rebuttals/response letters from received reviews, integrate revisions into the current manuscript, camera-ready. |
| `adversarial-review` | adversarial-peer-review, citation-claim-audit | Adversarial review of a survey, contribution, or paper draft: claim audit, methodology critique, venue-reviewer simulation. Writes findings to a `reviews/` folder beside the artifact (`survey/reviews/`, `contributions/<slug>/reviews/`, `papers/<slug>/reviews/`), created on demand; never silently edits the artifact under review. |

### Curated carry-overs from v0.1 (per-skill references)

The v0.1 skills are mostly structure plumbing that dies with the old
scaffold, but these battle-tested disciplines survive as small reference
files inside the new skills (rewritten against the v0.2 structure, no
ledger/wiki/npm-workflow residue):

- `explore-sota` → citation-chasing discipline (one-hop frontier expansion,
  deliberate seed promotion, saturation = a hop yields mostly
  duplicates/out-of-scope, report unexpanded frontier as blind spot) and
  anti-echo-chamber rules (seed diversification: project-specific + seminal
  + recent frontier; adjacent-terminology queries learned from full
  readings; negative/contrastive queries; sample excluded near-misses before
  declaring saturation; flag author/venue/benchmark dominance); review
  scales table (quick-scan / focused-sota / full-survey).
- `digest-paper` → citation-key rules (stable readable keys, never changed
  without updating references); preprint/published reconciliation (cite the
  published version, keep the arXiv id as alias, never conflate when they
  support different claims); exact numbers/quotes verified against the
  native PDF.
- `write-survey` → survey content checklist (established findings vs
  contested claims; methodological families; datasets/benchmarks/metrics
  comparison; limitations of the evidence base itself; implications for
  this project).
- `develop-contribution` → CS minimum evaluation standard (credible baseline
  or stated reason none exists; metric justified by the question; dataset
  provenance and split policy; seed/config/env/hardware recorded; negative
  cases; threats to internal/external/construct/conclusion validity; never
  tune on test data; exploratory ≠ confirmatory); statistical and figure
  discipline (effect sizes/CIs, multiple-comparison flags, colorblind-safe,
  no misleading axes, source data saved for final figures); experiment-log
  and autonomous-campaign rules (per-run record: hypothesis, command, seed,
  config, data version, metric, result, status; campaigns declare a
  mutability envelope, frozen evaluation harness, baseline-first,
  keep/discard/crash frontier policy, stop conditions needing human
  approval; never silently change metric/split/harness); external-repo
  reproduction mode (smallest trustworthy target: smoke → inference → eval →
  training; run only documented commands; isolate patches from contribution
  claims; a failed reproduction never silently becomes a refactor); ethics
  red-flags (PII in derived files, scraping behind login, screenshots
  exposing users, "publicly visible" ≠ redistributable, license/consent
  before sharing).
- `write-paper` → writing rules (hedging matches evidence strength; author
  claims separated from cited claims; related work synthesizes themes, never
  paper-by-paper lists; mark missing evidence instead of inventing
  citations; never strengthen a claim while editing); venue-fit honesty
  checks (does the venue value this contribution type; are baselines
  credible for this venue; would a workshop/findings track/journal be more
  honest; novelty bar vs main track).
- `package-artifacts` → minimum artifact standard (one-command smoke test or
  clear manual path; environment capture; data access/provenance; expected
  outputs; result comparison against paper claims; license, citation file,
  expected runtime and hardware; ethical constraints); manifest with
  checksums; stage from canonical contribution folders and never hand-edit
  staged files.
- `manage-submission` → concern-map discipline (split reviews into atomic
  concerns; classify: misunderstanding / valid limitation / missing
  evidence / writing issue / incorrect claim / scope mismatch / unfixable;
  action: concede / clarify / add-evidence / reframe / defend / defer;
  response pattern: answer the exact concern, then evidence, then the
  manuscript location that changes; never promise what cannot land in the
  revision before the deadline; every response must be mirrorable in the
  revised paper).
- `adversarial-review` → review lanes (editor / methodology / domain /
  adversarial / reproducibility-ethics, kept separate before synthesis so
  findings cannot vanish); criticism standard (exact location, why it
  matters, evidence, fix path, severity fatal/major/moderate/minor,
  confidence); claim-audit verdict taxonomy (supported /
  partially-supported / unsupported / contradicted / wrong-source /
  needs-human / stale) with fix discipline (smallest safe change: weaken
  wording, split broad claims, move speculation to limitations, remove when
  unsupported — never strengthen during editing).

Dropped without replacement: research-project-router (AGENTS.md routes),
research-agenda (removed by design), repo-migration,
research-ui-prototyping, skill-evaluation, systematic-review-prisma as a
formal process (its declared-criteria and controlled-exclusion-reason ideas
fold into the queue.md scope block), research-project-maintenance,
research-results-reporting (folded into develop-contribution),
research-design-positioning (folded into write-paper framing and the
develop-contribution claim/delta/falsifiability step),
ethics-data-governance and research-repo-reproduction (both absorbed as
develop-contribution references).

Repo keeps: README, CHANGELOG, LICENSE (MIT), SECURITY.md, a slim
skill-frontmatter validation script, validate + tag-driven release
workflows. Drops: pyproject/egg-info, evals
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
