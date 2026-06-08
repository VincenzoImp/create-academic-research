# Survey Contract

## Survey Mode

Mode: narrative | systematic | scoping | meta-analysis | mixed

## Inputs

- `sota/sota-claim-ledger.csv`
- `sota/gaps.md`
- `sota/synthesis.md`
- `sota/literature-matrix.csv`
- `sources/source-ledger.csv`
- `sources/bib/references.bib`

## Section-By-Section Drafting

Create one section plan in `survey/section-plans/` before drafting that section. Each section plan must name source IDs, SOTA claim IDs, intended survey claim IDs, limitations, and expected figures or tables.

Draft one section at a time in `survey/drafts/`. Review and revise each section before integrating it into `survey/final/`.

## Claim Rules

Every durable survey claim belongs in `survey/survey-claim-ledger.csv` and links back to SOTA claim IDs. Do not strengthen wording beyond the SOTA claim ledger.

## Compliance Activation

Systematic, scoping, and meta-analysis modes activate `survey/compliance/` and PRISMA-style evidence. Narrative and mixed modes still record screening scope, limitations, and blind spots.

## Review Loop

Use contract -> outline -> section plan -> section draft -> adversarial review -> fix -> re-review. The loop closes only when no blocker or major issue remains.

## Clean-Final Gate

Final survey artifacts must not contain unresolved review notes, stale alternatives, unsupported claims, obsolete figures, obsolete tables, or visible iteration residue.
