# Getting Started

Use this path for the first working session in a new research repository.

## 1. Check The Repository

```bash
npm install
npm run doctor
npm run update
npm run setup
```

`doctor` checks required files and structural contracts. `update` is a dry-run
unless you pass `-- --apply`. `setup` prints the active skill preset,
installed skill count, enabled MCP records, and next commands without changing
files.

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

## 4. Start Source Work

Put source originals and metadata in the source layer before synthesis.

```text
sources/pdfs/       native PDFs
sources/markdown/   derived Markdown
sources/metadata/   downloaded metadata or query exports
sources/bib/        BibTeX and citation audits
```

Update `sources/source-ledger.csv` whenever a paper, report, dataset, or web
source becomes evidence for the project.

## 5. Build The First SOTA Pass

Use `sota/search-strategy.md` to record search terms, databases, dates, and
inclusion criteria. Put screened sources in `sota/literature-matrix.csv`, then
summarize stable conclusions in `sota/synthesis.md`.

Do not treat MCP output as final evidence until the relevant source has been
ingested, deduplicated, and tied to a source record.

## 6. Keep Durable Memory Current

Update the wiki when project knowledge changes:

- `wiki/log.md`: chronological actions and decisions.
- `wiki/index.md`: navigation index.
- `wiki/synthesis.md`: current project-level interpretation.
- `wiki/open_questions.md`: unresolved questions.
- `wiki/contradictions.md`: conflicting sources, claims, or runs.

Prefer small, source-linked updates over long ungrounded summaries.
