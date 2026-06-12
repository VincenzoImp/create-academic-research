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
