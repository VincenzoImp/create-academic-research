# Literature Workflow Prompt

## Purpose

Build the SOTA evidence base from source ingestion, citation graph expansion,
full-text reading, SOTA claim extraction, and promotion gates.

## Preflight

Run `npm run workflow:literature` and inspect the reported MCP status, selected
MCPs, source ledgers, SOTA ledgers, and missing prerequisites.

## Required Skills

Use source-ingestion, sota-literature-review, citation-claim-audit, and
adversarial-peer-review skills. Use Zotero only as an optional import interface;
reconcile it through repository ledgers before using evidence.

## Ledger

Update `sources/source-ledger.csv`, `sota/literature-matrix.csv`,
`sota/sota-claim-ledger.csv`, reading logs, screening decisions, citation
chasing logs, and paper syntheses.

## Review Loop

Process sources in bounded batches. For each batch: ingest, read, extract
claims, review adversarially, fix issues, and repeat until no blocking evidence,
citation, wording, or provenance issue remains.

## Handoff

Handoff only reviewed SOTA claims with allowed wording, limitations,
contradictions, source IDs, BibTeX keys, and downstream status.
