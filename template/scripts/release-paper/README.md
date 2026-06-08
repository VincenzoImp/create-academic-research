# Paper Release Scripts

Release scripts should read `paper_releases/<release_id>/release.yaml`,
`source-map.csv`, and `release-plan.lock`, then materialize the release staging
directories.

Rules:

- copy only paths listed in the source map
- preserve the canonical source path for every released file
- write checksums after materialization
- fail if an excluded path would leak into the release
- fail if a staged file has no source-map row
- never treat release staging as canonical research evidence
