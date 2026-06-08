# Contribution Badge Plan

Use this file to decide which badge and compliance profiles the contribution
package actively supports.

## Active Profiles

List only profiles selected for this package. Do not activate every available
profile by default.

| profile_id | target | evidence_paths | blocking_gaps | reviewer | checked_on | status |
| --- | --- | --- | --- | --- | --- | --- |

## Evidence Discipline

Badge evidence must point to committed package paths, commands, data,
environment notes, expected outputs, and validation status. Mirror paper-facing
evidence in `artifacts/badge-evidence-ledger.csv` when a contribution supports
an external badge claim.

## Final Gate

The final package review checks that badge claims match active profiles, that
missing evidence is explicit, and that no stale table, figure, model, dataset,
or command is still referenced.
