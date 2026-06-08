# Survey Workflow Prompt

## Purpose

Turn reviewed SOTA claims into a structured survey that explains research
threads, methods, experiments, results, gaps, contradictions, and limitations.

## Preflight

Run `npm run workflow:survey` and inspect the survey contract, outline, SOTA
claim ledger, survey claim ledger, section plans, drafts, final folder, and
reviews.

## Required Skills

Use survey-synthesis, systematic-review-prisma when applicable,
citation-claim-audit, and adversarial-peer-review skills.

## Ledger

Update `survey/survey-claim-ledger.csv`, section plans, review records, and final
survey artifacts. Link every survey claim to SOTA claim IDs and source IDs.

## Review Loop

Plan, draft, review, fix, and re-review one section at a time. Integrate only
sections whose review finds no unsupported claims, missing caveats, stale
citations, or structural drift.

## Handoff

Handoff reviewed survey claims and section syntheses to the research agenda only
after the final clean-copy gate passes.
