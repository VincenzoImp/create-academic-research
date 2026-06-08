# Agent Operating Guide

This is an academic research project. Treat it as both a software project and a
scholarly record.

## Core Rules

- Preserve source originals under `sources/`, `data/raw/`, and `data/external/`.
- Keep reusable logic in `src/`; keep `scripts/` as thin repeatable entrypoints.
- Keep notebooks for exploration and narrative output.
- Tie claims to sources, datasets, experiment records, or decision records.
- Update durable records when project knowledge changes.
- Keep large data, generated caches, credentials, and private review material out of git.
- Keep `.env.example` as a public reference only; never commit filled `.env`,
  `.env.local`, API keys, tokens, cookies, or browser sessions.

## First Read

1. `README.md`
2. `configs/default.yaml`
3. `configs/capabilities.yaml`
4. `docs/agent/capability-profile.md`
5. `docs/agent/project-quality.md`
6. `docs/agent/research-program.md`
7. `docs/agent/research-workflow.md`
8. `docs/agent/review-loop.md`
9. `docs/agent/skill-readiness.md`
10. `wiki/index.md`

## Standard Workflow

1. Identify whether the task affects sources, data, methods, experiments, claims, writing, or agent setup.
2. Use project-local skills when available; route ambiguous work through `research-project-router`.
3. Make repeatable changes in `src/`, `configs/`, or documented workflows.
4. Add tests or validation for code and structural changes.
5. Update `wiki/log.md` and affected wiki/docs pages before finishing.

For multi-stage research, preserve this order unless the user explicitly narrows
the task:

source ingestion -> SOTA -> survey -> research agenda -> contribution -> analysis -> paper framing -> paper release + manuscript -> submission -> response/revision

## Project Quality

- Keep every user request inside the project quality contract in `docs/agent/project-quality.md`.
- Put each artifact in its correct work zone: exploratory, debug, analysis, reproduction, final output, report, source, or release.
- Promote outputs only when inputs, command/procedure, validation, limitations, and linked claims are recorded.
- Update `artifacts/badge-evidence-ledger.csv` whenever a task creates evidence for artifact availability, functionality, reusability, reproduction, or replication.
- The user guides the research direction; agents preserve internal order, provenance, and validation discipline.

## Memory Contract

- `wiki/log.md` is chronological and append-only.
- `wiki/index.md` indexes reusable pages.
- `wiki/synthesis.md` changes only when the project-level interpretation changes.
- `wiki/open_questions.md` tracks unresolved questions.
- `wiki/contradictions.md` tracks conflicts across sources, data, or runs.
- `wiki/templates/` contains reusable source, claim, experiment, decision,
  reviewer-concern, and research-question page structures.

## Evidence

- Native PDFs and reports go in `sources/pdfs/`.
- Derived Markdown goes in `sources/markdown/`.
- Linear reading copies go in `sources/markdown-linear/`.
- Metadata goes in `sources/metadata/`.
- Bibliography records go in `sources/bib/references.bib`.
- Citation issues go in `sources/bib/citation-audit.csv`.
- Zotero imports go in `sources/zotero/`; reconcile every Zotero item to `sources/source-ledger.csv`, `sources/bib/references.bib`, citation audit, and SOTA linkage before using it as evidence.
- SOTA records go in `sota/`.
- Survey contracts, claim ledgers, section plans, drafts, final survey artifacts, compliance notes, and reviews go in `survey/`.
- Agenda opportunities, direction records, final agenda artifacts, and reviews go in `research_agenda/`.
- Contribution packages, claim maps, badge plans, generated output references, paper exports, reviews, and archives go in `contributions/`.
- Strict analysis bundles for contribution-local analyses go in `contributions/<contribution_id>/analyses/<analysis_id>/`.
- Paper frame ledgers, selected contribution maps, venue fit, badge fit, release plans, outlines, reviews, and decisions go in `paper_frames/`.
- Paper-specific release manifests, source maps, locks, checksums, staged outputs, metadata, reviews, and archives go in `paper_releases/`.
- Manuscript ledgers, LaTeX files, claim maps, citation maps, asset maps, and writing reviews go in `reports/paper/`.
- Core/supporting paper syntheses go in `sota/paper-syntheses/`.
- Full-text reading progress goes in `sota/reading-log.csv`.
- Citation graph expansion goes in `sota/citation-chasing-log.csv`.
- Curated experiment records go in `experiments/`.
- Repeatable command entrypoints go in `scripts/`.

## SOTA Discipline

- Run `npm run workflow:literature` before serious SOTA, survey, or related-work work.
- Declare the review scale: quick-scan, focused-sota, or full-survey.
- Use citation chasing in both directions from seeds; record rounds and stopping conditions.
- Do not use abstract-only records for durable claims.
- For core/supporting papers, acquire full text, read linearly, create a per-paper synthesis, normalize the BibTeX entry, then cite.
