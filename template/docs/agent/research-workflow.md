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

Research agenda opportunities must use `research_agenda/opportunity-ledger.csv`. Opportunity review checks novelty, feasibility, evidence, publishability, and ethical/release constraints before contribution work begins.

Contribution packages must use `contributions/contribution-ledger.csv` and a copied package template under `contributions/<contribution_id>/`. A package links agenda opportunities, evidence records, component analyses or experiments, generated output paths, badge targets, compliance profiles, review state, and supersession state before it can support a paper frame.

Contribution reports reference generated data, tables, figures, models, software, and artifact files by path. Do not rewrite numeric truth in prose when a generated output is the canonical source.

Strict analysis bundles live inside contribution packages. If primary question,
unit of analysis, metric direction, raw provenance, sample/seed/run counts, or
comparison family are missing, the only valid analysis output is
`blocker-summary.md`; polished reports and paper-facing figures/tables wait
until the strict manifest and review gates pass.

Badge and compliance work starts from `compliance/profiles.yaml`. Projects may
support many badge families, but each paper frame, contribution, or release
activates only the profiles it can evidence.

Paper frames live in `paper_frames/`. A frame selects a target venue, track,
year, audience, contribution packages, analysis bundles, badge targets,
compliance profiles, and release implications. Manuscript and release work
start only after a frame decision is accepted.

Paper releases live in `paper_releases/`. Release staging is generated from a
manifest, source map, lock, and checksums. Staged release files are not a
second source of truth and should not be edited by hand.

Manuscripts live in `reports/paper/`. Drafts are assembled section by section
from an accepted frame, reviewed contribution reports, analysis paper exports,
central BibTeX, paper claim maps, citation maps, and asset maps. Final review
must reject stale tables, stale figures, unsupported claims, unreconciled
citations, and draft residue.

## New Sources

New late-stage citations return to source ingestion, bibliography normalization, SOTA linkage, and claim audit before they enter manuscript or response text.

## Zotero

Zotero is optional local-library enrichment. Zotero discoveries, attachments, and BibTeX exports must be reconciled through `sources/zotero/import-log.csv`, `sources/source-ledger.csv`, `sources/bib/references.bib`, `sources/bib/citation-audit.csv`, and SOTA linkage before they become durable evidence.

## Submission And Response

Cover letters, decision letters, reviewer comments, rebuttals, response letters,
and revision plans live in `paper_submissions/` as communication artifacts.
Reviewer-requested new scientific work belongs in contribution packages,
analysis bundles, citation work, or artifact work, then is linked from the
response package.
