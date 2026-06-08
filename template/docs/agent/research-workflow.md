# Research Workflow

The project workflow is:

source ingestion -> SOTA -> survey -> research agenda -> contribution packages -> analysis / experiment / artifact subworkflows -> paper framing -> paper release + manuscript -> submission -> response/revision

## Stage Contracts

Each stage has a contract, expected inputs, expected outputs, review state, and handoff target.

The stage order is not a command to produce everything in one pass. Large outputs are built section by section or bundle by bundle, reviewed adversarially, fixed, and reviewed again before promotion.

## Claim Promotion

Claims move through source evidence, SOTA claim ledgers, survey claims, agenda opportunities, contribution claim maps, analysis bundles, paper frames, manuscript claim maps, and response/revision evidence.

Do not introduce a claim directly in a late-stage artifact if it has not been grounded in the earlier evidence layers.

SOTA claims must use `sota/sota-claim-ledger.csv` before promotion. The ledger controls evidence strength, allowed wording, forbidden stronger wording, downstream status, and unresolved risks.

Survey claims must use `survey/survey-claim-ledger.csv` and link back to SOTA claim IDs. Survey sections are planned, drafted, reviewed, fixed, and re-reviewed one section at a time.

## New Sources

New late-stage citations return to source ingestion, bibliography normalization, SOTA linkage, and claim audit before they enter manuscript or response text.

## Zotero

Zotero is optional local-library enrichment. Zotero discoveries, attachments, and BibTeX exports must be reconciled through `sources/zotero/import-log.csv`, `sources/source-ledger.csv`, `sources/bib/references.bib`, `sources/bib/citation-audit.csv`, and SOTA linkage before they become durable evidence.

## Submission And Response

Cover letters, decision letters, reviewer comments, rebuttals, response letters, and revision plans are communication artifacts. Reviewer-requested new scientific work belongs in contribution packages and analysis bundles, then is linked from the response package.
