# Contribution Package Template

Copy this directory to `contributions/<contribution_id>/` when a reviewed
agenda opportunity is accepted for development.

Each package is a canonical evidence container. It can hold analyses,
experiments, datasets, software, benchmarks, protocols, systems, reproduction
work, replication work, negative results, or a mixed contribution. Later paper
frames cite contribution packages rather than loose outputs.

Required package records:

- `contribution.yaml`: identity, agenda linkage, evidence, component paths,
  outputs, badge targets, compliance profiles, review state, and supersession.
- `claim-map.md`: claims allowed to flow from this package into a frame or
  manuscript.
- `badge-plan.md`: badge and compliance obligations selected for this package.
- `report.md`: internal decision report that references generated outputs by
  path.
- `reviews/`: adversarial reviews, fixes, and final clean-copy checks.
- `archive/`: superseded package material with explicit supersession metadata.

Do not treat this template directory as a live contribution. A live package
gets a unique directory and a row in `contributions/contribution-ledger.csv`.
