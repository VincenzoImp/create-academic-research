# academic-research-skills v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the skills repo from scratch: 8 self-contained portable skills replacing the 32 of v0.1, tailored to the v0.2 scaffold (`docs/superpowers/specs/2026-06-11-research-scaffold-v0.2-design.md` in the create-academic-research repo).

**Architecture:** Each skill is `skills/<name>/SKILL.md` plus optional `skills/<name>/references/*.md`. No agent yaml, no reference-sync machinery, no Python packaging. Formats live in the scaffold; skills carry procedure only and point at scaffold paths (`sota/README.md`, `make check`, etc.). A single stdlib validation script gates CI.

**Tech Stack:** Markdown skills, Python 3 stdlib validator, GitHub Actions (validate + tag-driven release).

**Repo:** `/Users/vincenzo/Documents/GitHub/VincenzoImp/academic-research-skills` — all commands below run from this directory unless stated otherwise.

**Execute this plan BEFORE the create-academic-research plan** (the creator's install step pulls this repo's main branch).

---

### Task 1: Branch and wipe v0.1 content

**Files:**
- Delete: `skills/`, `references/`, `scripts/`, `evals/`, `examples/`, `academic_research_skills.egg-info/`, `pyproject.toml`, `.pytest_cache/`, `.ruff_cache/`
- Keep: `LICENSE`, `SECURITY.md`, `.gitignore`, `.github/` (rewritten later), `README.md`, `CHANGELOG.md` (rewritten later)

- [ ] **Step 1: Create the branch**

```bash
cd /Users/vincenzo/Documents/GitHub/VincenzoImp/academic-research-skills
git checkout -b redesign-0.2
```

- [ ] **Step 2: Remove v0.1 content**

```bash
git rm -r -q skills references scripts evals examples academic_research_skills.egg-info pyproject.toml
git rm -r -q --ignore-unmatch .pytest_cache .ruff_cache
rm -rf .pytest_cache .ruff_cache
```

- [ ] **Step 3: Verify what remains**

Run: `git status --short && ls -a`
Expected: only deletions staged; remaining files are `LICENSE`, `SECURITY.md`, `README.md`, `CHANGELOG.md`, `.gitignore`, `.github/`, `.git/`

- [ ] **Step 4: Commit**

```bash
git commit -m "chore!: remove v0.1 skills, references, and packaging for the v0.2 rewrite"
```

---

### Task 2: Validation script

**Files:**
- Create: `scripts/validate_skills.py`

- [ ] **Step 1: Write the validator**

Create `scripts/validate_skills.py` with exactly this content:

```python
#!/usr/bin/env python3
"""Validate skills/<name>/SKILL.md structure and frontmatter (v0.2)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"
NAME_RE = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?")


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        raise ValueError("missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise ValueError("unterminated YAML frontmatter")
    meta: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"invalid frontmatter line: {line!r}")
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta


def validate_skill(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return [f"{skill_dir.name}: missing SKILL.md"]
    text = skill_md.read_text(encoding="utf-8")
    try:
        meta = parse_frontmatter(text)
    except ValueError as exc:
        return [f"{skill_dir.name}: {exc}"]
    name = meta.get("name", "")
    desc = meta.get("description", "")
    if name != skill_dir.name:
        errors.append(f"{skill_dir.name}: frontmatter name {name!r} != folder name")
    if not NAME_RE.fullmatch(name) or "--" in name:
        errors.append(f"{skill_dir.name}: invalid skill name {name!r}")
    if not desc.startswith("Use when "):
        errors.append(f"{skill_dir.name}: description must start with 'Use when '")
    if len(desc) > 500:
        errors.append(f"{skill_dir.name}: description over 500 characters")
    if meta.get("license") != "MIT":
        errors.append(f"{skill_dir.name}: license must be MIT")
    refs_dir = skill_dir / "references"
    mentioned = set(re.findall(r"references/([\w./-]+\.md)", text))
    on_disk = {p.name for p in refs_dir.glob("*.md")} if refs_dir.is_dir() else set()
    for missing in sorted(mentioned - on_disk):
        errors.append(
            f"{skill_dir.name}: SKILL.md mentions references/{missing} which does not exist"
        )
    for orphan in sorted(on_disk - mentioned):
        errors.append(f"{skill_dir.name}: references/{orphan} is never mentioned in SKILL.md")
    return errors


def main() -> int:
    if not SKILLS_DIR.is_dir():
        print("no skills/ directory yet: nothing to validate")
        return 0
    dirs = sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir())
    all_errors: list[str] = []
    for d in dirs:
        all_errors.extend(validate_skill(d))
    for e in all_errors:
        print(f"ERROR: {e}", file=sys.stderr)
    print(f"validated {len(dirs)} skills: {'FAIL' if all_errors else 'OK'}")
    return 1 if all_errors else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run it (no skills yet)**

Run: `python3 scripts/validate_skills.py`
Expected: `no skills/ directory yet: nothing to validate`, exit 0

- [ ] **Step 3: Self-test it catches a bad skill**

```bash
mkdir -p skills/bad-skill
printf -- '---\nname: wrong\ndescription: Does things\nlicense: MIT\n---\n# x\n' > skills/bad-skill/SKILL.md
python3 scripts/validate_skills.py; echo "exit=$?"
rm -rf skills
```

Expected: two ERROR lines (name mismatch, description not starting with "Use when "), `exit=1`

- [ ] **Step 4: Commit**

```bash
git add scripts/validate_skills.py
git commit -m "feat: add slim skill validation script"
```

---

### Task 3: Skill `digest-paper`

**Files:**
- Create: `skills/digest-paper/SKILL.md`
- Create: `skills/digest-paper/references/bibliography-rules.md`

- [ ] **Step 1: Write `skills/digest-paper/SKILL.md`**

```markdown
---
name: digest-paper
description: Use when adding, ingesting, or digesting a single paper into the SOTA — from a title, DOI, arXiv id, URL, or PDF — producing its folder, synthesis, bib entry, citation graph, and index row.
license: MIT
---

# Digest Paper

Digest one paper end-to-end into `sota/papers/<citekey>/`. This is the
atomic unit of SOTA work: it either completes fully or it does not happen.
Never leave a partial digest.

## Read First

- `sota/README.md` — synthesis format and digestion rules (the scaffold owns the format)
- `references/bibliography-rules.md` — citekeys, version resolution, cross-validation

## MCP Preflight (hard gate)

Before anything else, run one trivial query against the `arxiv` MCP server
and one against `semantic-scholar` (e.g., search a known title). If either
fails to respond: STOP. Report the failure and ask the user to fix the MCP
setup. Do not fall back to model memory, web search, or scraping. A citation
exists only if an MCP lookup produced it.

## Procedure

1. Resolve identity: from the given title/DOI/arXiv/PDF, find the paper via
   semantic-scholar (and dblp for CS work). Ask the user only if the match
   is genuinely ambiguous.
2. Resolve the most authoritative version: published venue > latest arXiv
   revision > other preprint, per `references/bibliography-rules.md`.
   Record both DOI and arXiv id when both exist.
3. Choose the citekey (`<firstauthor><year><topicword>`, lowercase) and
   check it is unused: not in `references.bib`, no
   `sota/papers/<citekey>/` folder.
4. Create `sota/papers/<citekey>/` and download the full-text PDF as
   `paper.pdf` (arxiv MCP for arXiv papers; otherwise the open-access URL
   from the MCP metadata). If no legal full text is found, stop, remove the
   folder, and record the candidate in `sota/queue.md` with decision
   `unresolvable-via-mcp`. Abstract-only digestion is forbidden.
5. Read the full paper — the PDF, cover to cover, not the abstract.
6. Write `synthesis.md` following the exact section order in
   `sota/README.md`. Verify every exact number and quotation against the
   PDF.
7. Write the BibTeX entry into the SOTA section of `references.bib`, built
   from MCP-sourced fields cross-checked per
   `references/bibliography-rules.md`. Never write a field from memory.
8. Fetch citations via semantic-scholar: outgoing references and incoming
   citations. Select the relevant ones, not all. Write `metadata.yaml` with
   every field from the schema in `sota/README.md`, including the mandatory
   `verified:` block. Use citekeys for papers already in the SOTA, external
   ids otherwise.
9. Append the row to `sota/index.md` with status `digested`.
10. Add in-scope leads from `cites`/`cited_by` and the synthesis "Citation
    leads" section to `sota/queue.md` as `pending`, with provenance.
11. Run `make check` from the project root and fix anything it reports.

## Rules

- All-or-nothing: if any step cannot complete, revert the partial folder
  and record the paper in `queue.md` instead.
- One paper = one folder = one bib entry = one index row (1:1:1).
- While digesting, the only edit allowed in other papers' folders is
  upgrading an external id to a citekey in their `cites`/`cited_by` lists.

## Done When

- `sota/papers/<citekey>/` has `paper.pdf`, `synthesis.md`, `metadata.yaml`
- `references.bib` and `sota/index.md` each gained exactly one entry
- `make check` passes
```

- [ ] **Step 2: Write `skills/digest-paper/references/bibliography-rules.md`**

```markdown
# Bibliography Rules

## Citekeys

- format `<firstauthorlastname><year><topicword>`, lowercase ASCII:
  `qin2022quantifying`
- stable: never change a citekey without first grepping `\cite{` usages
  across `survey/`, `contributions/`, `papers/` and updating all of them

## Authoritative version

- precedence: peer-reviewed published version > latest arXiv revision >
  other preprint
- when both exist, the bib entry cites the published version; the arXiv id
  stays in `metadata.yaml` as an alias
- never conflate preprint and published versions when their content differs
  in a way that matters to a claim; digest the version actually read and
  note the other in metadata

## Cross-validation

- query every configured scholarly MCP: semantic-scholar and dblp always,
  openalex when enabled, arxiv for arXiv records
- field disagreements resolve by precedence:
  dblp (CS venues/BibTeX) > semantic-scholar > openalex > arxiv
- the DOI is the canonical identifier used to reconcile records across
  sources
- note unresolved conflicts as a comment in `metadata.yaml`
- never fill any bibliographic field from model memory; every field traces
  to an MCP record

## Provenance — the `verified:` block (mandatory)

- `bib_source`: the MCP whose record produced the BibTeX fields
- `record`: URL or id of that record
- `citation_graph_source`: MCP used for cites/cited_by (normally
  semantic-scholar)
- `s2_id`: Semantic Scholar paper id
- `date`: lookup date, YYYY-MM-DD

## Whitelist

Non-paper entries (software, datasets, standards) go under the `WHITELIST`
marker in `references.bib`; they need no SOTA folder and no synthesis.
```

- [ ] **Step 3: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 1 skills: OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add skills/digest-paper
git commit -m "feat: add digest-paper skill"
```

---

### Task 4: Skill `explore-sota`

**Files:**
- Create: `skills/explore-sota/SKILL.md`
- Create: `skills/explore-sota/references/citation-chasing.md`

- [ ] **Step 1: Write `skills/explore-sota/SKILL.md`**

```markdown
---
name: explore-sota
description: Use when building or expanding the SOTA — from an idea, keywords, seed papers, or the existing collection — through MCP search, citation chasing, triage, and digestion of accepted papers.
license: MIT
---

# Explore SOTA

Run the SOTA exploration loop: discover candidate papers, triage them in
`sota/queue.md`, digest the accepted ones, and repeat until the declared
stopping rule is met. Works for long autonomous sessions and for small
targeted expansions alike.

## Read First

- `sota/README.md` — digestion rules and formats
- `sota/queue.md` — the Scope block and the current frontier
- `references/citation-chasing.md` — frontier discipline, anti-echo-chamber
  rules, review scales

## MCP Preflight (hard gate)

Same gate as digest-paper: one trivial query against `arxiv` and one against
`semantic-scholar`. If either fails: STOP and report. No fallback to model
memory or web scraping.

## Procedure

1. **Scope.** Read the Scope block at the top of `sota/queue.md`. If empty
   or stale, write it now: research question, keywords/synonyms/adjacent
   terms, inclusion and exclusion criteria, review scale (quick-scan ~8–15
   papers / focused-sota ~20–40 / full-survey 50+), stopping rule. In an
   interactive session confirm it with the user; in an autonomous session
   derive it from `README.md` and record it before searching.
2. **Seeds.** Build a diversified seed set: user-named papers, already
   digested papers, seminal works found via MCP search, recent frontier
   papers. Never start from a single author group, venue, or survey.
3. **Search.** Run keyword queries on every configured scholarly MCP
   (arxiv, semantic-scholar, openalex when enabled). Short, high-signal
   queries; record productive terms in the Scope block.
4. **Chase.** For each digested seed, fetch outgoing references and
   incoming citations via semantic-scholar — one hop at a time, per
   `references/citation-chasing.md`.
5. **Dedupe.** Before adding a candidate to the queue, check it is not in
   `sota/index.md` or already in `sota/queue.md` (match DOI, arXiv id, S2
   id, then title + first author + year).
6. **Triage.** Add each new candidate to `queue.md` with provenance
   ("found via") and decide against the criteria: `accepted`,
   `rejected: <reason>`, or `pending`. A candidate no MCP can resolve gets
   `unresolvable-via-mcp` and is never cited.
7. **Digest.** For each `accepted` candidate, run the digest-paper skill
   procedure (all-or-nothing). New digests yield new citation leads — feed
   them back into the queue.
8. **Learn.** After each digestion round, add newly learned terminology,
   benchmarks, venues, and author groups to the scope terms and re-search.
9. **Stop.** Before declaring saturation, run the anti-echo-chamber checks
   in `references/citation-chasing.md`. Stop at saturation (a hop yields
   mostly duplicates or out-of-scope work) or at the declared budget — in
   that case record the unexpanded frontier as `pending` rows, never
   silently.
10. Run `make check` and leave no untriaged row before ending the session.

## Rules

- Every candidate enters `queue.md` before any digestion decision; the
  queue is the only frontier record.
- Rejections always carry a reason tied to the exclusion criteria.
- Citation counts and graph centrality are discovery signals, not
  relevance or quality judgments.
- Never pad toward the paper budget: scale targets are budgets, not goals.

## Done When

- No `pending` row remains, or the unexpanded frontier is explicitly
  recorded and reported to the user
- The Scope block reflects the final criteria and the saturation/budget
  outcome
- `make check` passes
```

- [ ] **Step 2: Write `skills/explore-sota/references/citation-chasing.md`**

```markdown
# Citation Chasing & Anti-Echo-Chamber

## Review scales

| Scale | Use | Included papers | Chasing |
|---|---|---|---|
| quick-scan | orient an idea | ~8–15 | seeds + one high-yield hop |
| focused-sota | defensible related work | ~20–40 | both directions to local saturation |
| full-survey | survey-grade coverage | 50+ | iterative frontier expansion with recorded saturation |

Budgets are planning aids. Stop at saturation or at budget with blind spots
recorded — never pad with weak papers.

## Frontier discipline

1. Expand the current seed set one hop at a time (backward = references,
   forward = citers; both via semantic-scholar).
2. Deduplicate before triage: DOI, arXiv id, S2 id, then
   title + first author + year.
3. Triage chased candidates with the same inclusion/exclusion criteria as
   keyword hits.
4. Promote a candidate into the next seed set only deliberately — when it
   is digested and central to the scope. Never recursively chase everything.
5. Saturation = a new hop yields mostly duplicates or out-of-scope records.
6. If the budget ends first, record the unexpanded frontier explicitly
   instead of claiming coverage.

## Anti-echo-chamber checks (run before declaring saturation)

- Seeds span at least project-specific, seminal, and recent-frontier types.
- At least one adjacent-terminology or adjacent-community query ran with
  terms learned from full readings.
- At least one negative/contrastive query ran (failure, limitation,
  negative result, reproduction, replication).
- A sample of rejected near-misses was re-inspected to confirm the criteria
  are not too narrow.
- No single author group, venue, benchmark, or citation cluster dominates
  the SOTA without a recorded reason.
```

- [ ] **Step 3: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 2 skills: OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add skills/explore-sota
git commit -m "feat: add explore-sota skill"
```

---

### Task 5: Skill `write-survey`

**Files:**
- Create: `skills/write-survey/SKILL.md`
- Create: `skills/write-survey/references/survey-content.md`

- [ ] **Step 1: Write `skills/write-survey/SKILL.md`**

```markdown
---
name: write-survey
description: Use when writing the project survey from the digested SOTA or updating it after the SOTA changed — grouping design, gaps and research directions, and coverage maintenance.
license: MIT
---

# Write Survey

Produce or maintain `survey/survey.tex`: the single, complete, detailed
reading reference for the whole SOTA. After reading the survey, nobody
should need to reopen syntheses or PDFs for the large majority of questions.

## Read First

- `survey/README.md` — the survey contract
- `sota/index.md` — what the SOTA currently contains
- `survey/coverage.md` — what the survey currently integrates
- `references/survey-content.md` — content checklist and style

## Mode Selection

- `survey/coverage.md` lists no citekeys → **create mode**.
- Otherwise → **update mode**. The user can force a full rewrite, which is
  create mode.

## Create Mode

1. **Hard gate: read every synthesis.** List all `digested` citekeys from
   `sota/index.md`, read every `sota/papers/<citekey>/synthesis.md`, and
   confirm the count matches before writing a single word of survey prose.
2. Design the grouping from what was read: themes, concepts, methodologies
   — whatever organization fits this SOTA best. Write the outline as LaTeX
   section comments first.
3. Write section by section: per group, discuss each paper's contributions
   and notable aspects in depth, compare approaches, name tensions and
   contradictions. Respect each synthesis's "Safe claims / do-not-claim"
   section. Cite with `\cite{<citekey>}` only; every key resolves in the
   root `references.bib`.
4. Write the mandatory final content section, **Gaps and Research
   Directions**, grounded in the full picture per
   `references/survey-content.md`.
5. Fill `survey/coverage.md` with every integrated citekey.
6. Build (`make survey`) and validate (`make check`). Fix all errors.

## Update Mode

1. Diff: `to_add` = digested keys in `sota/index.md` missing from
   `coverage.md`; `to_remove` = covered keys now `excluded` or gone.
2. Read the syntheses of `to_add` and the survey sections they belong to.
3. Integrate additions into the right groups — extend or restructure a
   group when the new papers change its internal logic; never just append.
4. Excise removals: delete their discussion, repair comparisons and
   transitions that referenced them, re-check the gaps section.
5. Update `coverage.md`, rebuild, run `make check`.

## Rules

- Every statement about a paper is supported by its synthesis (or its PDF
  when more depth is needed) — never by model memory.
- The survey is self-contained: detailed enough to replace re-reading the
  SOTA for most purposes. No length limit; completeness wins.
- Never edit `references.bib` from this skill: a missing entry means the
  SOTA work is incomplete — stop and report.

## Done When

- `coverage.md` equals the set of digested citekeys (or the user-approved
  subset), `survey.pdf` is rebuilt, `make check` passes
```

- [ ] **Step 2: Write `skills/write-survey/references/survey-content.md`**

```markdown
# Survey Content Checklist

A complete survey covers, inside whatever grouping fits the SOTA:

- established findings vs contested claims — never smooth over disagreement
- methodological families and how they differ
- datasets, benchmarks, and metrics in use (a comparison table when three
  or more papers share an evaluation setting)
- limitations of the evidence base itself: what the field has not measured
- implications for this project's research question

## Gaps and Research Directions (mandatory final content section)

Each gap names: the evidence base (citekeys), the nearest prior work, why
existing methods fall short, and what evidence would close it. Each
direction ties to at least one gap and states a falsifiable expectation.
A gap no evidence supports is speculation — label it as such or drop it.

## Style

- theme-first prose; never a paper-by-paper laundry list
- hedging matches evidence strength ("suggests" stays "suggests")
- comparisons cite both sides; tensions are named explicitly
- each section ends with a short takeaway paragraph
```

- [ ] **Step 3: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 3 skills: OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add skills/write-survey
git commit -m "feat: add write-survey skill"
```

---

### Task 6: Skill `develop-contribution`

**Files:**
- Create: `skills/develop-contribution/SKILL.md`
- Create: `skills/develop-contribution/references/methodology.md`
- Create: `skills/develop-contribution/references/experiments.md`
- Create: `skills/develop-contribution/references/reproduction.md`
- Create: `skills/develop-contribution/references/ethics.md`

- [ ] **Step 1: Write `skills/develop-contribution/SKILL.md`**

```markdown
---
name: develop-contribution
description: Use when creating a new contribution (analysis, experiment, dataset, software, reproduction) or regularizing a draft folder into badge compliance with its LaTeX report.
license: MIT
---

# Develop Contribution

Create or regularize one `contributions/<slug>/` folder: badge-general
compliant, self-contained, with a `report/report.tex` detailed enough that
paper writing never needs to re-read the code.

## Read First

- `contributions/README.md` — the badge-general contract
- `survey/survey.pdf`, gaps section — when positioning a new contribution
- `references/methodology.md` — evaluation, statistics, figure discipline
- `references/experiments.md` — run logs and autonomous campaigns
- `references/reproduction.md` — reproducing external work
- `references/ethics.md` — data red flags

## Before Building (both modes)

Fill the Positioning section of the contribution README:

- the claim this contribution will support
- the delta vs the nearest prior work (cite survey/SOTA citekeys)
- the evidence plan: what will be measured or collected, and how
- the falsifiability condition: what outcome would refute the claim

If the claim has no evidence path, stop and discuss with the user.

## Create Mode

1. Copy `contributions/_template/` to `contributions/<slug>/` (kebab-case
   slug).
2. Python code? Write the contribution's own `pyproject.toml` (name,
   requires-python, dependencies), add `"contributions/<slug>"` to
   `[tool.uv.workspace] members` in the root `pyproject.toml`, run
   `uv sync` from the root. Genuinely conflicting dependencies → move the
   path to `exclude`, create a local venv, document it in the README.
3. Develop inside the folder — free-form structure (`src/`, `data/`,
   `figures/`, `outputs/`, notebooks). Follow `references/methodology.md`
   for any evaluation; keep a run log per `references/experiments.md` for
   every run that supports a claim, including autonomous campaigns. For
   reproductions of external work, follow `references/reproduction.md`.
4. Fill the README badge checklist truthfully — every checked box has
   evidence inside the folder. Check data against `references/ethics.md`.
5. Write `report/report.tex`: motivation, positioning vs the SOTA (cite the
   root `.bib`), method, setup, results with figures/tables, limitations.
   Build it: `make contribution C=<slug>`.
6. Run `make check`.

## Regularize Mode

1. Inventory the draft folder: what exists, what it claims, what is missing
   against the badge checklist.
2. Reorganize in place — keep provenance (note original filenames when
   renaming), capture the environment, verify the run path works
   end-to-end, record data provenance and ethics flags.
3. Continue with Create Mode steps 4–6.

## Rules

- Self-contained: no imports from other contributions; tooling worth
  sharing becomes its own contribution referenced in the README.
- Exploratory results never masquerade as confirmed evidence — label them.
- Negative results are results: report them in report.tex.

## Done When

- Badge checklist fully and truthfully checked, `report.pdf` built,
  workspace coherent, `make check` passes
```

- [ ] **Step 2: Write `skills/develop-contribution/references/methodology.md`**

```markdown
# Methodology Standard (CS evaluation)

Minimum for any evaluation that supports a claim:

- a credible baseline, or a stated reason none exists
- a metric justified by the research question
- dataset provenance and split policy recorded
- repeatability: seed, config, environment, hardware noted
- negative cases or boundary conditions exercised
- threats to validity: internal, external, construct, conclusion

Never: tune on test data; add baselines after seeing favorable results
without noting the timing; present exploratory runs as confirmed evidence;
hide failed or ambiguous runs that affect the claim.

## Statistics

- match the test to design, distribution, sample size, hypothesis
- report effect sizes and confidence intervals when relevant
- distinguish statistical from practical significance
- flag multiple comparisons, missing data, selection bias, confounds
- exploratory analysis is never confirmatory

## Figures and tables

- readable labels, units, captions; colorblind-safe palettes
- no misleading axes or decorative chart types
- save the source data and the generating command for every final figure
```

- [ ] **Step 3: Write `skills/develop-contribution/references/experiments.md`**

```markdown
# Experiment Log & Autonomous Campaigns

## Per-run record

Keep a run log in the contribution folder (e.g. `runs.md`) for every run
that supports a claim:

hypothesis | command | git commit | seed | config | data version | metric |
result | runtime | status | notes

## Autonomous campaigns (long unattended sessions)

Declare in the run log header before starting:

- mutability envelope: which files may change; which are frozen
- frozen harness: dataset split, evaluation command, metric and direction,
  budget (time or run count)
- baseline: run and record it before any variant
- frontier policy: keep / discard / crash, with the rule for advancing or
  reverting candidates
- stop conditions, and which events require human approval

Never silently change the metric, the split, or the evaluation harness. Any
change that alters scientific meaning stops the campaign for approval.
```

- [ ] **Step 4: Write `skills/develop-contribution/references/reproduction.md`**

```markdown
# Reproducing External Work

A reproduction contribution faithfully runs someone else's artifact; it
does not improve anything until the reproduction outcome is recorded.

1. Read the external repo's README, configs, environment files.
2. Inventory the documented commands.
3. Pick the smallest trustworthy target first: smoke test → inference →
   evaluation → training.
4. Record assumptions (data, weights, hardware) in the contribution README.
5. Run only documented or clearly justified commands.
6. Patches needed to make it run go in a separate `PATCHES.md` and are
   never mixed with this project's contribution claims.
7. Record the outcome honestly: reproduced / partial / failed, with logs.

A failed reproduction never silently becomes an exploratory refactor, and a
smoke test never supports a correctness or SOTA claim.
```

- [ ] **Step 5: Write `skills/develop-contribution/references/ethics.md`**

```markdown
# Ethics & Data Red Flags

Check before collecting, storing, or sharing data:

- personal identifiers in raw or derived files
- screenshots exposing users, handles, addresses, or private chats
- scraping behind login or against platform terms
- "publicly visible" is not automatically redistributable
- datasets shared without license or consent analysis
- model outputs that may reveal memorized sensitive data

Rules: raw sensitive data stays in gitignored local folders unless sharing
is approved; prefer aggregate or redacted outputs in reports; record every
de-identification transformation; re-check all of the above before any
artifact is packaged for release.
```

- [ ] **Step 6: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 4 skills: OK`, exit 0

- [ ] **Step 7: Commit**

```bash
git add skills/develop-contribution
git commit -m "feat: add develop-contribution skill"
```

---

### Task 7: Skill `write-paper`

**Files:**
- Create: `skills/write-paper/SKILL.md`
- Create: `skills/write-paper/references/writing-rules.md`
- Create: `skills/write-paper/references/venue-fit.md`

- [ ] **Step 1: Write `skills/write-paper/SKILL.md`**

```markdown
---
name: write-paper
description: Use when starting or writing a paper for a venue — venue selection, framing, contribution selection, and the full manuscript on the venue template.
license: MIT
---

# Write Paper

Build `papers/<slug>/`: a venue-specific paper assembled from the survey
and the contribution reports. The survey supplies related work; the reports
supply technical content; the root `references.bib` supplies every citation.

## Read First

- `papers/README.md` — the paper lifecycle contract
- `survey/survey.pdf` and the reports of candidate contributions
- `references/writing-rules.md`, `references/venue-fit.md`

## Procedure

1. **Venue.** If not fixed, compare candidates with the user using
   `references/venue-fit.md`. Fill `venue.md`: venue, track, deadlines,
   page/format rules, anonymization policy, template source, and the
   venue's specific badge/artifact requirements — from the real call for
   papers, never from memory.
2. **Framing.** Write `framing.md`: the story, the claims, which
   contributions support which claim and what each provides, and what is
   deliberately out of scope. Every claim must map to a contribution or to
   survey-grounded evidence.
3. **Template.** Import the venue's official LaTeX template into
   `manuscript/`; rename the entry point to `main.tex`. Use the bib system
   the venue class dictates (bibtex/natbib or biblatex), reading the root
   `references.bib` via relative path.
4. **Write.** Section by section: related work distilled from the survey
   (theme-first, never paper-by-paper); methods/results from the
   contribution reports and their figures; every `\cite{}` resolves in the
   root `.bib`. Follow `references/writing-rules.md`.
5. **Build and check.** `make paper P=<slug>`, verify page limits and
   format rules from `venue.md`, run `make check`.
6. Recommend an adversarial-review pass before any submission.

## External Mode (Overleaf)

When the user asks to work on an external LaTeX project (e.g. a
collaborator's Overleaf), use the overleaf MCP if configured: read or
contribute to that project directly. Nothing in this scaffold depends on
the external project; treat it as a foreign workspace, and apply
`references/writing-rules.md` there too.

## Rules

- A claim enters the manuscript only with its evidence: a contribution, a
  survey-grounded citation, or an explicitly labeled open question.
- Never invent or restyle bibliography entries; a missing entry means
  missing SOTA work — stop and report.
- Figures come from contribution folders; copy them in, never recreate
  data by hand.

## Done When

- `venue.md` and `framing.md` complete, the manuscript builds clean on the
  venue template within its limits, `make check` passes
```

- [ ] **Step 2: Write `skills/write-paper/references/writing-rules.md`**

```markdown
# Writing Rules

- Hedging matches evidence strength: "suggests" never upgrades to
  "demonstrates" without direct support.
- Separate author claims from cited claims; the reader must always know
  whose result a sentence reports.
- Related work synthesizes themes and positions this work inside them —
  never a mechanical paper-by-paper list.
- Mark missing evidence with a visible TODO for the user instead of
  inventing a citation or weakening traceability.
- Never strengthen a claim while editing prose.
- Keep limitations and scope explicit; name failed runs and missing
  baselines rather than hiding them.
- Preserve citation keys, labels, and cross-references when editing
  existing LaTeX.
```

- [ ] **Step 3: Write `skills/write-paper/references/venue-fit.md`**

```markdown
# Venue Fit Checks

For each candidate venue ask:

- Does this venue value this contribution type (empirical, system,
  dataset, reproduction, theory)?
- Are the baselines and datasets credible by this venue's norms?
- Does it require artifact evaluation or badges, and can the current
  contributions meet them?
- Is the novelty claim strong enough for the main track — or would a
  workshop, findings track, demo, or journal be more honest?
- Deadlines and review model (rebuttal? revision cycle?) vs project timing.

Record the comparison and the decision rationale in `venue.md`. Never
choose by prestige alone, and never reframe claims to fit a venue without
checking the evidence still supports them.
```

- [ ] **Step 4: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 5 skills: OK`, exit 0

- [ ] **Step 5: Commit**

```bash
git add skills/write-paper
git commit -m "feat: add write-paper skill"
```

---

### Task 8: Skill `package-artifacts`

**Files:**
- Create: `skills/package-artifacts/SKILL.md`
- Create: `skills/package-artifacts/references/artifact-standard.md`

- [ ] **Step 1: Write `skills/package-artifacts/SKILL.md`**

```markdown
---
name: package-artifacts
description: Use when packaging the artifacts of a paper for submission — assembling everything promised in the manuscript plus the venue's badge and artifact-evaluation requirements.
license: MIT
---

# Package Artifacts

Assemble `papers/<slug>/artifacts/`: the self-contained bundle a reviewer
or artifact-evaluation committee receives.

## Read First

- `papers/<slug>/venue.md` — the venue's badge/artifact requirements
- `papers/<slug>/manuscript/main.tex` — what the paper promises
- `references/artifact-standard.md`

## Procedure

1. List what must ship: every artifact promised in the manuscript (data,
   code, models, scripts) plus everything the venue's badge requirements
   demand.
2. Stage by copying the relevant `contributions/<slug>/` folders into
   `artifacts/` — they are self-contained by construction. Never hand-edit
   the staged copies: fix problems at the source contribution and re-stage.
3. Add the bundle-level files: an artifact README (claims-to-artifact map,
   setup, smoke test, expected outputs and runtime), license, citation
   file, and a `MANIFEST.md` listing every file with its sha256 checksum.
4. Strip what must not ship: gitignored material, secrets, raw sensitive
   data, and — when the venue requires anonymization — identifying paths
   and names.
5. Verify standalone: the bundle works without the surrounding repo (no
   `../` references, bibliography resolved, environment declared inside).
6. Walk `references/artifact-standard.md` and the venue checklist item by
   item; record the mapping in the artifact README.

## Done When

- The bundle satisfies the venue requirements and the artifact standard,
  `MANIFEST.md` checksums are fresh, and a clean-room smoke test (fresh
  unzip elsewhere, follow only the bundle README) succeeds
```

- [ ] **Step 2: Write `skills/package-artifacts/references/artifact-standard.md`**

```markdown
# Minimum Artifact Standard

Every submitted artifact bundle has:

- a one-command smoke test, or a clearly documented manual path
- environment capture (pyproject/requirements/Dockerfile) inside the bundle
- data access and provenance instructions, or the data itself when
  shareable
- expected outputs, and a comparison path against the paper's claims
- license and citation file
- expected runtime and hardware notes
- ethics and access constraints stated

Venue badges (ACM-style and equivalents):

- Available → archival deposit with an immutable identifier
- Functional → runs as documented; the smoke test passes
- Reusable → documented well enough to extend, not just rerun
- Reproduced → an independent run regenerates the paper's key results

Map each badge the venue offers to concrete evidence in the bundle README.
```

- [ ] **Step 3: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 6 skills: OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add skills/package-artifacts
git commit -m "feat: add package-artifacts skill"
```

---

### Task 9: Skill `manage-submission`

**Files:**
- Create: `skills/manage-submission/SKILL.md`
- Create: `skills/manage-submission/references/concern-map.md`

- [ ] **Step 1: Write `skills/manage-submission/SKILL.md`**

```markdown
---
name: manage-submission
description: Use when submitting a paper, recording decisions and reviews, drafting rebuttals and response letters, applying revisions, or preparing the camera-ready version.
license: MIT
---

# Manage Submission

Operate the lifecycle of `papers/<slug>/` around its venue events. The
current version always lives in `manuscript/`; every submitted version is
frozen forever in `archive/`.

## Read First

- `papers/README.md` — the lifecycle contract
- `papers/<slug>/correspondence/` — current review state
- `references/concern-map.md`

## Events

**Submit.** Verify `make paper P=<slug>` and `make check` pass and the
artifacts bundle is current. Freeze: copy `manuscript/` (with its PDF) and
`artifacts/` into `archive/r<N>/` exactly as submitted. Archives are
immutable from that moment.

**Decision received.** Save the decision letter and the reviews verbatim in
`correspondence/`. Summarize the outcome for the user.

**Rebuttal.** Build the concern map per `references/concern-map.md`. Draft
the response in `correspondence/`: per concern — direct answer, evidence,
and the exact manuscript change it commits to. Get user approval before
anything is sent.

**Revision.** Apply the promised changes to `manuscript/`, tracking which
concern each change answers (concern ids in a change log in
`correspondence/`). New scientific work requested by reviewers goes through
develop-contribution first, never directly into prose. Rebuild, re-check,
then Submit again as the next round.

**Camera-ready.** Apply final venue requirements (de-anonymization, format,
DOI links), then freeze `archive/camera-ready/`.

## Rules

- Never edit anything inside `archive/`.
- A response letter only promises changes that can actually land in the
  revision before the deadline.
- Reviews are private input: they stay inside `correspondence/` and are
  never quoted in public artifacts.

## Done When

- The event is fully recorded — archive frozen and/or correspondence
  updated — the manuscript state is consistent, and `make check` passes
```

- [ ] **Step 2: Write `skills/manage-submission/references/concern-map.md`**

```markdown
# Concern Map

Split every review into atomic concerns and table them in
`correspondence/concern-map.md`:

| id | reviewer | severity | location | concern | class | action | status |

- class: misunderstanding | valid limitation | missing evidence |
  writing issue | incorrect claim | scope mismatch | unfixable
- action: concede | clarify | add-evidence | reframe | defend | defer
- severity: fatal | major | minor | presentation

Response pattern per concern: (1) acknowledge, (2) answer the exact
concern, (3) cite evidence or the planned change, (4) name the manuscript
location that changes. No argumentative tone; no response that cannot be
mirrored in the revised paper. Never ignore a concern because it seems
unfair — classify it and answer it.
```

- [ ] **Step 3: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 7 skills: OK`, exit 0

- [ ] **Step 4: Commit**

```bash
git add skills/manage-submission
git commit -m "feat: add manage-submission skill"
```

---

### Task 10: Skill `adversarial-review`

**Files:**
- Create: `skills/adversarial-review/SKILL.md`
- Create: `skills/adversarial-review/references/claim-audit.md`
- Create: `skills/adversarial-review/references/review-lanes.md`

- [ ] **Step 1: Write `skills/adversarial-review/SKILL.md`**

```markdown
---
name: adversarial-review
description: Use when reviewing the survey, a contribution, or a paper draft as a severe but fair reviewer — claim audit, methodology critique, and venue-reviewer simulation before submission.
license: MIT
---

# Adversarial Review

Find the objections that would block acceptance before external reviewers
do. Review; never fix. Findings go to a report beside the artifact; the
artifact itself is never edited by this skill.

## Read First

- the artifact under review: `survey/survey.tex` + PDF, or a contribution
  README + report, or a manuscript + `framing.md` + `venue.md`
- `references/review-lanes.md`, `references/claim-audit.md`

## Procedure

1. Identify the target and the standard it must meet:
   - survey → coverage vs `sota/index.md`, grouping logic, fairness, and
     the quality of the gaps section
   - contribution → badge-checklist truthfulness, methodology (the
     develop-contribution methodology standard), claim–evidence match
   - paper → venue fit and reviewer simulation per `venue.md`, novelty,
     soundness, clarity
2. Read claim-first: contributions/claims, then the evidence offered.
3. Run the claim audit on every acceptance-critical claim per
   `references/claim-audit.md`: verify each against the cited synthesis,
   contribution output, or PDF.
4. Review through every lane in `references/review-lanes.md`; keep lane
   findings separate until the final synthesis.
5. Write the report to `reviews/<YYYY-MM-DD>-<scope>.md` beside the
   artifact (`survey/reviews/`, `contributions/<slug>/reviews/`,
   `papers/<slug>/reviews/` — create the folder on demand) with: executive
   summary and recommendation; strengths with evidence; weaknesses grouped
   by severity; the claim-audit table; questions the authors must answer;
   a prioritized revision roadmap.

## Criticism Standard

Every major criticism carries: exact claim or location, why it matters,
evidence, what would fix or weaken it, severity (fatal / major / moderate /
minor), and confidence. No performative harshness; no objection without
evidence; polish never excuses methodological weakness.

## Done When

- The report exists with all sections, every fatal/major finding is
  evidence-backed, and no lane finding was dropped during synthesis — if a
  finding is wrong, the report says why
```

- [ ] **Step 2: Write `skills/adversarial-review/references/claim-audit.md`**

```markdown
# Claim Audit

1. Extract atomic claims: numerical, factual, comparative, causal, novelty,
   SOTA, methodological.
2. Locate the cited evidence: synthesis, PDF span, contribution output, run
   log.
3. Assign a verdict:

- supported — exact or clearly entailed
- partially-supported — true only in narrower scope
- unsupported — no evidence found
- contradicted — evidence conflicts
- wrong-source — the citation does not support this claim
- needs-human — inaccessible or requires domain judgment
- stale — superseded after the cited evidence

4. Table: claim | location | cited source | evidence path | verdict | fix.

Fix discipline for the revision roadmap — smallest safe change first: add a
verified citation; weaken wording to the supported scope; split a broad
claim into supported parts; move speculation to limitations; remove the
claim. Never strengthen a claim during editing, never collapse
"unsupported" into "false", and never treat a bibliography match as proof
that the cited passage supports the claim.
```

- [ ] **Step 3: Write `skills/adversarial-review/references/review-lanes.md`**

```markdown
# Review Lanes

Run every lane; keep findings separate until synthesis so nothing vanishes:

- editor: venue fit, contribution threshold, audience, desk-reject risks
- methodology: design, datasets, baselines, metrics, statistics, ablations
- domain: related-work coverage, terminology, prior art, missing
  comparisons
- adversarial: strongest counterargument, overclaiming, alternative
  explanations
- reproducibility & ethics: artifact quality, data access, privacy,
  licenses, dual use

For papers, additionally simulate the named venue's review culture from
`venue.md`: review form, scoring scale, typical objections.
```

- [ ] **Step 4: Validate**

Run: `python3 scripts/validate_skills.py`
Expected: `validated 8 skills: OK`, exit 0

- [ ] **Step 5: Commit**

```bash
git add skills/adversarial-review
git commit -m "feat: add adversarial-review skill"
```

---

### Task 11: README and CHANGELOG

**Files:**
- Modify: `README.md` (full rewrite)
- Modify: `CHANGELOG.md` (full rewrite)

- [ ] **Step 1: Rewrite `README.md`**

````markdown
# Academic Research Skills

[![Validate Skills](https://github.com/VincenzoImp/academic-research-skills/actions/workflows/validate.yml/badge.svg)](https://github.com/VincenzoImp/academic-research-skills/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Eight agent skills for the full academic research pipeline:
SOTA → survey → contributions → papers.

Designed for repositories created by
[`create-academic-research`](https://github.com/VincenzoImp/create-academic-research)
(v0.2 scaffold), whose directory structure and formats the skills rely on:
one root `references.bib`, `sota/papers/<citekey>/` folders,
`survey/coverage.md`, self-contained `contributions/<slug>/` folders, and
per-venue `papers/<slug>/` folders. The skills are portable `SKILL.md`
files and work with any Agent-Skills-compatible runtime.

## Install

Project-local copy (done automatically by the create-academic-research
wizard):

```bash
npx -y skills add VincenzoImp/academic-research-skills --skill '*' --copy -y
```

## The Skills

| Skill | Use it to |
|---|---|
| `digest-paper` | digest one paper: PDF + synthesis + bib entry + citation graph + index row, MCP-verified end to end |
| `explore-sota` | run the SOTA exploration loop: search, citation chasing, triage queue, digestion — autonomous or targeted |
| `write-survey` | write the full LaTeX survey from all syntheses, or diff-update it when the SOTA changes |
| `develop-contribution` | create or regularize a badge-compliant, self-contained contribution with its LaTeX report |
| `write-paper` | pick a venue, frame the story, and write the manuscript from the survey and contribution reports |
| `package-artifacts` | build the self-contained submission bundle meeting the venue's badge requirements |
| `manage-submission` | freeze submission rounds, map reviewer concerns, draft rebuttals, apply revisions, camera-ready |
| `adversarial-review` | review the survey, a contribution, or a paper as a severe but fair reviewer |

## Hard Rules Baked In

- A citation exists only if a scholarly MCP lookup produced it; SOTA skills
  stop when `arxiv` or `semantic-scholar` are unavailable.
- Digestion is atomic: paper folder, synthesis, bib entry, citation graph,
  and index row land together or not at all.
- The survey's create mode reads every synthesis before writing a word.
- Archives of submitted papers are immutable.
- Reviewers (adversarial-review) report; they never edit the artifact.

## Validate

```bash
python3 scripts/validate_skills.py
```

## Release

Tag-driven: update `CHANGELOG.md`, tag `vX.Y.Z`, push the tag.
````

- [ ] **Step 2: Rewrite `CHANGELOG.md`**

```markdown
# Changelog

## 0.2.0

Full from-scratch rewrite for the create-academic-research v0.2 scaffold.

- 8 skills replace the 32 of v0.1: digest-paper, explore-sota,
  write-survey, develop-contribution, write-paper, package-artifacts,
  manage-submission, adversarial-review.
- Skills are plain portable `SKILL.md` + per-skill `references/`; the
  per-skill agent yaml, shared reference syncing, Python packaging, evals,
  and examples are gone.
- Skills target the v0.2 scaffold structure (root `references.bib`,
  `sota/papers/<citekey>/`, `survey/coverage.md`, `contributions/<slug>/`,
  `papers/<slug>/`) and its `make check` rails.
- Scholarly MCPs are mandatory for SOTA work: digest-paper and explore-sota
  hard-stop when arxiv or semantic-scholar do not respond.

Migration: v0.1 skills assume the v0.1 scaffold and were removed, not
renamed. Projects on the v0.1 scaffold should stay on skills 0.1.x.

## 0.1.x

See git history.
```

- [ ] **Step 3: Validate and commit**

```bash
python3 scripts/validate_skills.py
git add README.md CHANGELOG.md
git commit -m "docs: rewrite README and CHANGELOG for v0.2.0"
```

---

### Task 12: CI workflows

**Files:**
- Modify: `.github/workflows/validate.yml` (full rewrite)
- Modify: `.github/workflows/release.yml` (full rewrite)
- Keep as-is: `.github/dependabot.yml`, `.github/release.yml`

- [ ] **Step 1: Rewrite `.github/workflows/validate.yml`**

```yaml
name: Validate Skills

on:
  pull_request:
  push:
    branches: [main, redesign-0.2]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: "3.12"
      - run: python3 scripts/validate_skills.py
```

- [ ] **Step 2: Rewrite `.github/workflows/release.yml`**

```yaml
name: Release Skills

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

jobs:
  release:
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

      - uses: actions/checkout@v6
        with:
          ref: ${{ steps.release.outputs.tag }}

      - uses: actions/setup-python@v6
        with:
          python-version: "3.12"

      - run: python3 scripts/validate_skills.py

      - name: Check changelog matches tag
        shell: bash
        run: |
          set -euo pipefail
          version="${TAG#v}"
          grep -q "^## ${version}" CHANGELOG.md || {
            echo "CHANGELOG.md missing heading '## ${version}'" >&2
            exit 1
          }
        env:
          TAG: ${{ steps.release.outputs.tag }}

      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "${{ steps.release.outputs.tag }}" --generate-notes
```

- [ ] **Step 3: Lint the workflows locally**

Run: `npx -y github-actionlint`
Expected: no errors (exit 0)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "ci: slim validate and release workflows for v0.2"
```

---

### Task 13: Final verification and release gate

- [ ] **Step 1: Full validation**

```bash
python3 scripts/validate_skills.py
```

Expected: `validated 8 skills: OK`, exit 0

- [ ] **Step 2: Repo inventory sanity check**

Run: `git ls-files | sort`
Expected — exactly these paths (plus nothing else):

```
.github/dependabot.yml
.github/release.yml
.github/workflows/release.yml
.github/workflows/validate.yml
.gitignore
CHANGELOG.md
LICENSE
README.md
SECURITY.md
scripts/validate_skills.py
skills/adversarial-review/SKILL.md
skills/adversarial-review/references/claim-audit.md
skills/adversarial-review/references/review-lanes.md
skills/develop-contribution/SKILL.md
skills/develop-contribution/references/ethics.md
skills/develop-contribution/references/experiments.md
skills/develop-contribution/references/methodology.md
skills/develop-contribution/references/reproduction.md
skills/digest-paper/SKILL.md
skills/digest-paper/references/bibliography-rules.md
skills/explore-sota/SKILL.md
skills/explore-sota/references/citation-chasing.md
skills/manage-submission/SKILL.md
skills/manage-submission/references/concern-map.md
skills/package-artifacts/SKILL.md
skills/package-artifacts/references/artifact-standard.md
skills/write-paper/SKILL.md
skills/write-paper/references/venue-fit.md
skills/write-paper/references/writing-rules.md
skills/write-survey/SKILL.md
skills/write-survey/references/survey-content.md
```

(If extra v0.1 files survive, remove them and commit.)

- [ ] **Step 3: STOP — user review gate**

Report completion to the user. Do NOT merge or tag without explicit
approval. When approved, the release commands are:

```bash
git checkout main
git merge --no-ff redesign-0.2 -m "release: v0.2.0 skills rewrite"
git tag -a v0.2.0 -m "v0.2.0"
git push origin main v0.2.0
```

(Tagging happens only after the create-academic-research rewrite is also
reviewed, so both repos release together.)

---

## Self-review notes

- Spec coverage: 8 skills (spec table) → Tasks 3–10; curated carry-overs →
  the 12 reference files; validation + workflows → Tasks 2, 12; release
  ordering (skills first) → header note + Task 13 gate.
- All SKILL.md `description` fields start with "Use when " and stay under
  500 chars (validator enforces).
- Scaffold paths referenced by skills (`sota/README.md`, `make check`,
  `coverage.md`, `_template/`, `archive/`) match the v0.2 spec exactly.
