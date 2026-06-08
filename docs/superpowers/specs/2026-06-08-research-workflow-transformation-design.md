# Research Workflow Transformation Design

Status: draft for user review
Date: 2026-06-08

## Purpose

Transform `create-academic-research` from a strong academic research scaffold
into a complete methodological research workflow:

```text
source ingestion -> SOTA -> survey -> research agenda -> contribution packages -> paper framing -> paper release + manuscript -> submission and review lifecycle
```

The goal is not to make a paper generator. The goal is to make a project
structure and agent workflow where literature, claims, experiments, analyses,
and writing compound without drifting, duplicating, or carrying weak conclusions
forward.

## Planning Status

The pipeline is now covered conceptually from source ingestion to paper-specific
release. It is not yet implemented with equal operational depth in the current
scaffold.

Equal depth means each workflow layer has all of the following:

- generated directories and starter files;
- manifest or ledger schema;
- human-readable contract;
- project-local skill route;
- CLI workflow shortcut when useful;
- doctor validation;
- update/migration behavior;
- tests proving newly created projects contain the contract;
- stale-state and final-review gates.

The current repository already has strong support for sources, SOTA,
bibliography, MCP setup, experiments, artifact checklist, output zones,
project-quality docs, and lifecycle migration. The new survey, research
agenda, contribution package, paper framing, paper release, and compliance
profile layers still need to be added to the template, generator, skills, and
validation logic.

The contribution layer should expose analysis as an explicit subworkflow, not
only as a folder. The end-to-end path should therefore support:

```text
source ingestion -> SOTA -> survey -> research agenda -> contribution packages
  -> analysis / experiment / artifact subworkflows
  -> paper framing -> paper release + manuscript
  -> submission / review response / revision lifecycle
```

`create-academic-research` and `VincenzoImp/academic-research-skills` should be
treated as one integrated product split across two repositories. This scaffold
owns structure, lifecycle commands, validation, generated docs, MCP records,
and migration. The skills package owns the operational procedures agents follow
inside that structure. The split is for installation and release mechanics, not
because the skills are optional to the workflow design.

The academic research skills are required for the intended end-to-end agentic
research workflow. Project creation should attempt to install them
project-locally by default. A project may be scaffolded without installing them
for CI, offline setup, restricted networks, or manual inspection, but the
methodology is not operationally complete until
`VincenzoImp/academic-research-skills` is installed project-locally.

The only generally recommended external skill family should be Superpowers,
because it covers implementation planning, TDD, debugging, verification,
execution discipline, and subagent-driven development. Other skill packages
may remain installable, but they should be opt-in rather than presented as core
recommendations. The academic research skills are the required research
workflow core; Superpowers is the recommended engineering complement.

Doctor readiness should distinguish structural validity from operational
workflow readiness:

- structural doctor: validates generated files, schemas, managed-file drift,
  and machine-checkable references without requiring installed skills;
- operational doctor: validates the full agentic workflow substrate, including
  required academic research skills.

The final generated-project `npm run doctor` should use operational readiness.
Missing required academic research skills should be an error for normal
workflow use. CI, offline scaffolds, and explicit `--no-install-skills` cases
should use a separate structural mode such as `npm run doctor:structural` or
`academic-research doctor --structural`.

Skill readiness must be checked against real project-local skill files, not
only against the capability lock. `docs/agent/capability-lock.json` can record
the expected source, preset, action, agent, and skill IDs, but doctor must also
confirm that every required academic skill has an installed `SKILL.md` in a
project-local skill root.

## Source Prompt Ledger

The user wants the repository to support:

- a stronger SOTA workflow, potentially using Zotero more effectively;
- a systematic workflow from SOTA to survey;
- a systematic workflow from survey to research agenda;
- analysis and experiment bundles that include data, methodology, figures,
  tables, strengths, weaknesses, results, limitations, and provenance;
- reports that import or reference produced data, tables, and figures instead
  of rewriting them by hand;
- a decision on Markdown versus LaTeX for detailed analysis reports;
- repeated adversarial review and self-improvement loops for SOTA synthesis,
  survey, research agenda, analyses, and paper framing;
- piece-by-piece production of large text artifacts rather than one-shot
  drafting;
- clean final artifacts with no visible residue from iteration history;
- no technical debt, stale outputs, legacy clutter, or contradictory final
  state;
- an intermediate paper-framing stage that can derive multiple possible paper
  narratives from the same research body;
- a paper-specific release workflow so each paper frame can produce its own
  manuscript, artifact package, supplementary package, dataset/model package,
  and badge evidence without publishing the whole internal project repository;
- a paper-specific submission and review lifecycle so cover letters,
  submission checklists, submitted snapshots, decision letters, reviewer
  comments, rebuttal or response letters, revision plans, and camera-ready
  communications are organized per paper frame;
- a strict rule that reviewer-requested new scientific work goes through
  `contributions/` and analysis bundles, while rebuttal and response folders
  only manage communication, concern maps, revision plans, and links to the
  new evidence;
- a contribution layer between research agenda and paper framing that can
  handle analyses, experiments, artifacts, pipelines, datasets, software,
  benchmarks, systems, evaluations, protocols, and other contribution forms;
- explicit badge and compliance profiles so artifact, open-science,
  reproducibility, survey-reporting, dataset, model-release, and
  venue-specific obligations are not left to an agent's memory;
- one central `.bib` source of truth;
- re-ingestion of newly discovered sources into the SOTA rather than isolated
  late citations.

## Non-Negotiable Quality Rules

### Iteration Is A Loop, Not A Single Pass

Every substantial workflow must repeat:

```text
contract -> outline -> partial draft or analysis slice -> adversarial review -> fix -> re-review
```

The loop stops only when the current artifact has no unresolved blocking,
substantive, or meaningful cleanup issues. Cosmetic issues should be fixed
unless they are irrelevant to the artifact's purpose.

This applies to every produced artifact, not only long-form writing. A SOTA
synthesis, survey section, agenda direction, analysis report, table bundle,
paper frame, or manuscript section must all go through:

```text
reread -> review -> fix -> reread -> review
```

The artifact can move forward only when the latest review finds no remaining
issue that would materially improve correctness, clarity, provenance,
structure, or final cleanliness.

### Final Artifacts Must Be Clean

Working drafts may be messy. Final artifacts must not be.

The final version should read as a coherent first-class artifact, not as a
stack of patches. It must not contain stale alternatives, unresolved review
notes, obsolete tables, abandoned framings, contradictory claims, or visible
iteration scaffolding.

Review history belongs in a review ledger or archive, not inside the final
artifact.

The final review must explicitly evaluate this cleanliness rule. It is not
enough for the evidence and argument to be valid; the reviewer must also check
that the artifact no longer exposes iteration residue, stale branches of
reasoning, old table references, obsolete figures, contradictory wording,
temporary placeholders, or unresolved fix notes.

### No Silent Debt

Any abandoned draft, superseded analysis, stale figure, old table, duplicate
citation, or weakened claim must be handled deliberately:

- promote to canonical final state;
- move to archive with supersession metadata;
- keep in working area with explicit status;
- or delete if it has no durable value.

Nothing should remain ambiguous.

### Evidence Before Wording

Survey prose, research-agenda directions, analysis conclusions, and paper
claims must be supported by named evidence:

- source IDs;
- paper syntheses;
- reading logs;
- citation audit state;
- experiment records;
- analysis manifests;
- generated tables and figures;
- claim audit entries.

Unsupported claims stay as hypotheses or research questions. They do not become
paper-facing conclusions.

### Structured Freedom

Every workflow should have a stable shape so agents can navigate the repository
predictably. The structure should be strict about required metadata,
provenance, review state, badge obligations, and finalization gates, while
remaining flexible about domain-specific content.

Use this pattern:

- required frontmatter or manifest fields for identity, status, evidence,
  dependencies, outputs, and review state;
- required sections for purpose, method, outputs, limitations, badge impact,
  and next decision;
- optional extension sections for contribution-specific material;
- stable index or ledger rows so later agents can find canonical artifacts
  without guessing.

This avoids both failure modes:

- too loose: every agent invents a new shape and future agents cannot find the
  evidence;
- too rigid: unusual contributions such as datasets, software systems,
  protocols, benchmarks, or pipelines are forced into an analysis-only template.

### Badge And Compliance Profiles

The repository should distinguish badges from compliance profiles.

A badge is a visible external label that a venue, publisher, journal, or
registry may award. A compliance profile is the local evidence contract that
lets the project decide whether a badge, checklist, policy, or reporting
standard is satisfied.

The initial profile registry should include:

- `acm-artifact-review`: ACM Artifact Review and Badging v1.1, including
  `artifacts_available`, `artifacts_evaluated_functional`,
  `artifacts_evaluated_reusable`, `results_reproduced`, and
  `results_replicated`.
- `usenix-artifact-evaluation`: USENIX-style artifact evaluation profiles for
  availability, functionality, and results reproduced. Treat this as a
  venue-specific variant because individual USENIX venues can differ by year
  and track.
- `sigplan-acm-artifact-evaluation`: SIGPLAN/ACM artifact evaluation profile,
  using ACM badge names plus SIGPLAN packaging expectations such as immutable
  archival snapshots, strong documentation, and reuse-oriented packaging.
- `cos-open-science-badges`: classic COS open-science badges for open data,
  open materials, and preregistration when a target journal supports them.
- `osf-open-practice-resource-badges`: OSF resource badges for data, analytic
  code, materials, papers, and supplements linked to a registration by DOI.
- `top-transparency`: TOP 2025 transparency profile covering study
  registration, study protocol, analysis plan, materials transparency,
  analysis code transparency, data transparency, reporting transparency,
  results transparency, computational reproducibility, and verification study
  types.
- `venue-reproducibility-checklist`: venue-year checklist profile for venues
  such as NeurIPS, AAAI, ICML, ICLR, CVPR, ACL, or other target outlets. These
  are not necessarily badges, but they are submission-facing obligations.
- `method-reporting-standards`: field-specific method and evaluation standards
  such as ML reproducibility checklists, SIGPLAN empirical evaluation guidance,
  SIGSOFT empirical standards, benchmark-reporting norms, statistical
  reporting expectations, and threat-to-validity expectations.
- `survey-reporting`: PRISMA 2020 and PRISMA-ScR style reporting profiles
  when the survey is systematic, scoping, or meta-analytic rather than a
  narrative survey.
- `dataset-metadata`: FAIR and DataCite-style dataset metadata profile, with
  optional Croissant metadata when the contribution releases ML-ready datasets.
- `ai-model-release`: optional AI-model openness profile for projects that
  release models, weights, checkpoints, inference code, training code, or
  data provenance information.

Every selected profile should have a local evidence file rather than relying
on prose scattered through reports:

```text
compliance/
  profiles.yaml
  acm-artifact-review.md
  open-practice-badges.md
  top-transparency.md
  venue-checklist.md
  method-reporting.md
  survey-reporting.md
  dataset-metadata.md
  ai-model-release.md
```

`profiles.yaml` should name the active profiles, target venue/year when known,
badge targets, evidence paths, blocking gaps, and final review status. The
Markdown files should explain the human reasoning and reviewer sign-off.

Badge readiness should be evidence-driven:

- artifact availability requires a durable public archive, DOI or stable
  identifier, versioned release, license, and release metadata;
- artifact functionality requires documentation, consistency with paper
  claims, completeness, exercisable scripts or procedures, and verification
  evidence;
- reusability requires functionality plus packaging, documentation, standards,
  licensing, and interfaces that support extension or repurposing;
- reproduced results require an independent evaluator to obtain the main
  results using author-supplied artifacts;
- replicated results require an independent evaluator to obtain the main
  results without author-supplied artifacts;
- open data, code, materials, papers, and supplements require public
  repository records, DOI or stable identifier, license, and enough context for
  another researcher to understand the resource;
- preregistration requires a timestamped, read-only study plan created before
  data collection or analysis, with deviations tracked later;
- venue checklists require exact paper or appendix pointers for every
  yes/no/not-applicable answer;
- method-reporting standards require the project to declare the evaluation
  method, threats to validity, benchmark choices, statistical treatment,
  baseline selection, ablation logic, negative results, and resource
  accounting expected by the target research community;
- survey reporting requires completed search, screening, inclusion/exclusion,
  extraction, synthesis, and reporting checklists when a systematic or scoping
  review profile is selected.

No paper frame should claim badge readiness just because a directory exists.
The frame can claim readiness only when the selected compliance profile has
current evidence and a final review has found no blocking gap.

## Proposed Architecture

### 1. Source And Bibliography Layer

Keep `sources/bib/references.bib` as the central bibliography source of truth.
Every cited item should have:

- a stable citation key;
- a source ledger row;
- normalized metadata;
- a citation audit status;
- a SOTA linkage when it contributes to the literature view.

Zotero should be treated as an optional external source-of-truth interface, not
as a hidden replacement for repository ledgers. The repository should still
record what was imported, when, why, and how it supports claims.

Potential future workflow:

```text
Zotero collection / DOI / arXiv / OpenAlex / Semantic Scholar
  -> source ledger
  -> references.bib normalization
  -> full text or derived markdown
  -> paper synthesis
  -> SOTA matrix and claim audit
```

New late-stage citations should be routed back through this path. A paper
should not be cited only because it was discovered during manuscript writing.

### 2. SOTA Layer

The existing `sota/` structure is a good base. It should become the canonical
literature evidence layer:

- `search-strategy.md` records the review contract and stopping rules.
- `literature-matrix.csv` records paper roles, methods, datasets, gaps, and
  reading status.
- `paper-syntheses/` stores structured full-text syntheses.
- `reading-log.csv` records linear reading progress.
- `citation-chasing-log.csv` records graph expansion.
- `gaps.md` records candidate gaps with evidence.
- `synthesis.md` records the current state of the art.

The missing piece is a stronger promotion contract:

```text
source -> paper synthesis -> SOTA claim -> survey claim -> agenda item -> paper claim
```

Each promotion should preserve allowed wording, forbidden stronger wording,
evidence strength, and unresolved risks.

### 3. Survey Layer

Add a first-class survey workflow derived from SOTA, not from raw memory.

Recommended directory:

```text
survey/
  survey-contract.md
  outline.md
  section-plans/
  drafts/
  final/
  compliance/
  reviews/
  survey-claim-ledger.csv
```

The survey should explain:

- research threads and subfields;
- methodological families;
- datasets and evaluation regimes;
- experimental practices;
- empirical findings;
- contradictions and open disputes;
- known gaps;
- implications for the current project.

Survey creation should be section-by-section:

```text
survey contract
  -> candidate outline
  -> outline adversarial review
  -> section plan
  -> section draft
  -> section review
  -> section rewrite
  -> cross-section coherence pass
  -> final clean survey
```

The final survey should not include review residue. Reviews stay in
`survey/reviews/`.

The survey contract should declare the survey mode:

- narrative survey;
- systematic literature review;
- scoping review;
- meta-analysis;
- mixed review.

When the mode is systematic, scoping, or meta-analytic, `survey/compliance/`
should hold the reporting profile, completed checklist, search and screening
evidence, extraction fields, exclusion reasons, and PRISMA-style flow counts.
The final review must verify that the survey does not present itself as
systematic unless the selected reporting profile is satisfied.

### 4. Research Agenda Layer

Add a first-class agenda workflow derived from the survey and SOTA gaps.

Recommended directory:

```text
research_agenda/
  agenda-contract.md
  opportunity-ledger.csv
  directions/
  final/
  reviews/
```

Agenda items should not be vague ideas. Each should record:

- the research opportunity;
- supporting SOTA evidence;
- nearest prior work;
- why the gap matters;
- possible method or experiment;
- feasibility;
- expected contribution;
- failure conditions;
- evaluation requirements;
- risk and cost;
- priority;
- decision: pursue, defer, reject, or monitor.

The agenda should be adversarially reviewed for novelty, feasibility, evidence,
and publishability before it is treated as a research plan.

### 5. Contribution Package Layer

Add a general contribution layer between the agenda and paper framing.
Analyses and experiments are important contribution types, but they are not the
only possible outputs of a research agenda.

Recommended directory:

```text
contributions/
  contribution-ledger.csv
  <contribution_id>/
    contribution.yaml
    README.md
    claim-map.md
    badge-plan.md
    compliance/
    components/
    inputs/
    outputs/
      data/
      tables/
      figures/
      models/
      software/
      artifacts/
    report.md
    paper-export/
    reviews/
    archive/
```

A contribution package may represent:

- a statistical analysis;
- an experiment or experiment family;
- a reproducible artifact;
- a software tool or library;
- a benchmark or dataset;
- a pipeline;
- a system implementation;
- a methodology or protocol;
- a negative result that changes the research direction;
- a replication or reproduction attempt;
- a combined work package with several linked sub-analyses.

Each package should record:

- which agenda item it addresses;
- what contribution claim it may support;
- what evidence it produced;
- which source, dataset, code, or environment it depends on;
- what is reusable by a paper frame;
- which badge or artifact-readiness obligations it creates;
- whether it is ready, blocked, superseded, or rejected.

Each contribution package should use a predictable template. The template
should have a stable core plus explicit extension slots:

- `contribution.yaml`: contribution ID, type, status, linked agenda item,
  linked sources, linked analyses, output paths, badge targets, compliance
  profiles, review state, and supersession state.
- `README.md`: clean human summary, contribution claim, package contents,
  reproduction entrypoint, canonical outputs, limitations, and next decision.
- `claim-map.md`: candidate claims, supporting evidence, allowed wording,
  forbidden stronger wording, and paper-frame readiness.
- `badge-plan.md`: badge target, required evidence, current evidence paths,
  missing evidence, validation commands, release or packaging requirements, and
  final reviewer sign-off.
- `compliance/`: profile-specific evidence files for artifact review,
  open-practice badges, TOP transparency, venue checklists, survey reporting,
  dataset metadata, or AI-model release expectations.
- `components/`: optional contribution-specific modules such as pipeline
  stages, benchmark tasks, dataset schemas, software modules, or protocol
  steps.

The contribution layer should align with artifact badge discipline. A package
that produces code, data, models, pipelines, benchmarks, figures, or
reproduction evidence should update or reference:

- `artifacts/artifact-checklist.md`;
- `artifacts/badge-evidence-ledger.csv`;
- the contribution's own `badge-plan.md`;
- the contribution's own `compliance/profiles.yaml`;
- any generated reproducibility or release evidence.

Badge compliance should not be left to an agent's memory. The template should
ask for it explicitly, and the final review should verify that the contribution
either satisfies the relevant badge evidence requirements or explains why the
badge is not applicable.

Compliance profile selection should be conservative. A contribution should not
activate every possible profile by default. It should activate the profiles
that match its actual contribution type and target venue:

- artifact, software, pipeline, benchmark, or reproduction package:
  `acm-artifact-review` plus venue-specific artifact profile when known;
- open data, code, materials, paper, or supplement release:
  `cos-open-science-badges`, `osf-open-practice-resource-badges`, or both when
  relevant to the target journal or registry;
- survey or review contribution:
  `survey-reporting` when the work is systematic, scoping, or meta-analytic;
- empirical evaluation, benchmark, or method contribution:
  `method-reporting-standards` for the selected community, plus artifact
  profiles when executable evidence is submitted;
- dataset contribution:
  `dataset-metadata` plus artifact profile if the dataset is evaluated;
- model contribution:
  `ai-model-release` plus artifact profile if model files or checkpoints are
  submitted as artifacts;
- any submitted paper:
  `venue-reproducibility-checklist` for the selected venue and year.

The paper framing stage should consume contribution packages, not loose files.
This keeps the paper's claimed contributions traceable to reviewed packages.

### 6. Analysis Bundle Layer

Every substantial analysis or experiment should have a self-contained bundle.

Recommended directory:

```text
contributions/<contribution_id>/analyses/
  <analysis_id>/
    analysis.yaml
    README.md
    inputs/
    data/
    scripts/
    tables/
    figures/
    report.md
    paper-export/
    reviews/
    archive/
```

The bundle contract:

- `analysis.yaml` is the machine-readable manifest.
- `README.md` is the human entry point.
- `inputs/` records immutable or referenced inputs.
- `data/` contains derived analysis data.
- `tables/` contains generated tables in source formats such as CSV, TSV,
  Markdown, and LaTeX fragments.
- `figures/` contains generated figures in paper-appropriate formats.
- `report.md` is the detailed research report.
- `paper-export/` contains mechanically generated LaTeX fragments, table
  inputs, figure inclusion snippets, and paper-facing summaries.
- `reviews/` contains adversarial reviews and fix ledgers.
- `archive/` contains superseded attempts when they have durable value.

The report must not manually rewrite tables, figure values, or key numeric
results. It should link to or include generated outputs. For paper writing,
LaTeX should consume generated table fragments and figure files directly.

Recommended format policy:

- Markdown for detailed human-readable analysis reports and review loops.
- Generated CSV/TSV/JSON for numeric truth.
- Generated LaTeX fragments for paper-facing tables and snippets.
- PDF/SVG/PNG figures generated from scripts.
- LaTeX manuscript files should `\input{...}` generated table fragments where
  practical.

This gives Markdown for iterative clarity and LaTeX for final manuscript reuse
without copying numbers by hand.

Review is not the only safeguard against numeric drift. The analysis manifest
should name the canonical table, figure, and data files used by the report.
The final review must compare report references against those files, but the
workflow should also prefer mechanical inclusion or generated snippets whenever
the output is paper-facing.

For contribution-level reports, use the same default:

- `report.md` is the clean internal report and review surface;
- `paper-export/` contains LaTeX fragments for paper-facing reuse;
- a full `report.tex` is optional and should be created only when the report
  itself is intended to become a formal appendix, technical report, or paper
  section.

### 7. Paper Framing Layer

Before writing a manuscript, add an intermediate paper-framing workflow.

Recommended directory:

```text
paper_frames/
  frame-ledger.csv
  <frame_id>/
    frame-contract.md
    selected-contributions.yaml
    argument-map.md
    evidence-map.md
    badge-fit.md
    compliance-fit.md
    venue-fit.md
    release-plan.yaml
    outline.md
    reviews/
    decision.md
```

A frame should define:

- target venue, track, and audience;
- target venue year and submission mode, including double-blind, artifact
  evaluation, post-acceptance public release, dataset track, journal
  supplement, or software/artifact companion;
- central claim;
- contribution type;
- evidence package;
- which contribution packages are used;
- which analyses, experiments, artifacts, pipelines, datasets, or systems are
  used;
- what SOTA claims are needed;
- novelty positioning;
- paper outline;
- risks and likely reviewer objections;
- badge and artifact-readiness implications;
- venue-year compliance checklist implications;
- release and supplementary-material implications;
- decision: draft, revise, reject, or hold.

The frame should include a badge-aware checklist, preferably in `badge-fit.md`:

- which contribution packages are badge-relevant;
- which badge targets are plausible for the target venue;
- what evidence already exists;
- what evidence is missing before submission;
- what paper claims depend on artifact availability, functionality,
  reusability, reproduction, or replication;
- whether the paper can honestly claim badge readiness now, later, or not at
  all.

This gives the paper frame a standard way to respect badge constraints without
forcing every paper to target every badge.

The frame should also include `compliance-fit.md` for non-badge obligations:

- exact target venue, track, and year;
- active compliance profiles for the frame;
- checklist answers with paper or appendix locations;
- selected open-science, artifact, dataset, survey, or AI-model profiles;
- selected method-reporting standard when the frame depends on experiments,
  benchmarks, user studies, statistical analysis, or empirical claims;
- profile gaps that must be resolved before submission;
- claims that must be weakened if a profile cannot be satisfied;
- final reviewer sign-off that badge and compliance claims are honest.

The same research project may produce multiple possible frames. Not every frame
should become a paper.

### 8. Paper Release Layer

The internal project repository should remain the complete multi-paper research
workspace. It should not be published wholesale by default. A paper should
publish a paper-specific release derived from the frame and selected
contribution packages.

The release workflow should be manifest-driven and snapshot-based:

```text
paper frame
  -> selected contributions
  -> release plan
  -> generated staging release
  -> clean-room reproduction smoke test
  -> badge and compliance review
  -> final release package
  -> archive or public repository deposit
```

The release should be regenerated from source each time rather than manually
edited or incrementally synchronized. This avoids stale files, hidden edits,
and accidental divergence between the paper, contribution packages, and public
artifact.

Recommended directory:

```text
paper_releases/
  release-ledger.csv
  <paper_id>/
    release.yaml
    source-map.csv
    release-plan.lock
    checksums.txt
    artifact/
    manuscript/
    supplement/
    data/
    models/
    metadata/
    reviews/
    archive/
```

`paper_frames/<frame_id>/release-plan.yaml` is the source of truth for what
enters the release. It should declare:

- source contribution packages;
- included files, directories, and generated outputs;
- excluded paths such as reviews, archives, prompts, private data, drafts, and
  exploratory logs;
- active badge and compliance profiles;
- anonymization mode for double-blind submission;
- public-release mode for accepted papers;
- required metadata files;
- smoke-test commands;
- expected outputs;
- final package destination such as artifact-evaluation zip, OSF, Zenodo,
  GitHub release, journal supplement, dataset repository, or model registry.

`paper_releases/<paper_id>/source-map.csv` should map every released file back
to its canonical internal source path, contribution package, analysis bundle,
generated output, or manuscript source. A released file without provenance is a
blocking issue.

`release-plan.lock` should record the exact source commit, selected
contribution IDs, selected analysis IDs, active compliance profile versions,
generated output checksums, and release build timestamp. The final release
should be reproducible from this lock file and the canonical source tree.

Manual edits inside generated release staging directories should be forbidden.
If a released file is wrong, the source contribution package, analysis bundle,
paper frame, or manuscript source must be fixed and the release regenerated.

The paper release must include human and machine entry points when relevant:

- `README.md` for artifact reviewers and readers;
- `REPRODUCE.md` with exact commands, seeds, expected runtime, and expected
  outputs;
- `LICENSE` and third-party license notes;
- `CITATION.cff` or equivalent citation metadata;
- archive metadata for DOI assignment;
- dataset metadata when data is released;
- model metadata when models or checkpoints are released;
- badge evidence files and profile-specific checklists;
- generated tables and figures used by the manuscript.

Release validation must run against the materialized release package, not only
against the internal repository:

- no selected paper claim lacks released or cited evidence;
- no badge or compliance claim lacks released evidence;
- no private, stale, draft, review, prompt, or archive file is accidentally
  released;
- every released table and figure comes from a canonical generated output;
- clean-room smoke reproduction succeeds or records a justified blocker;
- checksums match the release manifest;
- double-blind releases do not leak identity-sensitive paths or metadata when
  anonymity is required;
- final reviewer confirms the release is a clean publishable snapshot, not a
  mirror of the whole work repository.

Symlinks may be useful for local inspection views, but they should not be the
final badge or DOI artifact. Public releases should be materialized snapshots
with checksums, provenance, metadata, and review sign-off.

### 9. Manuscript Layer

The manuscript workflow should consume accepted paper frames and canonical
artifacts:

- central `.bib`;
- accepted SOTA and survey claims;
- accepted contribution packages;
- accepted analysis and experiment bundles;
- generated figures;
- generated table fragments;
- claim audit ledger;
- paper-specific release plan and release evidence;
- venue-specific writing plan.

The manuscript should not introduce unsupported citations or claims outside the
source pipeline. If a new source is needed, it returns to the source/SOTA flow.

The manuscript and paper release should be built in parallel from the same
frame. The manuscript explains the contribution; the release proves that the
published artifact, supplement, data, model, or reproducibility package
supports the claims and badge targets.

### 10. Paper Submission And Review Lifecycle

Each paper frame that becomes a real submission needs a private, paper-specific
communication and review record. This is separate from the public release
package because cover letters, decision letters, reviewer comments, rebuttals,
submission receipts, and editorial correspondence are often private or
venue-system-specific.

Recommended directory:

```text
paper_submissions/
  submission-ledger.csv
  <paper_id>/
    submission.yaml
    cover-letter.md
    submission-checklist.md
    submitted-version.lock
    venue-system-notes.md
    correspondence/
    decisions/
    review-rounds/
      r1/
        decision-letter.md
        reviewer-comments.md
        concern-map.csv
        response-strategy.md
        revision-plan.md
        linked-work.csv
        manuscript-change-map.csv
        response-letter.md
        rebuttal.md
        reviews/
      r2/
        ...
    camera-ready/
    archive/
```

`submission.yaml` should link:

- frame ID;
- manuscript contract;
- release plan;
- venue, track, year, and submission system;
- anonymity mode;
- submitted file set or submitted snapshot lock;
- cover letter status;
- review round status;
- current decision state;
- linked contributions, analyses, artifacts, release packages, and manuscript
  revisions.

The cover letter, sometimes called a submission letter, is a communication
artifact. It should be linked to the frame and venue fit, but it should not
introduce new unsupported claims. If the cover letter needs a claim, that claim
must already exist in the frame, manuscript claim map, contribution package, or
release evidence.

Reviewer response and rebuttal artifacts should manage communication only:

- preserve every editor and reviewer comment faithfully;
- split comments into atomic concerns;
- classify severity and response action;
- map each response to manuscript location, claim ID, contribution package,
  analysis bundle, artifact evidence, citation, or `unresolved`;
- record whether the response concedes, clarifies, adds evidence, reframes,
  defends, or defers;
- keep a manuscript change map so every promised change can be verified.

New scientific work requested during review does not belong inside the rebuttal
folder. It belongs in the normal contribution layer:

```text
reviewer concern
  -> revision-plan.md
  -> contribution package or analysis bundle
  -> updated claim map / figure-table map / release evidence
  -> response-letter.md references the completed evidence
```

The rebuttal or response letter may cite the new work, but the work itself must
remain in `contributions/`, `experiments/`, `analysis_outputs/` as appropriate,
or the selected paper release/manuscript areas. This prevents post-submission
work from becoming hidden, stale, or unreviewed.

Submission lifecycle validation should check:

- submitted snapshot lock matches the manuscript and release state at
  submission time;
- cover letter claims are supported by the frame or manuscript claim map;
- every reviewer concern has a response status;
- every promised manuscript change has a location and verification status;
- every new result, figure, table, dataset, code change, or artifact update
  links to a contribution package or analysis bundle;
- response letters and rebuttals do not claim work that has not been completed
  or linked;
- double-blind constraints are respected in submitted files and cover material;
- final review confirms the response package is clean and has no stale promises.

### 11. Post-Acceptance Extension

Claude Scholar includes a post-acceptance workflow for slides, posters, and
public communication. Camera-ready communication state belongs in the
paper-specific submission lifecycle because it is part of the venue/editorial
record. Public post-acceptance material is useful, but it should not block the
core scaffold transformation.

Treat public post-acceptance as a later extension once paper framing, release,
manuscript assembly, and submission lifecycle are stable. A future workflow may
add:

```text
post_acceptance/
  slides/
  poster/
  public-summary/
  reviews/
```

It should consume the accepted manuscript, accepted paper release, final
figures/tables, central bibliography, and public artifact metadata. It should
not become a new source of claims or figures.

## Universal Review Loop

Each major workflow should share the same review state machine:

```text
planned
  -> outlined
  -> drafted_slice
  -> reviewed
  -> needs_revision
  -> revised
  -> re_reviewed
  -> clean_final
```

Exit criteria for `clean_final`:

- no unsupported core claim;
- no stale table or figure reference;
- no duplicate or unverified citation;
- no contradiction with source ledgers or analysis manifests;
- no badge-readiness or compliance claim without current profile evidence;
- no unresolved blocking or substantive review issue;
- no visible draft residue;
- final artifact rebuilt or cleaned into a coherent version;
- final reviewer explicitly confirms that no meaningful improvement remains;
- final reviewer explicitly confirms that the artifact reads as a clean final
  version, not as an accumulated iteration history;
- review history stored outside the final artifact.

Review severity:

- `blocker`: invalid evidence, false claim, broken provenance, wrong method,
  stale output, duplicate citation, or contradiction.
- `major`: weak framing, incomplete analysis, missing limitation, unclear
  section logic, or unconvincing agenda direction.
- `minor`: local clarity, wording, formatting, or non-blocking detail.
- `cosmetic`: polish only.

The loop continues while any `blocker` or `major` item remains. Minor and
cosmetic items should usually be fixed before finalization.

## Stale Artifact Control

Every workflow should include a final stale-state pass:

- compare final report references against actual files;
- compare cited keys against `sources/bib/references.bib`;
- compare survey claims against `survey-claim-ledger.csv`;
- compare agenda items against SOTA gaps and survey claims;
- compare analysis report tables and figures against the manifest;
- compare badge and compliance claims against active profiles;
- compare paper release files against `source-map.csv`, release checksums, and
  the frame's selected contribution packages;
- mark superseded outputs clearly or archive them;
- keep final directories free of obsolete alternatives.

This is the safeguard against iteration artifacts becoming project debt.

## Claude Scholar Audit Decisions

Claude Scholar is useful as a reference implementation of disciplined research
agent workflows, but it should not be copied wholesale.

Adopt these patterns:

- Evidence Records and Claim Promotion Gates. Every reusable claim should carry
  source type, evidence strength, allowed wording, forbidden stronger wording,
  support span, limitation, and downstream promotion state.
- Zotero as a source-ingestion accelerator. Zotero collections, attachments,
  annotations, and deduplication can improve literature intake, but repository
  ledgers and `sources/bib/references.bib` remain canonical.
- Strict split between analysis and report. A strict analysis bundle must lock
  question, unit of analysis, metric direction, raw provenance, sample/seed/run
  counts, statistics, figures, figure catalog, and claim candidates before any
  decision-oriented results report is written.
- Blocker-first analysis mode. If the primary question, unit of analysis,
  provenance, or comparison family is missing, the workflow should produce a
  blocker summary or read-only audit, not polished figures or conclusions.
- Figure/table publication QA. Paper-facing figures and tables need their own
  evidence contract, generated source data, export plan, caption requirements,
  readability/accessibility checks, and stale-reference review.
- Repo-native knowledge lifecycle. Source notes, durable knowledge, promoted
  claims, writing artifacts, indexes, logs, archives, and lint should exist in
  the repository. Obsidian may be an optional view or sync target, not a
  required substrate.
- Prompt-level commands. Markdown workflow prompts should be treated as the
  portable agent command layer. Agent-specific slash-command wrappers may be
  generated from them.
- Reader testing for large written artifacts. Survey, agenda, paper frames,
  manuscript sections, and release documentation should be tested from a fresh
  reader perspective before finalization, so final artifacts do not depend on
  hidden chat context.

Do not adopt these patterns as core requirements:

- mandatory Obsidian vaults;
- global hidden writing memory outside the project;
- Claude-specific hooks as the default operational mechanism;
- broad engineering skills that duplicate Superpowers or this agent's coding
  discipline;
- one-shot full manuscript drafting when the user asked for piece-by-piece
  production and iterative review.

The main design correction is that the scaffold must make the evidence gate
and analysis/report split structural, not merely advisory.

## Generator, Skills, And MCP Impact Audit

The new pipeline requires a coordinated scaffold revision. It should not be
implemented only by adding folders to `template/`.

### Current Generator State

The current generator is centered on:

- `src/project.ts`: template copy, personalization, managed-file migration,
  `doctorProject`, CSV/TSV header validation, and generated lifecycle scripts.
- `src/stack.ts`: skill bundles, skill sources, capability presets, and MCP
  catalog.
- `src/capabilities.ts`: project-local capability state, generated MCP docs,
  MCP snippets, capability lock, skill install/update/remove state.
- `src/cli.ts`: lifecycle commands, skills commands, MCP commands, setup, and
  one scenario shortcut: `workflow literature`.
- `template/`: generated repository files.
- `tests/create.test.mjs` and related tests: structural expectations for newly
  created projects, migration, doctor, scripts, and capability behavior.

This model is sound, but it now needs one more concept: workflow profiles.
Capability presets answer "which skills and MCP servers are enabled." Workflow
profiles should answer "which research pipeline contracts and validation gates
exist in this project."

### Template Revisions Required

The template should add first-class generated contracts for:

- `survey/`;
- `research_agenda/`;
- `contributions/`;
- contribution-local analysis bundle and results-report contracts;
- `paper_frames/`;
- `paper_releases/`;
- `paper_submissions/`;
- project-level `compliance/`;
- updated `docs/agent/project-quality.md`;
- updated `docs/agent/output-contracts.md`;
- updated `AGENTS.md`;
- updated `docs/getting-started.md`;
- updated `README.md`;
- updated `configs/default.yaml` path registry.

The new files should be classified deliberately:

- stable contracts and schemas: `managed`;
- generated capability docs: `generated`;
- project-filled ledgers, reports, reviews, and plans: `user-owned`;
- chronological logs: `append-only`.

Do not mark high-value project content such as survey drafts, agenda
directions, contribution reports, paper frames, or paper releases as blindly
managed. The generator may create starter files, but later project content must
belong to the research project.

### Doctor And Validation Revisions Required

`doctorProject` should validate more than file existence. It should add schema
checks for:

- `survey/survey-claim-ledger.csv`;
- `research_agenda/opportunity-ledger.csv`;
- `contributions/contribution-ledger.csv`;
- contribution-level `contribution.yaml`;
- contribution-level `compliance/profiles.yaml`;
- analysis-level `analysis.yaml`;
- `paper_frames/frame-ledger.csv`;
- frame-level `selected-contributions.yaml`;
- frame-level `release-plan.yaml`;
- `paper_releases/release-ledger.csv`;
- release-level `release.yaml`;
- release-level `source-map.csv`;
- release-level `release-plan.lock`;
- release-level `checksums.txt`;
- `paper_submissions/submission-ledger.csv`;
- submission-level `submission.yaml`;
- review-round `concern-map.csv`;
- review-round `linked-work.csv`;
- review-round `manuscript-change-map.csv`;
- project-level `compliance/profiles.yaml`.

The doctor should also detect high-signal drift:

- a paper frame references a missing contribution package;
- a release source-map references missing internal files;
- a release contains files excluded by policy;
- a badge or compliance claim is present without an active profile;
- a manuscript or paper frame cites a missing generated table or figure;
- a new citation appears in a manuscript without a source-ledger and SOTA path.

Deep semantic judgment can remain in skills and review loops, but structural
and reference checks should be machine-enforced where practical.

Doctor should expose two readiness levels:

- operational readiness, used by generated `npm run doctor`, fails when
  required academic research skills are missing, removed, stale in the
  capability lock, or absent from project-local skill roots;
- structural readiness, used by CI/offline/no-install scaffolds, validates the
  repository shape without requiring skill installation.

Workflow commands should use the operational skill check. If a required skill
is missing, they should stop before research execution, print the exact
`npm run skills:install -- --preset <preset>` command, and still show the
canonical files and contracts the user or agent should inspect next.

### CLI Workflow Revisions Required

The CLI currently exposes only `workflow literature`. The new scaffold should
add workflow shortcuts that prepare the right contracts, skills, MCP records,
and next commands:

- `workflow literature`: source discovery, SOTA, citation graph, full-text
  reading, and bibliography hygiene.
- `workflow survey`: SOTA-derived survey contract, reporting mode, claim
  ledger, PRISMA profile when applicable, and section-by-section review.
- `workflow agenda`: survey-derived opportunity ledger and research direction
  review.
- `workflow contribution`: contribution package creation, claim map,
  compliance profile selection, analysis bundle setup, and report policy.
- `workflow analysis`: contribution-local strict analysis preflight,
  blocker-first evidence checks, results-report handoff, generated table/figure
  source policy, and publication asset QA.
- `workflow frame`: venue/track/year selection, selected contributions,
  badge-fit, compliance-fit, evidence map, and outline.
- `workflow release`: paper-specific release plan, source map, metadata,
  checksums, smoke test, double-blind safety, and artifact package validation.
- `workflow manuscript`: manuscript assembly from an accepted frame, canonical
  bibliography, generated tables/figures, and release evidence.
- `workflow submission`: cover letter, submission checklist, submitted snapshot
  lock, venue-system notes, and private submission lifecycle setup for one
  paper.
- `workflow response`: decision-letter and reviewer-comment intake, atomic
  concern mapping, rebuttal or response planning, linked-work routing, and
  revision package validation.

These commands should be setup guides and state initializers, not black-box
writers. They should print the next explicit commands and selected skill routes.

Workflow commands should answer: where is the project in the pipeline, which
contract applies, what evidence is missing, which files must be inspected, and
which skill should run next. They should not draft survey prose, decide the
agenda, choose final paper frames, package releases, or write manuscript
claims by themselves.

The skills should answer: how to perform the research step rigorously inside
the contract prepared by the scaffold. Every workflow command should therefore
name the stage-specific skill route, and every stage-specific skill should name
the workflow command and repository files it expects.

### Agent Workflow Prompt Commands Required

The scaffold should also generate prompt-level workflow commands for agents.
These are Markdown playbooks, not npm scripts. They are the commands a user can
give to an agent to start a stage with the right context, files, skills, and
review loop.

Recommended location:

```text
docs/agent/workflow-prompts/
  literature.md
  survey.md
  agenda.md
  contribution.md
  analysis.md
  frame.md
  release.md
  manuscript.md
  submission.md
  response.md
  full-research-loop.md
```

Each prompt command should:

- state the stage goal;
- tell the agent to run the matching `npm run workflow:<stage>` preflight;
- require reading the relevant contracts, ledgers, manifests, and review
  history;
- name the required academic research skills and the recommended Superpowers
  skills for implementation-heavy work;
- define the step-by-step workflow;
- define the iterative review, fix, re-review, and clean-final gate;
- define exactly which files may or must be updated;
- define what the agent must not do;
- define the handoff condition for the next stage.

The portable Markdown prompt should be the source of truth. Agent-specific slash
commands such as `/research-literature`, `/research-survey`,
`/research-agenda`, `/research-contribution`, `/research-analysis`,
`/research-frame`, `/research-release`, `/research-submission`, or
`/research-response` may wrap these files when an agent supports command files,
but they should not become divergent copies of the workflow instructions.

Example user invocation:

```text
Use docs/agent/workflow-prompts/literature.md and start the literature workflow
for this project. Follow the prompt exactly, use the required skills, update
the ledgers, and stop at the review gate if prerequisites are missing.
```

This keeps the responsibilities clear:

- npm workflow command: inspect state, run structural preflight, report missing
  prerequisites, verify required skill readiness, and point to canonical files
  and skills;
- prompt-level workflow command: tell the agent how to execute the stage;
- skill: provide reusable stage-specific academic method;
- doctor: validate structural consistency and machine-detectable drift.

### Skill Package Revisions Required

The companion `VincenzoImp/academic-research-skills` package is a strong base,
but its current boundaries reflect the older scaffold. It should be revised so
skills map to the pipeline instead of overloading SOTA and paper writing.

The companion skill repository must not wait until the end of the scaffold
implementation. Before this scaffold references a new skill ID in generated
docs, workflow prompts, CLI output, tests, or capability profiles, that skill
must exist in `academic-research-skills` with at least a `SKILL.md`, OpenAI
metadata, trigger-boundary examples, synced references, and validation tests.
Full skill depth can be implemented stage-by-stage, but nonexistent skill IDs
should never appear in generated project guidance.

Keep and update:

- `source-ingestion`;
- `document-conversion`;
- `citation-bibliography-tooling`;
- `citation-claim-audit`;
- `systematic-review-prisma`;
- `academic-mcp-tooling`;
- `cs-methodology-evaluation`;
- `experiment-logbook`;
- `research-data-analysis`;
- `artifact-open-science`;
- `paper-writing-review`;
- `adversarial-peer-review`;
- `rebuttal-revision-strategy`;
- `cs-venue-strategy`;
- `research-design-positioning`;
- `research-project-router`;
- `research-project-maintenance`;
- `research-repo-reproduction`;
- `research-ui-prototyping`;
- `ethics-data-governance`;
- `repo-migration`;
- `skill-evaluation`.

Add or split out:

- `survey-synthesis`: SOTA-derived survey contract, outline, section plans,
  survey claim ledger, iterative reviews, and final clean survey.
- `research-agenda`: gap-to-opportunity promotion, opportunity ledger,
  novelty/feasibility/publishability review, and direction decisions.
- `contribution-package`: contribution manifests, claim maps, component
  structure, analysis bundle creation, report policy, and compliance profile
  selection.
- `research-results-reporting`: decision-oriented results reports after a
  strict analysis bundle exists, with figure-by-figure interpretation, negative
  results, limitations, belief updates, next actions, and artifact index.
- `publication-figures-tables`: publication-facing figures and tables,
  generated source data, LaTeX fragments, caption requirements, export
  formats, accessibility/readability QA, and stale-reference review.
- `paper-framing`: venue-aware framing from contribution packages, selected
  contributions, argument map, evidence map, badge-fit, compliance-fit, and
  outline.
- `paper-release`: manifest-driven release packaging, source-map generation,
  checksums, metadata, smoke reproduction, double-blind safety, and public
  archive readiness.
- `paper-submission-lifecycle`: cover letters, submission checklists,
  submitted snapshot locks, venue-system notes, editorial correspondence,
  decision letters, review-round organization, and camera-ready communication
  state for one paper.
- `badge-compliance-profiles`: ACM, USENIX/SIGPLAN variants, COS/OSF, TOP,
  venue checklists, method-reporting standards, PRISMA, dataset metadata, and
  model-release profiles.

The `sota-literature-review` skill should stop presenting survey and research
agenda as its own final output. It should instead promote evidence into the
new survey and agenda workflows.

The `research-data-analysis` skill should become strict-analysis first. It
should not write final narrative conclusions until `research-results-reporting`
has consumed a complete analysis bundle. It should produce blocker summaries
when comparison units, provenance, metric direction, or seed/run/sample counts
are missing.

The `publication-figures-tables` skill should absorb the useful parts of
Claude Scholar's publication chart/table workflow, but it should not require a
specific external plotting library. It should define the contract for generated
data files, table fragments, figure exports, captions, and QA; the project may
use the best available plotting or table tool.

The `paper-writing-review` skill should consume an accepted paper frame and
release evidence before drafting durable manuscript prose.

The `paper-writing-review` skill should also support section-by-section
coauthoring and reader testing. Venue-specific writing-pattern notes should be
stored inside the paper frame or manuscript directory, not in hidden global
agent memory.

The `paper-submission-lifecycle` skill should manage cover letters, submitted
snapshots, submission checklists, correspondence, review rounds, and
camera-ready communications. It should never treat submission communication as
scientific evidence.

The `rebuttal-revision-strategy` skill should operate inside
`paper_submissions/<paper_id>/review-rounds/<round>/`, preserve every reviewer
concern, maintain `concern-map.csv`, `linked-work.csv`, and
`manuscript-change-map.csv`, enforce an evidence-anchor rule for every response,
and route new requested scientific work back into `contributions/` and analysis
bundles.

The `artifact-open-science` skill should become release-aware: artifact work
should happen inside contribution packages and paper releases, not only in a
global `artifacts/` folder.

The `research-project-maintenance` skill should absorb repo-native knowledge
lifecycle tasks inspired by Obsidian workflows: promote, archive, index, lint,
and link durable source, knowledge, writing, result, and release artifacts.

The router must be updated so multi-step research requests are ordered as:

```text
source -> SOTA -> survey -> agenda -> contribution -> analysis -> frame -> release + manuscript -> submission -> response/revision
```

### MCP Revisions Required

The MCP catalog should remain conservative. MCPs are access and tooling
infrastructure, not a substitute for workflow contracts.

Current coverage is useful for:

- arXiv search and paper reading;
- DBLP bibliography;
- Semantic Scholar citations and recommendations;
- OpenAlex graph search;
- PubMed for biomedical projects;
- Zotero local library and attachments;
- Overleaf project access;
- Crossref/manual DOI metadata;
- fallback paper search when source policy is reviewed.

The revision should improve three areas:

- Zotero should be a first-class optional source-ingestion and bibliography
  workflow, with explicit collection/import/export/reconciliation steps.
- Overleaf should be framed as manuscript synchronization only after an
  accepted frame exists; it should not become the canonical source of research
  evidence.
- Public release destinations such as OSF, Zenodo, GitHub Releases, journal
  supplements, dataset repositories, and model registries should be handled
  through release metadata and finite commands first. Add MCP integrations only
  when they are mature, safe, and clearly better than explicit CLI/API
  commands.

The default MCP preset should stay small. Workflow commands can recommend
additional MCPs, but credentialed and local-service integrations should remain
opt-in.

### Configuration Model Revisions Required

`configs/default.yaml` should grow from simple paths into a project workflow
registry:

```yaml
project:
  slug: academic-research-project
  title: Academic Research Project
  profile: academic-general
  package: project_package

workflow:
  active_stage: source-ingestion
  available_stages:
    - source-ingestion
    - sota
    - survey
    - research-agenda
    - contribution
    - analysis
    - paper-framing
    - paper-release
    - manuscript
    - submission
    - response

paths:
  sources: sources
  sota: sota
  survey: survey
  research_agenda: research_agenda
  contributions: contributions
  paper_frames: paper_frames
  paper_releases: paper_releases
  paper_submissions: paper_submissions
  reports: reports
  compliance: compliance
  wiki: wiki
```

`configs/capabilities.yaml` should remain about agent, skills, MCP servers, and
setup state. Do not mix workflow stage state into capability state.

### Implementation Consequence

The next implementation plan should not start by adding every directory at
once. It should start with an Epic 0 contract update that defines:

- workflow profile registry;
- new template ownership policies;
- required ledger schemas;
- structural and operational doctor validation strategy;
- required skill readiness strategy;
- skill-package migration contract;
- MCP catalog update contract;
- workflow command naming and behavior.

After that, each workflow layer should be implemented one epic at a time with
tests.

## Proposed Implementation Epics

### Epic 0: Master Workflow Contracts

Add repository-level docs that define the end-to-end research pipeline, quality
loop, artifact lifecycle, badge and compliance profile registry, and stale-state
policy.

### Epic 1: Bibliography And Zotero Integration Contract

Strengthen central `.bib`, source ledger, citation audit, and optional Zotero
import guidance.

### Epic 2: SOTA Promotion Contract

Extend SOTA files so they explicitly support downstream survey and agenda
generation.

### Epic 3: Survey Workflow

Add survey directory, templates, ledgers, review loop, reporting-mode contract,
PRISMA-style compliance support, and finalization policy.

### Epic 4: Research Agenda Workflow

Add agenda directory, opportunity ledger, direction templates, review loop, and
prioritization policy.

### Epic 5: Contribution Package Workflow

Add `contributions/` as the general bridge from research agenda items to paper
frames. Include contribution manifests, badge plans, compliance profile files,
claim maps, output subdirectories, report policy, review loop, stale-state
handling, and stable template sections with flexible contribution-specific
extensions.

### Epic 6: Strict Analysis, Results Report, And Publication Asset Workflow

Add analysis bundle structure inside contribution packages, including
manifest, blocker-first audit mode, strict statistics, results report template,
table/figure import policy, paper-export strategy, publication asset QA, and
validation checks.

### Epic 7: Badge And Compliance Profiles

Add badge and compliance profiles before framing so frames can select evidence
requirements deliberately rather than relying on agent memory.

### Epic 8: Paper Framing Workflow

Add `paper_frames/` as the bridge from all prior work to one or more possible
manuscripts. Include badge-aware and compliance-aware frame checks so venue,
artifact-readiness, open-science, method-reporting, survey-reporting, dataset,
model-release, and paper-release constraints are considered before manuscript
drafting.

### Epic 9: Paper Release Workflow

Add `paper_releases/` and release-plan support so every accepted paper frame
can produce a clean materialized artifact, supplement, dataset, model, or
reproducibility package. Include release manifests, source maps, checksums,
lock files, metadata files, clean-room smoke tests, double-blind safety checks,
badge/compliance validation, and final release review.

### Epic 10: Manuscript Assembly Contract

Update `reports/paper/` so manuscript writing consumes frames, generated
tables/figures, central bibliography, claim audit records, and paper-specific
release evidence.

### Epic 11: Paper Submission And Review Lifecycle

Add `paper_submissions/` so each paper has cover letter or submission letter
materials, submission checklists, submitted snapshot locks, venue-system notes,
decision letters, reviewer comments, concern maps, response letters, rebuttal
drafts, revision plans, linked-work maps, manuscript change maps,
camera-ready communication state, reviews, and archives.

New post-submission scientific work must route to contribution packages and
analysis bundles, then be linked from `linked-work.csv` and response letters.
Rebuttal folders manage communication and traceability only.

### Epic 12: Workflow Command And Prompt System

Extend `workflow literature` into a full stage router and generate
`docs/agent/workflow-prompts/` so users have LLM-facing commands for each
workflow stage. The CLI command prepares and diagnoses; the prompt command
starts the agentic workflow; the skill performs the method.

### Epic 13: Doctor And Validation Support

Extend `doctorProject`, tests, and validation scripts to detect missing
required workflow files, broken ledgers, duplicate citation keys, and stale
artifact, badge, compliance, paper-release, source-map, and checksum references
where feasible.

### Epic 14: Integrated Skill Package Transformation

Revise `VincenzoImp/academic-research-skills` so every workflow stage has a
matching operational skill with file paths, ledgers, gates, review loops, and
handoff conditions aligned to this scaffold.

### Epic 15: Skill Version And Scaffold Integration

Make generated projects treat the academic research skills as required for the
intended agentic workflow, Superpowers as the recommended engineering
complement, and all other skills as opt-in.

### Epic 16: Documentation, Examples, And Migration Guide

Update project docs, generated examples, and migration guidance so existing and
new projects can adopt the full workflow without stale legacy structure.

## Incremental Plan

Work should proceed in small approved steps:

1. Agree on this master design.
2. Write an implementation plan for Epic 0 only.
3. Implement Epic 0 with tests.
4. Review and adjust.
5. Move to Epic 1.
6. Continue one epic at a time.

No later epic should be implemented until the previous one has a clean final
state and the user agrees to continue.

## Open Design Decisions For Review

1. Whether to name the new survey directory `survey/` or keep it under
   `reports/survey/`.
2. Whether to name the agenda directory `research_agenda/`, `agenda/`, or
   `docs/research-agenda/`.
3. Whether contribution packages should live at top-level `contributions/` or
   under `experiments/` / `artifacts/`; the current recommendation is top-level
   `contributions/` because they can include more than experiments.
4. Whether analysis reports should always include both `report.md` and
   `paper-export/`, or only create paper-export files when the analysis is
   promoted toward a manuscript.
5. Whether contribution-level reports should remain Markdown-first with LaTeX
   export fragments, or whether some contribution types should require a full
   `report.tex`.
6. Which badge and compliance targets should be represented in the initial
   templates by default. The recommendation is to include ACM artifact review,
   USENIX/SIGPLAN artifact variants, COS/OSF open-practice badges, TOP
   transparency, venue-year checklist hooks, method-reporting standards,
   PRISMA-style survey reporting, dataset metadata, and optional AI-model
   release profiles, while leaving exact venue names and badge labels
   configurable in each frame.
7. Which public release destinations should get first-class metadata templates
   first. The recommendation is OSF, Zenodo, GitHub release, artifact
   evaluation zip, journal supplement, dataset repository, and model registry.
8. How deeply the generator should validate cross-file references versus
   leaving deeper semantic checks to skills.
