# SOTA Promotion Rules

## Claim Promotion Gate

A SOTA claim can move into survey, research agenda, contribution, framing, manuscript, or response work only when it has a row in `sota/sota-claim-ledger.csv`.

The row must name source IDs, BibTeX keys, evidence strength, allowed wording, forbidden stronger wording, limitations, contradictions, downstream status, unresolved risks, and review status.

## Allowed Wording

Downstream writing must use the allowed wording or a weaker version of it. Do not strengthen scope, causality, generality, novelty, or empirical certainty beyond the ledger row.

## Forbidden Stronger Wording

Use `forbidden_stronger_wording` to block tempting claims that the evidence does not support. If the stronger wording becomes supportable, update the source evidence, SOTA reading records, claim ledger, and review status before using it.

## Downstream Status

Use `downstream_status` values consistently:

- `blocked`: claim is not ready for downstream use.
- `survey-ready`: claim can support survey synthesis.
- `agenda-ready`: claim can support gap and opportunity framing.
- `contribution-ready`: claim can support a contribution package.
- `paper-ready`: claim can support a framed manuscript.

## Review Rule

A claim with unresolved contradictions, unresolved risks, or missing full-text support cannot be promoted beyond survey caveats.
