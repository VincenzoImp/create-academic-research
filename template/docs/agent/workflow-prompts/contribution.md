# Contribution Workflow Prompt

## Purpose

Turn reviewed agenda opportunities into contribution packages that can contain
analyses, experiments, artifacts, software, datasets, models, or other paper
contributions.

## Preflight

Run `npm run workflow:contribution` and inspect the contribution ledger,
contribution manifest, claim map, badge plan, report template, compliance
profiles, inputs, outputs, reviews, and archive.

## Required Skills

Use contribution-package, research-data-analysis, research-results-reporting,
experiment-logbook, publication-figures-tables, and badge-compliance-profiles
skills as applicable to the contribution type.

## Ledger

Update `contributions/contribution-ledger.csv`, contribution manifest, claim map,
badge plan, output paths, paper export paths, reviews, and supersession state.

## Review Loop

Build the contribution in small reviewed slices. After each slice, verify
inputs, outputs, claims, limitations, badge evidence, and clean-copy status.
Repeat until review finds no stale or unsupported residue.

## Handoff

Handoff only reviewed contribution reports and paper exports with canonical
data, table, figure, artifact, and claim references.
