# Paper Release Workflow Prompt

## Purpose

Create a paper-specific release package from canonical project paths without
turning staged release files into a second source of truth.

## Preflight

Run `npm run workflow:release` and inspect release ledger, release manifest,
source map, release-plan lock, checksums, script guidance, frame decision, and
included contribution paths.

## Required Skills

Use paper-release, artifact-open-science, research-repo-reproduction, and
badge-compliance-profiles skills.

## Ledger

Update `paper_releases/release-ledger.csv`, release manifest, source map, lock,
checksums, metadata, reviews, and archive.

## Review Loop

Build the release from source maps and locks, smoke test it, review for stale
files or missing badge evidence, fix issues, regenerate, and repeat until no
blocking release concern remains.

## Handoff

Handoff only release packages whose source map, checksums, metadata, and review
records agree with canonical project evidence.
