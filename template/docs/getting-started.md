# Getting Started

Use this path for the first working session in a new research repository.

## 1. Check The Repository

```bash
npm install
npm run doctor
npm run update
npm run update -- --apply
npm run setup -- --env-file .env.local
npm run doctor
```

`doctor` checks required files and structural contracts. `update` uses
`create-academic-research@latest` and is a dry-run unless you pass
`-- --apply`. Safe scaffold files are tracked in
`.academic-research/managed-files.json`; locally edited files are skipped
instead of overwritten. `setup` prints the active skill preset, installed skill
count, enabled MCP records, and next commands. With `-- --env-file .env.local`,
it can complete safe project-local MCP setup such as the Overleaf wrapper and
generated snippet. It does not register global MCP clients.

If an older project still has a pinned `update` script, run:

```bash
npm exec --yes --package=create-academic-research@latest -- academic-research update --root .
npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply
```

Read `docs/agent/project-quality.md` before substantive work. It defines where
each class of source, SOTA record, experiment, analysis, LaTeX file, artifact,
and final output belongs.

Also read:

- `docs/agent/research-workflow.md`
- `docs/agent/review-loop.md`
- `docs/agent/skill-readiness.md`
- `docs/agent/workflow-prompts/README.md`
- `compliance/README.md`

## 2. Install Project-Local Skills

Install the default academic research skill package:

```bash
npm run skills:install
npm run skills:status
```

Use `enhanced` only when the project also needs complementary development,
document, frontend, testing, and conversion skills:

```bash
npm run skills:install -- --preset enhanced
```

## 3. Prepare MCP Environment

Keep `.env.example` committed and empty of real secrets. Put filled values in
`.env.local`, your shell, or your MCP client secret store.

```bash
npm run mcp:dotenv
cp .env.example .env.local
npm run mcp:env -- openalex semantic-scholar zotero
npm run mcp:doctor -- --env-file .env.local
```

`mcp smoke` is a non-launching readiness check. `mcp probe` is opt-in: local
stdio servers get a real handshake, while remote endpoints are reported as
configured without a network probe.

```bash
npm run mcp:smoke -- --env-file .env.local
npm run mcp:probe -- arxiv --timeout-ms 5000
```

## 4. Prepare The Literature Workflow

For SOTA, survey, or related-work tasks, configure the practical citation graph
stack before broad searching:

```bash
npm run workflow:literature
npm run skills:install -- --preset literature
npm run mcp:status
npm run mcp:smoke -- --env-file .env.local
```

This selects arXiv, DBLP, Semantic Scholar, and OpenAlex remote graph search.
Use `$sota-literature-review` with a declared scale: `quick-scan`,
`focused-sota`, or `full-survey`.

For survey writing after SOTA promotion, run:

```bash
npm run workflow:survey
```

Use `survey/survey-contract.md` to declare the survey mode before writing sections.

For research agenda work after survey/SOTA synthesis, run:

```bash
npm run workflow:agenda
```

Use `research_agenda/opportunity-ledger.csv` for durable opportunity decisions.

For accepted opportunity work that may become a paper contribution, run:

```bash
npm run workflow:contribution
```

Copy `contributions/templates/` to `contributions/<contribution_id>/`, update
`contributions/contribution-ledger.csv`, and keep claims, reports, badge plans,
reviews, and generated output paths inside that package.

For contribution-local analysis work, run:

```bash
npm run workflow:analysis
```

Copy `contributions/templates/analyses/templates/` to
`contributions/<contribution_id>/analyses/<analysis_id>/`. If strict preflight
fails, write only `blocker-summary.md` until the missing fields are resolved.

For paper framing before manuscript or release work, run:

```bash
npm run workflow:frame
```

Use `paper_frames/templates/` to create a candidate frame, select
contributions, check venue fit, check badge/compliance fit, and record whether
the frame is accepted, rejected, or held.

For paper-specific release planning, run:

```bash
npm run workflow:release
```

Use `paper_releases/templates/` to define `release.yaml`, `source-map.csv`,
`release-plan.lock`, and `checksums.txt`. Release staging is generated from
those files and canonical project paths.

For manuscript assembly after an accepted frame, run:

```bash
npm run workflow:manuscript
```

Use `reports/paper/templates/` to assemble section-by-section LaTeX drafts from
the accepted frame, reviewed contribution reports, analysis exports, central
BibTeX, claim map, citation map, and asset map.

For submission packaging and response management, run:

```bash
npm run workflow:submission
npm run workflow:response
```

Use `paper_submissions/templates/` for cover letters, submission checklists,
submitted locks, venue-system notes, decision letters, reviewer concerns,
response letters, rebuttals, and revision plans. New scientific work requested
by reviewers returns to contributions, analyses, citations, or artifacts before
it is cited in response text.

Each `npm run workflow:<stage>` command points to a matching prompt in
`docs/agent/workflow-prompts/`. Use that prompt as the agent-facing procedure
for skills, ledgers, review loops, and clean handoff.

## 5. Start Source Work

Put source originals and metadata in the source layer before synthesis.

```text
sources/pdfs/       native PDFs
sources/markdown/   derived Markdown
sources/markdown-linear/ cover-to-cover reading copies
sources/metadata/   downloaded metadata or query exports
sources/bib/        BibTeX and citation audits
sources/zotero/     optional Zotero import and collection reconciliation
```

Update `sources/source-ledger.csv` whenever a paper, report, dataset, or web
source becomes evidence for the project.

Zotero can enrich this step if a local library is available. Record imports in
`sources/zotero/import-log.csv`, then reconcile every item to the source ledger,
project BibTeX, citation audit, and SOTA records before citing it.

## 6. Build The First SOTA Pass

Use `sota/search-strategy.md` to record search terms, databases, dates, and
inclusion criteria. Record full-text reading in `sota/reading-log.csv` and
citation expansion in `sota/citation-chasing-log.csv`. Put screened sources in
`sota/literature-matrix.csv`, create per-paper syntheses in
`sota/paper-syntheses/`, then summarize stable conclusions in
`sota/synthesis.md`.

Promote durable SOTA claims through `sota/sota-claim-ledger.csv`. Downstream
survey, agenda, contribution, and manuscript work should use the ledger's
allowed wording, evidence strength, downstream status, and unresolved risks.

Do not treat MCP output as final evidence until the relevant source has been
ingested, deduplicated, read in full when core/supporting, and tied to a source
record and bibliography key.

## 7. Keep Durable Memory Current

Update the wiki when project knowledge changes:

- `wiki/log.md`: chronological actions and decisions.
- `wiki/index.md`: navigation index.
- `wiki/synthesis.md`: current project-level interpretation.
- `wiki/open_questions.md`: unresolved questions.
- `wiki/contradictions.md`: conflicting sources, claims, or runs.

Prefer small, source-linked updates over long ungrounded summaries.
