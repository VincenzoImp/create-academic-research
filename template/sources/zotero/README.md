# Zotero Source Ingestion

Zotero is an optional local-library enrichment interface. It can accelerate discovery, attachment lookup, collection review, and BibTeX export, but it is not the source of truth for this repository.

Every imported Zotero item must reconcile through:

- `sources/zotero/import-log.csv`
- `sources/source-ledger.csv`
- `sources/bib/references.bib`
- `sources/bib/citation-audit.csv`
- the relevant SOTA screening, reading, and literature-matrix records

## Import Contract

Record each import or reconciliation pass in `import-log.csv`. Keep the Zotero collection key, item key, attachment path, exported BibTeX key, source ID, and reconciliation status visible.

## Collection Map

Use `collection-map.csv` to map Zotero collections to project source sets, review scopes, or search rounds. Do not treat collection membership as evidence quality.

## Evidence Rule

MCP or Zotero output is retrieval metadata until the source is ingested, deduplicated, cited through the project BibTeX file, and linked to SOTA or downstream claim records.
