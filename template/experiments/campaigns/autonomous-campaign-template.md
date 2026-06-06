# Autonomous Experiment Campaign

Use this template for bounded autonomous or overnight experiment loops. The goal
is to let an agent iterate without losing scientific comparability.

## Research Question

<fill: question or optimization target>

## Mutability Envelope

- Editable files or modules:
- Read-only files or modules:
- Allowed dependency changes:
- Forbidden changes:

## Frozen Harness

- Dataset and split:
- Evaluation script or function:
- Metric and direction:
- Resource measure:
- Time or compute budget:
- Hardware or runtime constraints:

## Baseline Run

- Baseline commit:
- Command:
- Metric value:
- Resource value:
- Output path:

## Frontier Tracking

Record every candidate in `experiments/campaigns/frontier-results.tsv`.

Statuses: keep, discard, crash.

- `keep`: candidate improves the agreed metric or simplifies without degrading.
- `discard`: candidate runs but does not improve enough to keep.
- `crash`: candidate fails, times out, or exceeds resource limits.

Keep `explore_outputs/` for raw exploratory logs, `debug_outputs/` for crash
diagnosis, and promote only trusted evidence to `train_outputs/`,
`repro_outputs/`, or `outputs/`.

## Loop Procedure

1. Check git state and current best result.
2. Make one candidate change inside the mutability envelope.
3. Commit or otherwise snapshot the candidate before running.
4. Run the exact command with bounded output capture.
5. Extract metric, resource value, runtime, and status.
6. Append the result to `frontier-results.tsv`.
7. Keep, discard, or diagnose according to the campaign policy.
8. Stop only at the declared stop condition or when scientific meaning changes.

## Stop Conditions

- Maximum runs:
- Maximum wall-clock time:
- Minimum meaningful improvement:
- Human approval required when:

## Notes

<fill: interpretation, surprising findings, or next hypotheses>
