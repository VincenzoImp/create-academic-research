# Research Workflow Transformation Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `create-academic-research` into an end-to-end academic research scaffold where source ingestion, SOTA, survey, research agenda, contribution packages, analysis bundles, paper framing, paper releases, manuscripts, submission lifecycle, rebuttal/revision communication, badges, compliance, MCP tooling, and skills all have explicit contracts and validation gates.

**Architecture:** Keep this repository as the generator and project-lifecycle owner. Treat `VincenzoImp/academic-research-skills` as the integrated operational-skill half of the same product, revised in a separate worktree/repository pass only because skills are packaged and installed independently. Introduce workflow profiles as a separate concept from capability presets: workflow profiles define repository contracts and gates; capability presets select skills and MCP records.

**Tech Stack:** TypeScript ESM generator, Node test runner, YAML configuration, Markdown templates, CSV/TSV ledgers, project-local skills.sh installation, MCP catalog records, Python project template.

---

## Scope Rule

Do not implement this transformation as one large patch.

This master plan is the control document. Each epic below must get its own small implementation plan before code changes begin. A later epic starts only after the previous epic has passed tests, doctor checks, migration checks, documentation review, and stale-state review.

## Integrated Product Model

`create-academic-research` and `academic-research-skills` are two repositories
for one product:

- this repository owns the filesystem scaffold, lifecycle CLI, project
  configuration, managed-file migration, validation, MCP catalog, generated
  docs, and workflow entrypoints;
- `academic-research-skills` owns the operational procedures agents follow
  inside those filesystem contracts;
- the two repositories must be designed, tested, documented, and released as
  compatible halves.

The skills are not optional intellectual decoration. They are the operational
engine of the workflow. The scaffold gives agents a stable substrate; the
skills tell agents how to use it rigorously.

The package separation exists for practical reasons:

- users can install or update skills project-locally;
- skills can be reused in compatible external repositories;
- the generator can remain a small npm package without embedding every
  procedure as runtime code;
- skill changes can be reviewed and released with their own validation suite.

The separation must not create design drift. Any generated path, ledger,
manifest, workflow command, badge profile, or MCP recommendation in this repo
must be mirrored by matching skill instructions. Any skill instruction that
names a generated path must be backed by this scaffold or explicitly marked as
fallback behavior for non-`create-academic-research` projects.

## Skill Recommendation Policy

Generated projects should distinguish required workflow skills from optional
complementary skills:

- `VincenzoImp/academic-research-skills`: required for the intended
  end-to-end research workflow. The repo can be scaffolded without installing
  them for CI, offline setup, or manual inspection, but the methodological
  workflow is not considered operationally complete until these skills are
  installed project-locally.
- Superpowers: strongly recommended for implementation, planning, debugging,
  TDD, verification, execution plans, subagent-driven development, and general
  software-engineering rigor.

Other skills may be useful in specific situations, but they should not be
presented as generally recommended. Users may install them explicitly when a
project needs document formats, UI prototyping, specialized conversion tools,
or other capabilities. The scaffold should avoid implying that optional skill
collections are part of the core research workflow.

Capability presets and setup diagnostics should reflect this policy:

- `minimal`: academic research skills only, no MCP records.
- `default`: academic research skills plus the conservative default MCP record.
- `engineering`: academic research skills plus Superpowers.
- `literature`: academic research skills, Superpowers, and literature MCP
  readiness where appropriate.
- `full`: broad documented MCP catalog, but not automatic installation of
  unrelated optional skills.

Creation should attempt project-local installation of the academic research
skills by default. `--no-install-skills` remains available for CI, offline
scaffolding, and restricted environments, but it must leave the project in a
clearly incomplete operational state.

`doctor` should have explicit readiness modes:

- structural readiness: validates generated files, schemas, managed-file
  contracts, and machine-checkable references without requiring network access
  or installed skills;
- operational readiness: validates everything needed for the intended
  agentic workflow, including required academic research skills.

The default generated-project `npm run doctor` should use operational
readiness once this transformation is complete. Missing academic research
skills should therefore be an error for normal workflow use, not just a soft
warning. A separate structural command or flag should exist for CI/offline
cases, for example `npm run doctor:structural` or
`academic-research doctor --structural`.

Workflow commands should treat missing academic skills as a blocking
operational gap for agent-driven execution while still printing the stage
files, required skills, install command, and next commands.

Skill readiness must be validated against actual project-local files, not only
against `docs/agent/capability-lock.json`. The lock can record the last
install/update action, preset, agent, source, and expected skill IDs, but doctor
must also confirm that every required skill has an installed `SKILL.md` in a
project-local skill root.

Superpowers should be checked as recommended, not required. Missing
Superpowers should warn in engineering-heavy workflows and docs, but should not
block the academic research workflow unless a specific implementation task
explicitly requires those skills.

## Cross-Repository Ordering Correction

The companion skill repository cannot be treated as a final cleanup step only.
Before this scaffold references a new skill ID in generated docs, workflow
commands, prompt commands, capability profiles, or tests, that skill must exist
in `VincenzoImp/academic-research-skills` with at least:

- `SKILL.md`;
- OpenAI metadata;
- trigger-boundary examples;
- shared reference files copied or synced;
- validation tests;
- the same canonical paths and stage contracts that the scaffold generates.

Full skill refinement can continue stage-by-stage, but skill skeletons and
contracts must land early. Otherwise a generated project would point agents to
procedures that do not exist.

The practical implementation order should therefore be:

1. add scaffold-level master contracts;
2. add or update the skill repository's shared workflow contract and new skill
   skeletons;
3. implement each scaffold workflow layer together with its matching skill
   behavior;
4. run a final cross-repo consistency pass.

## Workflow Command Operating Model

Workflow commands are not writing agents and they are not replacements for
skills. They are stage-aware entrypoints that make the current project state
visible and prepare the next rigorous action.

Each command follows the same shape:

```text
npm run workflow:<stage>
  -> read configs/default.yaml and configs/capabilities.yaml
  -> run lightweight structural checks for the stage
  -> report required inputs and missing prerequisites
  -> report canonical files and ledgers for the stage
  -> verify required academic research skills for the stage
  -> report skills to invoke next
  -> report MCP readiness only when the stage needs source access or writing sync
  -> create or refresh only safe starter state when the epic explicitly allows it
  -> print exact next commands and blocking gaps
```

Workflow commands may create empty starter files or refresh generated guidance
only when those files are generator-owned or missing user-owned starters. They
must not draft survey prose, decide a research agenda, choose a final paper
frame, generate release artifacts, or edit manuscript claims. Those actions
belong to skills plus review loops.

The intended split is:

- CLI workflow command: "Where am I, what contract applies, what is missing,
  what skills/tools should run next?"
- skill: "How do I perform this research step rigorously inside that contract?"
- doctor: "Is the repository structurally valid and free of machine-detectable
  drift?"
- adversarial review skill: "Is the artifact scientifically, rhetorically, and
  methodologically strong enough to promote?"

Example for survey:

```text
npm run workflow:survey
  -> confirms SOTA claim ledger and source/bibliography state
  -> points to survey/survey-contract.md and survey/survey-claim-ledger.csv
  -> reports whether PRISMA-style compliance is active
  -> recommends survey-synthesis, systematic-review-prisma, citation-claim-audit,
     and adversarial-peer-review
  -> prints blocking gaps such as missing SOTA syntheses or incomplete reading
     status
```

Example for analysis:

```text
npm run workflow:analysis
  -> confirms a contribution package and analysis manifest exist
  -> checks primary question, unit of analysis, metric direction, raw provenance,
     sample/seed/run counts, and comparison family
  -> recommends research-data-analysis for the strict bundle,
     research-results-reporting for the decision report, publication-figures-tables
     for paper-facing assets, and citation-claim-audit for claim promotion
  -> prints blocker gaps instead of allowing polished conclusions from weak
     evidence
```

Example for release:

```text
npm run workflow:release
  -> confirms an accepted paper frame exists
  -> points to paper_frames/<frame_id>/release-plan.yaml
  -> checks release templates, source-map policy, checksums, and active profiles
  -> recommends paper-release, artifact-open-science, research-repo-reproduction,
     and badge-compliance-profiles
  -> does not package or publish anything by itself
```

Example for submission:

```text
npm run workflow:submission
  -> confirms an accepted paper frame, manuscript contract, and release plan
     exist
  -> points to paper_submissions/<paper_id>/submission.yaml,
     cover-letter.md, submission-checklist.md, and submitted-version.lock
  -> recommends paper-submission-lifecycle, paper-writing-review,
     citation-claim-audit, and cs-venue-strategy
  -> blocks cover-letter claims that are not already supported by the frame,
     manuscript claim map, or release evidence
```

Example for response:

```text
npm run workflow:response
  -> confirms a submission package and review-round folder exist
  -> points to decision-letter.md, reviewer-comments.md, concern-map.csv,
     linked-work.csv, manuscript-change-map.csv, response-letter.md, and
     rebuttal.md
  -> recommends rebuttal-revision-strategy, citation-claim-audit,
     paper-writing-review, contribution-package, and research-data-analysis
  -> routes new reviewer-requested scientific work to contributions and
     analyses instead of hiding it inside the rebuttal folder
```

## Agent Workflow Prompt Commands

The scaffold should also provide prompt-level workflow commands for agents.
These are not npm commands. They are versioned Markdown playbooks that the user
can paste, reference, or expose as slash commands in agents that support
command files.

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

- state the workflow goal;
- tell the agent to run the matching `npm run workflow:<stage>` preflight;
- require reading the relevant contract files and ledgers;
- name the required academic research skills and recommended Superpowers
  skills;
- define the step-by-step loop;
- define review, fix, re-review, and clean-final gates;
- define what files must be updated;
- define what must not be done;
- define the handoff to the next workflow stage.

These prompt commands are the human-facing way to start a workflow with an
agent. Example invocation:

```text
Use docs/agent/workflow-prompts/literature.md and start the literature workflow
for this project. Follow the prompt exactly, use the required skills, update
the ledgers, and stop at the review gate if prerequisites are missing.
```

When an agent supports slash commands, adapters may expose these files as:

```text
/research-literature
/research-survey
/research-agenda
/research-contribution
/research-analysis
/research-frame
/research-release
/research-manuscript
/research-submission
/research-response
```

The portable Markdown prompt remains the source of truth. Agent-specific slash
commands should be generated or documented from it, not written as divergent
instructions.

## Current State

The current scaffold already supports:

- `sources/` source ledgers, conversion ledgers, BibTeX, citation audit;
- `sota/` search strategy, screening, matrix, reading log, citation chasing, synthesis, gaps, PRISMA flow;
- `experiments/`, `analysis_outputs/`, `repro_outputs/`, `outputs/`, `artifacts/`;
- project-local skills installation;
- MCP catalog, generated MCP snippets, MCP env docs, setup, smoke, doctor, and probe commands;
- lifecycle commands: `doctor`, `update`, `setup`, `rename`, `skills`, `mcp`, `workflow literature`;
- managed-file manifest and safe update behavior.

The current scaffold does not yet implement equal operational depth for:

- `survey/`;
- `research_agenda/`;
- `contributions/`;
- contribution-local `analyses/`, strict analysis bundles, results reports,
  and publication figure/table asset QA;
- `paper_frames/`;
- `paper_releases/`;
- `paper_submissions/`;
- project-level and contribution-level `compliance/`;
- workflow commands beyond `workflow literature`;
- doctor checks for new ledgers, manifests, source maps, checksums, badge profiles, and release plans;
- companion skills dedicated to survey, agenda, contribution package, analysis
  reporting, publication figures/tables, paper framing, paper release, and
  paper submission lifecycle, rebuttal/revision response, and badge compliance
  profiles.

## Claude Scholar Audit Corrections

The Claude Scholar audit changes the implementation plan in five ways:

- Evidence Records and Claim Promotion Gates become a universal contract across
  sources, SOTA, survey, agenda, contribution packages, analysis reports,
  paper frames, manuscripts, rebuttals, and releases.
- The analysis workflow is split into strict analysis bundle first,
  decision-oriented results report second, and publication-facing figure/table
  assets third. Polished conclusions are blocked until the strict bundle exists.
- Zotero becomes a first-class optional ingestion and bibliography interface,
  but never replaces repository ledgers, full-text reading records, or the
  central bibliography.
- Obsidian-style knowledge lifecycle is implemented repo-natively through
  source notes, wiki/index/log, promoted claims, archives, and lint. Obsidian
  itself remains optional.
- Large written artifacts must support reader testing from fresh context in
  addition to adversarial review, especially survey, agenda, paper frame,
  manuscript, and release documentation.
- Submission and review communication must be paper-specific. Cover letters,
  submission checklists, decision letters, reviewer comments, rebuttals,
  response letters, and revision plans belong under a `paper_submissions/`
  package for that paper. New scientific work requested by reviewers belongs
  in `contributions/` and analysis bundles, then gets linked from the response
  package.

The audit also identifies patterns not to adopt as core behavior: mandatory
Obsidian vaults, hidden global writing memory, Claude-specific hooks as the
default runtime, and one-shot full manuscript drafting.

## Non-Negotiable Execution Gates

- No generated final artifact may contain review residue, obsolete alternatives, stale tables, stale figures, unsupported claims, duplicate citation state, or unresolved fix notes.
- No workflow layer is complete until it has template files, route guidance, doctor validation, tests, and an explicit review/finalization gate.
- No skill is complete until it tells an agent where to read, where to write, what to update, how to review, and when to stop.
- No MCP integration is treated as scholarly evidence by itself; MCP output must enter `sources/`, `sota/`, bibliography, and claim-audit records before supporting claims.
- No paper release is edited by hand. Release packages are generated from manifests, source maps, checksums, and canonical contribution packages.
- No rebuttal, response letter, or cover letter may introduce a claim that is
  absent from the frame, manuscript claim map, contribution package, analysis
  bundle, citation audit, or release evidence.
- No badge or compliance claim is allowed without an active profile and current evidence paths.

## File Ownership Policy

Use these policies consistently in `src/project.ts` managed-file specs and tests:

- `managed`: stable contracts, starter schemas, empty ledgers, docs that generator owns.
- `generated`: capability profile, MCP setup docs, generated MCP snippets.
- `user-owned`: research content the project will fill, including drafts, reports, review ledgers, frames, contribution reports, release plans, and final artifacts.
- `append-only`: chronological logs such as `wiki/log.md`.

Do not mark high-value research content as `managed` once it is expected to evolve inside a real project.

## Epic 0: Master Workflow Contracts In This Repo

**Purpose:** Add the repository-level contracts that all later epics will consume.

**Files:**

- Modify: `template/configs/default.yaml`
- Modify: `template/AGENTS.md`
- Modify: `template/README.md`
- Modify: `template/docs/getting-started.md`
- Modify: `template/docs/agent/project-quality.md`
- Modify: `template/docs/agent/output-contracts.md`
- Create: `template/docs/agent/skill-readiness.md`
- Create: `template/docs/agent/research-workflow.md`
- Create: `template/docs/agent/review-loop.md`
- Create: `template/docs/agent/workflow-prompts/README.md`
- Create: `template/compliance/profiles.yaml`
- Create: `template/compliance/README.md`
- Modify: `src/project.ts`
- Modify: `tests/create.test.mjs`

**Required behavior:**

- `configs/default.yaml` contains `workflow.available_stages` and paths for every first-class workflow layer.
- `AGENTS.md` routes tasks through source, SOTA, survey, agenda, contribution, frame, release, manuscript.
- `project-quality.md` describes the universal iterative review loop and final clean-copy rule.
- `output-contracts.md` defines trusted zones for the new workflow layers.
- `skill-readiness.md` explains required academic skills, recommended
  Superpowers skills, project-local installation, capability lock state, and
  doctor readiness modes.
- `docs/agent/workflow-prompts/README.md` explains that prompt-level workflow
  commands are the agent-facing entrypoints and npm workflow commands are
  preflight/routing commands.
- Project-level `compliance/` exists and documents badge/compliance profile activation.
- `doctorProject` requires the new contract docs and profile registry.
- `createProject` and `initProject` preserve the managed/user-owned boundary.

**Tests:**

- Add assertions in `tests/create.test.mjs` that a created project has the new docs and config paths.
- Add doctor assertions that missing `docs/agent/research-workflow.md` and `compliance/profiles.yaml` are reported.
- Run `npm test -- tests/create.test.mjs`.
- Run `npm run lint`.

**Exit gate:**

- A newly generated project tells an agent the full pipeline, even before later workflow directories are added.

## Epic 1: Bibliography And Zotero Contract

**Purpose:** Make Zotero a first-class optional source-ingestion/bibliography interface without making it a hidden source of truth.

**Files:**

- Modify: `template/sources/source-ledger.csv`
- Modify: `template/sources/bib/citation-audit.csv`
- Create: `template/sources/zotero/README.md`
- Create: `template/sources/zotero/import-log.csv`
- Create: `template/sources/zotero/collection-map.csv`
- Modify: `template/docs/agent/research-workflow.md`
- Modify: `template/docs/agent/mcp-setup.md` generation through `src/capabilities.ts` if Zotero wording is generated there.
- Modify: `src/stack.ts`
- Modify: `src/project.ts`
- Modify: `tests/create.test.mjs`
- Modify: `tests/capabilities.test.mjs` if MCP prose expectations change.

**Required behavior:**

- Zotero records import collection, item key, attachment path, exported BibTeX key, source ID, and reconciliation status.
- New Zotero discoveries still route through `sources/source-ledger.csv`, `sources/bib/references.bib`, citation audit, and SOTA linkage.
- MCP catalog keeps Zotero opt-in and local-service.
- `workflow literature` prints Zotero as optional local-library enrichment, not required default.

**Tests:**

- Created projects contain `sources/zotero/import-log.csv` and `collection-map.csv` with required headers.
- Doctor validates Zotero ledger headers.
- `npm test -- tests/create.test.mjs tests/capabilities.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Zotero can improve source ingestion without bypassing repository ledgers.

## Epic 2: SOTA Promotion Contract

**Purpose:** Keep the existing SOTA strength while making downstream promotion explicit.

**Files:**

- Modify: `template/sota/literature-matrix.csv`
- Modify: `template/sota/synthesis.md`
- Modify: `template/sota/gaps.md`
- Create: `template/sota/sota-claim-ledger.csv`
- Create: `template/sota/promotion-rules.md`
- Modify: `src/project.ts`
- Modify: `tests/create.test.mjs`

**Required behavior:**

- Every SOTA claim can record source IDs, allowed wording, forbidden stronger wording, evidence strength, downstream status, and unresolved risks.
- `sota/gaps.md` becomes a structured input to survey and agenda work.
- Doctor validates `sota-claim-ledger.csv`.

**Tests:**

- Generated projects include `sota/sota-claim-ledger.csv`.
- Doctor reports a missing required SOTA claim-ledger column.
- `npm test -- tests/create.test.mjs`.
- `npm run lint`.

**Exit gate:**

- SOTA no longer flows into survey/agenda as loose prose; it promotes claims through a ledger.

## Epic 3: Survey Workflow

**Purpose:** Add a first-class SOTA-derived survey workflow with iterative section planning and reporting-mode compliance.

**Files:**

- Create: `template/survey/survey-contract.md`
- Create: `template/survey/outline.md`
- Create: `template/survey/section-plans/.gitkeep`
- Create: `template/survey/drafts/.gitkeep`
- Create: `template/survey/final/.gitkeep`
- Create: `template/survey/reviews/.gitkeep`
- Create: `template/survey/compliance/README.md`
- Create: `template/survey/survey-claim-ledger.csv`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow survey` prints the survey workflow and points to `survey-synthesis`, `systematic-review-prisma`, `citation-claim-audit`, and `adversarial-peer-review`.
- Survey contract declares mode: narrative, systematic, scoping, meta-analysis, or mixed.
- Systematic/scoping/meta-analytic modes activate `survey/compliance/` and PRISMA-style evidence.
- Survey drafting is section-by-section with review and clean-final gate.

**Tests:**

- Generated project contains all survey starter files.
- Doctor validates `survey/survey-claim-ledger.csv`.
- CLI help lists `workflow survey`.
- `academic-research workflow survey --root <project>` exits 0 and prints next skills.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Survey is no longer a side effect of SOTA; it has its own contract and review loop.

## Epic 4: Research Agenda Workflow

**Purpose:** Turn survey/SOTA gaps into reviewed, prioritized research opportunities.

**Files:**

- Create: `template/research_agenda/agenda-contract.md`
- Create: `template/research_agenda/opportunity-ledger.csv`
- Create: `template/research_agenda/directions/.gitkeep`
- Create: `template/research_agenda/final/.gitkeep`
- Create: `template/research_agenda/reviews/.gitkeep`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow agenda` prints required inputs from `sota/gaps.md`, `sota/sota-claim-ledger.csv`, `survey/survey-claim-ledger.csv`, and `survey/final/`.
- Opportunity rows include evidence, nearest prior work, method/experiment idea, feasibility, expected contribution, failure condition, risk, cost, priority, and decision.
- Agenda review checks novelty, feasibility, evidence, publishability, and ethical/release constraints.

**Tests:**

- Generated project includes agenda files and doctor validates ledger headers.
- CLI help lists `workflow agenda`.
- `workflow agenda` prints next skills: `research-agenda`, `research-design-positioning`, `cs-methodology-evaluation`, `adversarial-peer-review`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Research agenda items become decision records, not generic future-work prose.

## Epic 5: Contribution Package Workflow

**Purpose:** Create the bridge from agenda items to paper frames for analyses, experiments, artifacts, pipelines, datasets, software, benchmarks, systems, protocols, reproductions, replications, and negative results.

**Files:**

- Create: `template/contributions/contribution-ledger.csv`
- Create: `template/contributions/templates/contribution.yaml`
- Create: `template/contributions/templates/README.md`
- Create: `template/contributions/templates/claim-map.md`
- Create: `template/contributions/templates/badge-plan.md`
- Create: `template/contributions/templates/compliance/profiles.yaml`
- Create: `template/contributions/templates/components/.gitkeep`
- Create: `template/contributions/templates/inputs/.gitkeep`
- Create: `template/contributions/templates/outputs/data/.gitkeep`
- Create: `template/contributions/templates/outputs/tables/.gitkeep`
- Create: `template/contributions/templates/outputs/figures/.gitkeep`
- Create: `template/contributions/templates/outputs/models/.gitkeep`
- Create: `template/contributions/templates/outputs/software/.gitkeep`
- Create: `template/contributions/templates/outputs/artifacts/.gitkeep`
- Create: `template/contributions/templates/report.md`
- Create: `template/contributions/templates/paper-export/.gitkeep`
- Create: `template/contributions/templates/reviews/.gitkeep`
- Create: `template/contributions/templates/archive/.gitkeep`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow contribution` prints how to create a contribution package from an agenda item.
- Contribution manifests record agenda linkage, type, status, sources, analyses, output paths, badge targets, compliance profiles, review state, and supersession state.
- Contribution reports default to Markdown for review and `paper-export/` for LaTeX snippets.
- Contribution packages explicitly select compliance profiles; they do not activate every profile by default.

**Tests:**

- Generated project includes `contributions/contribution-ledger.csv` and templates.
- Doctor validates contribution ledger headers and template YAML parses.
- CLI help lists `workflow contribution`.
- `workflow contribution` prints next skills: `contribution-package`,
  `research-data-analysis`, `research-results-reporting`, `experiment-logbook`,
  `publication-figures-tables`, and `badge-compliance-profiles`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- All downstream paper claims can point to reviewed contribution packages, not loose files.

## Epic 6: Strict Analysis, Results Report, And Publication Asset Workflow

**Purpose:** Put every substantial analysis or experiment inside a contribution
package with blocker-first preflight, strict analysis bundle, decision-oriented
results report, publication-ready figures/tables, paper export, reviews, and
stale-state checks.

**Files:**

- Create: `template/contributions/templates/analyses/templates/analysis.yaml`
- Create: `template/contributions/templates/analyses/templates/README.md`
- Create: `template/contributions/templates/analyses/templates/blocker-summary.md`
- Create: `template/contributions/templates/analyses/templates/inputs/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/data/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/scripts/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/tables/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/figures/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/figure-catalog.md`
- Create: `template/contributions/templates/analyses/templates/stats-appendix.md`
- Create: `template/contributions/templates/analyses/templates/report.md`
- Create: `template/contributions/templates/analyses/templates/paper-export/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/paper-export/README.md`
- Create: `template/contributions/templates/analyses/templates/reviews/.gitkeep`
- Create: `template/contributions/templates/analyses/templates/archive/.gitkeep`
- Modify: `template/docs/agent/output-contracts.md`
- Modify: `template/docs/agent/project-quality.md`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `src/project.ts`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow analysis` prints the contribution-local strict-analysis workflow
  and blocks polished conclusions when primary question, unit of analysis,
  metric direction, raw provenance, sample/seed/run counts, or comparison
  family are missing.
- `analysis.yaml` names canonical data, tables, figures, scripts, environment,
  primary question, unit of analysis, metric direction, comparison family,
  linked claims, validation commands, and publication asset paths.
- `blocker-summary.md` is the only allowed output when the strict analysis
  preflight fails.
- `stats-appendix.md` records descriptive statistics, test choices,
  assumptions, effect sizes, confidence intervals, multiple-comparison handling,
  sample/seed/run counts, and limitations.
- `figure-catalog.md` records each figure's source data, purpose, caption
  requirements, key observation, interpretation checklist, and known caveats.
- `report.md` is a decision-oriented internal report produced only after the
  strict bundle exists. It references generated outputs instead of copying
  numeric truth.
- `paper-export/` contains generated LaTeX fragments, table inputs, figure
  inclusion snippets, and source-data links when paper-facing.
- Publication-facing figures and tables must pass readability, accessibility,
  caption, export-format, and stale-reference QA.
- Final review checks report references against manifest paths and verifies the
  clean-copy rule.

**Tests:**

- Generated project includes analysis templates.
- Doctor parses `analysis.yaml` template and validates required fields.
- CLI help lists `workflow analysis`.
- `workflow analysis` prints next skills: `research-data-analysis`,
  `research-results-reporting`, `publication-figures-tables`,
  `citation-claim-audit`, and `adversarial-peer-review`.
- Doctor validates required analysis bundle template files and key map headers.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Analysis reports and paper tables/figures cannot silently drift apart, and no
  analysis can promote a result claim without a complete strict bundle or an
  explicit blocker summary.

## Epic 7: Badge And Compliance Profiles

**Purpose:** Support all relevant badge families and compliance standards through configurable profiles.

**Files:**

- Modify: `template/compliance/profiles.yaml`
- Create: `template/compliance/acm-artifact-review.md`
- Create: `template/compliance/open-practice-badges.md`
- Create: `template/compliance/top-transparency.md`
- Create: `template/compliance/venue-checklist.md`
- Create: `template/compliance/method-reporting.md`
- Create: `template/compliance/survey-reporting.md`
- Create: `template/compliance/dataset-metadata.md`
- Create: `template/compliance/ai-model-release.md`
- Modify: `template/artifacts/artifact-checklist.md`
- Modify: `template/artifacts/badge-evidence-ledger.csv`
- Modify: `src/project.ts`
- Modify: `tests/create.test.mjs`

**Required behavior:**

- Profiles include ACM artifact review, USENIX/SIGPLAN variants, COS/OSF, TOP, venue-year checklists, method reporting, PRISMA, dataset metadata, and AI model release.
- Active profile rows include target, applicability, evidence paths, missing evidence, blocking gaps, reviewer, checked date, and status.
- Final paper/frame/release review blocks badge claims without evidence.

**Tests:**

- Generated project contains profile docs and profile registry.
- Doctor validates `compliance/profiles.yaml` and badge evidence ledger headers.
- `npm test -- tests/create.test.mjs`.
- `npm run lint`.

**Exit gate:**

- The scaffold is badge-ready by design without forcing every project to target every badge.

## Epic 8: Paper Framing Workflow

**Purpose:** Make paper framing the venue-aware bridge from contribution packages to one or more possible manuscripts and releases.

**Files:**

- Create: `template/paper_frames/frame-ledger.csv`
- Create: `template/paper_frames/templates/frame-contract.md`
- Create: `template/paper_frames/templates/selected-contributions.yaml`
- Create: `template/paper_frames/templates/argument-map.md`
- Create: `template/paper_frames/templates/evidence-map.md`
- Create: `template/paper_frames/templates/badge-fit.md`
- Create: `template/paper_frames/templates/compliance-fit.md`
- Create: `template/paper_frames/templates/venue-fit.md`
- Create: `template/paper_frames/templates/release-plan.yaml`
- Create: `template/paper_frames/templates/outline.md`
- Create: `template/paper_frames/templates/reviews/.gitkeep`
- Create: `template/paper_frames/templates/decision.md`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow frame` prints how to select target venue, track, year, audience, contribution packages, badge targets, compliance profiles, and release implications.
- A frame can be rejected or held without becoming a manuscript.
- Multiple frames can use the same research foundations and contribution packages.

**Tests:**

- Generated project includes frame ledger and templates.
- Doctor validates frame ledger and parses `selected-contributions.yaml` and `release-plan.yaml`.
- CLI help lists `workflow frame`.
- `workflow frame` prints next skills: `paper-framing`, `cs-venue-strategy`, `adversarial-peer-review`, `badge-compliance-profiles`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Manuscript writing cannot start as a free-floating draft; it starts from an accepted frame.

## Epic 9: Paper Release Workflow

**Purpose:** Generate clean paper-specific public/review artifacts from manifests rather than publishing the entire work repository.

**Files:**

- Create: `template/paper_releases/release-ledger.csv`
- Create: `template/paper_releases/templates/release.yaml`
- Create: `template/paper_releases/templates/source-map.csv`
- Create: `template/paper_releases/templates/release-plan.lock`
- Create: `template/paper_releases/templates/checksums.txt`
- Create: `template/paper_releases/templates/artifact/.gitkeep`
- Create: `template/paper_releases/templates/manuscript/.gitkeep`
- Create: `template/paper_releases/templates/supplement/.gitkeep`
- Create: `template/paper_releases/templates/data/.gitkeep`
- Create: `template/paper_releases/templates/models/.gitkeep`
- Create: `template/paper_releases/templates/metadata/README.md`
- Create: `template/paper_releases/templates/reviews/.gitkeep`
- Create: `template/paper_releases/templates/archive/.gitkeep`
- Create: `template/scripts/release-paper/README.md`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow release` prints manifest-driven release steps and forbids manual edits in generated release staging.
- Release plan records source contributions, included paths, excluded paths, active profiles, anonymization mode, public destination, smoke tests, metadata, and expected outputs.
- Source map records every released file's canonical source.
- Lock records commit, selected contribution IDs, selected analysis IDs, profile versions, checksums, and build timestamp.
- Doctor detects missing release files, broken source-map references, excluded-path leakage, and checksum file absence.

**Tests:**

- Generated project includes release ledger and templates.
- Doctor validates release ledger and source-map headers.
- CLI help lists `workflow release`.
- `workflow release` prints next skills: `paper-release`, `artifact-open-science`, `research-repo-reproduction`, `badge-compliance-profiles`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Every paper can produce a clean public or artifact-evaluation package without stale copies.

## Epic 10: Manuscript Assembly Workflow

**Purpose:** Make manuscripts consume accepted frames, central bibliography, reviewed claims, generated tables/figures, and release evidence.

**Files:**

- Modify: `template/reports/paper/sota-survey.tex`
- Create: `template/reports/paper/README.md`
- Create: `template/reports/paper/manuscript-contract.md`
- Create: `template/reports/paper/claim-map.csv`
- Create: `template/reports/paper/figure-table-map.csv`
- Modify: `template/docs/agent/output-contracts.md`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow manuscript` prints that manuscript drafting requires an accepted paper frame.
- Manuscript contract links frame ID, venue, bibliography file, claim map, selected contribution packages, release plan, and generated tables/figures.
- Doctor validates claim-map and figure-table-map headers.
- Manuscript docs state that new citations must return to source/SOTA ingestion.

**Tests:**

- Generated project includes manuscript contract files.
- CLI help lists `workflow manuscript`.
- `workflow manuscript` prints next skills: `paper-writing-review`, `citation-claim-audit`, `adversarial-peer-review`, `cs-venue-strategy`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Manuscript writing is aligned with frame and release evidence before prose expands.

## Epic 11: Paper Submission And Review Lifecycle

**Purpose:** Manage the per-paper lifecycle after a frame becomes a submission:
cover letter or submission letter, submission checklist, submitted snapshot,
editorial correspondence, decision letters, reviewer comments, rebuttal or
response letters, revision plans, linked new work, manuscript change maps, and
camera-ready communication state.

**Files:**

- Create: `template/paper_submissions/submission-ledger.csv`
- Create: `template/paper_submissions/templates/submission.yaml`
- Create: `template/paper_submissions/templates/cover-letter.md`
- Create: `template/paper_submissions/templates/submission-checklist.md`
- Create: `template/paper_submissions/templates/submitted-version.lock`
- Create: `template/paper_submissions/templates/venue-system-notes.md`
- Create: `template/paper_submissions/templates/correspondence/.gitkeep`
- Create: `template/paper_submissions/templates/decisions/.gitkeep`
- Create: `template/paper_submissions/templates/review-rounds/r1/decision-letter.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/reviewer-comments.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/concern-map.csv`
- Create: `template/paper_submissions/templates/review-rounds/r1/response-strategy.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/revision-plan.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/linked-work.csv`
- Create: `template/paper_submissions/templates/review-rounds/r1/manuscript-change-map.csv`
- Create: `template/paper_submissions/templates/review-rounds/r1/response-letter.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/rebuttal.md`
- Create: `template/paper_submissions/templates/review-rounds/r1/reviews/.gitkeep`
- Create: `template/paper_submissions/templates/camera-ready/.gitkeep`
- Create: `template/paper_submissions/templates/archive/.gitkeep`
- Modify: `src/project.ts`
- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `workflow submission` prints cover-letter, submission checklist, submitted
  snapshot, venue-system, anonymity, frame, manuscript, release, and claim-map
  prerequisites.
- `workflow response` prints decision-letter/reviewer-comment intake,
  concern-map, linked-work, manuscript-change-map, rebuttal, response-letter,
  and revision-plan prerequisites.
- `submission.yaml` links frame ID, manuscript contract, release plan, venue,
  track, year, submission system, anonymity mode, submitted file set, cover
  letter status, review-round status, current decision, and linked evidence.
- `concern-map.csv` splits reviewer and editor comments into atomic concerns
  with severity, action, status, evidence anchor, manuscript location, and
  linked-work requirement.
- `linked-work.csv` maps reviewer-requested scientific work to contribution
  packages, experiments, analysis bundles, artifacts, citation work, or
  `unresolved`; the rebuttal folder never owns the scientific work itself.
- `manuscript-change-map.csv` verifies every promised manuscript change and
  response claim against exact locations and evidence.
- Cover letters, response letters, and rebuttals may reference evidence, but
  they may not introduce unsupported claims.

**Tests:**

- Generated project includes submission ledger and templates.
- Doctor validates `submission-ledger.csv`, `concern-map.csv`,
  `linked-work.csv`, and `manuscript-change-map.csv` headers.
- CLI help lists `workflow submission` and `workflow response`.
- `workflow submission` prints next skills: `paper-submission-lifecycle`,
  `paper-writing-review`, `citation-claim-audit`, and `cs-venue-strategy`.
- `workflow response` prints next skills: `rebuttal-revision-strategy`,
  `paper-submission-lifecycle`, `citation-claim-audit`,
  `paper-writing-review`, `contribution-package`, and
  `research-data-analysis`.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Each submitted paper has a traceable private submission/review package, and
  reviewer-driven new work is routed through normal contribution and analysis
  workflows before being cited in a rebuttal or response.

## Epic 12: Workflow Command System

**Purpose:** Convert workflow commands from a single literature shortcut into a consistent, discoverable workflow router.

**Files:**

- Modify: `src/cli.ts`
- Modify: `template/package.json`
- Modify: `src/project.ts`
- Modify: `README.md`
- Modify: `template/README.md`
- Modify: `template/docs/getting-started.md`
- Create: `template/docs/agent/workflow-prompts/literature.md`
- Create: `template/docs/agent/workflow-prompts/survey.md`
- Create: `template/docs/agent/workflow-prompts/agenda.md`
- Create: `template/docs/agent/workflow-prompts/contribution.md`
- Create: `template/docs/agent/workflow-prompts/analysis.md`
- Create: `template/docs/agent/workflow-prompts/frame.md`
- Create: `template/docs/agent/workflow-prompts/release.md`
- Create: `template/docs/agent/workflow-prompts/manuscript.md`
- Create: `template/docs/agent/workflow-prompts/submission.md`
- Create: `template/docs/agent/workflow-prompts/response.md`
- Create: `template/docs/agent/workflow-prompts/full-research-loop.md`
- Modify: `tests/cli.test.mjs`
- Modify: `tests/create.test.mjs`

**Required behavior:**

- `academic-research workflow help` lists `literature`, `survey`, `agenda`,
  `contribution`, `analysis`, `frame`, `release`, `manuscript`,
  `submission`, and `response`.
- Generated projects include scripts:
  - `workflow:literature`
  - `workflow:survey`
  - `workflow:agenda`
  - `workflow:contribution`
  - `workflow:analysis`
  - `workflow:frame`
  - `workflow:release`
  - `workflow:manuscript`
  - `workflow:submission`
  - `workflow:response`
- Each workflow command reports:
  - root;
  - stage;
  - required inputs;
  - files to inspect;
  - skills to use;
  - missing required academic research skills;
  - why those skills are the correct operational procedure for the stage;
  - MCP readiness, when relevant;
  - next commands;
  - blocking gaps if required starter files are missing.
- Only `workflow literature` changes MCP selection. Other workflow commands initialize or report state without enabling credentialed MCPs automatically.
- Workflow commands must never create a false sense that the CLI can perform
  the research work by itself. Every command should hand off to named skills
  and named repository contracts.
- Every stage has a matching prompt-level workflow command under
  `docs/agent/workflow-prompts/`. The npm command points to it, and the prompt
  tells the agent how to use the npm preflight, required skills, review loop,
  ledgers, and handoff.

**Tests:**

- CLI help and each workflow command have focused tests.
- Generated package scripts match template scripts.
- Generated projects contain every workflow prompt file.
- `npm test -- tests/cli.test.mjs tests/create.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Agents and users can enter any workflow stage through a predictable command.

## Epic 13: Doctor, Migration, And Stale-State Validation

**Purpose:** Make validation strong enough to catch structural drift and stale release references without pretending to solve deep semantic judgment.

**Files:**

- Modify: `src/project.ts`
- Create or modify: test fixtures inside `tests/` if needed
- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs` if command diagnostics change
- Modify: `README.md`
- Modify: `template/README.md`

**Required behavior:**

- Doctor supports structural and operational readiness modes.
- Operational doctor validates required academic research skills, required
  files, CSV/TSV headers, YAML parseability, managed-file drift, stale
  lifecycle commands, workflow profile availability, active profile registry,
  and high-signal cross references.
- Structural doctor validates the scaffold without requiring installed skills,
  so CI and offline no-install scaffolds remain possible.
- Doctor reports warnings for deeper semantic checks that require skills, such as unsupported claim strength or weak framing.
- Update dry-run reports new managed/user-owned starter files without overwriting local project content.
- Existing projects can migrate safely with `npm run update` and `npm run update -- --apply`.

**Tests:**

- Missing required academic research skills fail operational doctor.
- Missing required academic research skills do not fail structural doctor.
- Broken ledger headers fail doctor.
- Broken YAML manifests fail doctor.
- Missing frame-selected contribution is reported.
- Missing release source path is reported.
- Missing table/figure referenced by a map is reported.
- Missing submission frame/manuscript/release link is reported.
- Missing reviewer concern response status is reported.
- Linked reviewer-requested work outside contribution or analysis workflows is
  reported.
- Update dry-run reports creates without applying.
- Update apply creates new starter files but skips locally edited user-owned content.
- `npm test -- tests/create.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- The generator protects the new workflow structure during creation, update, and maintenance.

## Epic 14: Integrated Skill Package Transformation

**Purpose:** Make project-local skills the true operational base for every workflow stage with equal rigor.

**Repository:** `VincenzoImp/academic-research-skills`

**Product status:** This repository is separate for packaging and installation
convenience, but it is part of the same product architecture as
`create-academic-research`. Treat skill design as first-class product design,
not as external documentation.

**Implementation location:** clone or worktree outside this repo, then make a separate branch in that repository.

**Keep and revise these skills:**

- `source-ingestion`
- `document-conversion`
- `citation-bibliography-tooling`
- `citation-claim-audit`
- `systematic-review-prisma`
- `academic-mcp-tooling`
- `cs-methodology-evaluation`
- `experiment-logbook`
- `research-data-analysis`
- `artifact-open-science`
- `paper-writing-review`
- `adversarial-peer-review`
- `rebuttal-revision-strategy`
- `cs-venue-strategy`
- `research-project-router`
- `research-project-maintenance`
- `research-design-positioning`
- `research-repo-reproduction`
- `research-ui-prototyping`
- `ethics-data-governance`
- `repo-migration`
- `skill-evaluation`

**Add these skills:**

- `survey-synthesis`
- `research-agenda`
- `contribution-package`
- `research-results-reporting`
- `publication-figures-tables`
- `paper-framing`
- `paper-release`
- `paper-submission-lifecycle`
- `badge-compliance-profiles`

**Cross-skill contract:**

- Each skill starts by reading the project contract and the exact workflow-layer contract it operates on.
- Each skill states inputs, outputs, ledgers to update, review loop, final gate, and handoff target.
- Each skill forbids durable claims from chat-only evidence.
- Each skill requires final clean-copy review before promotion.
- Each skill writes review history outside final artifacts.
- Each skill updates relevant ledgers instead of relying on prose summaries.
- Each skill must name the workflow command that prepares its stage and the
  next workflow command or skill that receives its output.
- Each skill must degrade gracefully in non-`create-academic-research`
  repositories by explaining which contract files are missing instead of
  inventing alternate paths silently.

**Specific revisions:**

- `sota-literature-review`: remove survey/agenda as final side outputs; promote SOTA claims into `survey/` and `research_agenda/` workflows.
- `research-data-analysis`: become strict-analysis first, write analysis
  bundles under `contributions/<id>/analyses/<id>/`, produce blocker summaries
  when comparison units or provenance are insufficient, and treat global
  `analysis_outputs/` as exploratory/audit only.
- `research-results-reporting`: consume only completed strict analysis bundles
  and write decision-oriented reports with figure interpretation, limitations,
  negative results, belief updates, next actions, and artifact indexes.
- `publication-figures-tables`: produce and QA paper-facing figures, generated
  table fragments, source data, caption requirements, export formats,
  accessibility/readability checks, and stale-reference checks without
  hard-coding one plotting library as mandatory.
- `experiment-logbook`: connect runs to contribution packages and analysis manifests.
- `artifact-open-science`: become release-aware and profile-aware; operate on contribution packages and paper releases.
- `paper-writing-review`: require accepted frame, claim map, central `.bib`,
  generated table/figure map, and release evidence before durable manuscript
  drafting; support section-by-section coauthoring, fresh-reader testing, and
  project-local venue-writing notes rather than hidden global writing memory.
- `cs-venue-strategy`: feed paper frame venue-fit and compliance-fit rather than a loose venue doc only.
- `academic-mcp-tooling`: document Zotero as first-class optional ingestion and Overleaf as manuscript sync after frame acceptance.
- `paper-submission-lifecycle`: manage cover letters, submission checklists,
  submitted snapshot locks, venue-system notes, correspondence, decision
  letters, review-round folders, camera-ready communication state, and private
  submission archives without treating communication artifacts as evidence.
- `rebuttal-revision-strategy`: operate inside
  `paper_submissions/<paper_id>/review-rounds/<round>/`, preserve the
  evidence-anchor rule, maintain concern maps, linked-work maps, and manuscript
  change maps, and connect response claims back to paper frames, manuscripts,
  claim ledgers, contribution packages, analysis bundles, and release evidence.
- `research-project-maintenance`: absorb repo-native knowledge lifecycle tasks
  inspired by Obsidian workflows: promote, archive, index, lint, and link
  durable source, knowledge, writing, result, and release artifacts.
- `research-project-router`: route in pipeline order: source -> SOTA -> survey
  -> agenda -> contribution -> analysis -> frame -> release + manuscript ->
  submission -> response/revision.

**Skill repository tests:**

- Update `tests/test_skill_structure.py` to require new skills, references, and trigger examples.
- Update `evals/trigger-boundaries.json` with new stage-specific triggers.
- Run the skill repo validation commands:

```bash
python3.11 scripts/validate_skills.py
python3.11 -m pytest
```

**Exit gate:**

- Every pipeline step has a dedicated or clearly routed skill with the same operational rigor as the improved SOTA workflow.

## Epic 15: Skill Version And Scaffold Integration

**Purpose:** Make this generator aware of the revised integrated skill package without bundling those skills directly.

**Files in this repo:**

- Modify: `src/stack.ts`
- Modify: `README.md`
- Modify: `template/README.md`
- Modify: `template/docs/agent/capability-profile.md` generation through `src/capabilities.ts` if wording changes.
- Modify: `tests/capabilities.test.mjs`
- Modify: `tests/cli.test.mjs`

**Required behavior:**

- `AGENT_STACK.skill_sources.academic_research.skills` lists all revised and new skills.
- Preset descriptions explain which workflows the skill package covers.
- `skills install --preset default` installs the full academic research skill package.
- Explicit skill install accepts new skill IDs.
- Docs explain that skills are the operational procedures and the scaffold is the file/validation substrate.
- Generated project docs describe the two repositories as one integrated system:
  scaffold plus operational skills.

**Tests:**

- `tests/capabilities.test.mjs` verifies explicit install commands for new skill IDs.
- `tests/cli.test.mjs` verifies skill preset help includes end-to-end wording.
- `npm test -- tests/capabilities.test.mjs tests/cli.test.mjs`.
- `npm run lint`.

**Exit gate:**

- Generated projects can install the updated skill package and see stage-specific skills in capability docs.

## Epic 16: Documentation, Examples, And Migration Guide

**Purpose:** Make the end-to-end workflow understandable to humans and agents.

**Files:**

- Modify: `README.md`
- Modify: `template/README.md`
- Modify: `template/docs/getting-started.md`
- Create: `template/docs/agent/workflow-map.md`
- Create: `template/docs/examples/end-to-end-research-flow.md`
- Create: `template/docs/examples/paper-frame-to-release.md`
- Create: `template/docs/examples/contribution-package.md`
- Modify: `docs/design/final-architecture.md`
- Modify: `CHANGELOG.md` when release preparation begins.

**Required behavior:**

- README explains the full pipeline without implying the tool writes papers automatically.
- Getting started guides the first session from setup through SOTA readiness.
- Examples show how one project can produce multiple paper frames and multiple releases from shared foundations.
- Migration guide explains which files are managed, user-owned, generated, and append-only.

**Tests:**

- `scripts/validate.mjs` must still pass documentation checks.
- `npm run lint`.

**Exit gate:**

- A new user or agent can understand the architecture without reading this planning document.

## Global Execution Order

1. Epic 0: Master contracts.
2. Epic 1: Bibliography and Zotero.
3. Epic 2: SOTA promotion.
4. Epic 3: Survey.
5. Epic 4: Research agenda.
6. Epic 5: Contribution packages.
7. Epic 6: Strict analysis, results reporting, and publication assets.
8. Epic 7: Badge and compliance profiles.
9. Epic 8: Paper framing.
10. Epic 9: Paper release.
11. Epic 10: Manuscript assembly.
12. Epic 11: Paper submission and review lifecycle.
13. Epic 12: Workflow command system.
14. Epic 13: Doctor, migration, stale-state validation.
15. Epic 14: Companion skill package transformation, with the new skill
    skeletons started earlier before any scaffold stage references them.
16. Epic 15: Skill version and scaffold integration.
17. Epic 16: Documentation, examples, and migration guide.

The ordering may change only if a later epic needs a contract that blocks an earlier one. If that happens, update this plan first and record the reason.

## Review Loop For Each Epic

Each epic must follow:

```text
epic plan -> failing tests -> implementation -> focused tests -> lint -> self-review -> stale-state review -> user review gate
```

The epic is not complete until:

- tests pass;
- docs match generated behavior;
- doctor validates the new structure;
- no newly generated final artifact contains draft residue;
- no user-owned file is overwritten by update;
- no compliance or badge claim is unsupported;
- the next epic's inputs are present.

## Cross-Repository Coordination

Work in this repo and the skill repo must stay synchronized:

- The generator may list a skill only after that skill exists in `academic-research-skills`.
- The skill package may reference a generated path only after this scaffold creates or documents that path.
- If a path changes, update generator templates, skill repository contracts, examples, and tests in the same coordinated epic.
- If a stage is implemented in this scaffold, the matching skill behavior must
  be implemented or explicitly marked as a temporary skeleton that blocks
  operational readiness until completed.
- Release this generator and the skill package with compatible changelog notes.

## Deferred Post-Acceptance Extension

Claude Scholar has a useful post-acceptance workflow for slides, posters, and
public communication. Camera-ready communication state now belongs in the
paper-specific submission lifecycle, because it is part of the venue/editorial
record. Do not implement the public communication extension before the core
frame/release/manuscript/submission path is stable. Track it as a later
extension that consumes accepted manuscript and release artifacts without
creating new claims or unmanaged figures.

## Final Acceptance For The Whole Transformation

The transformation is complete only when a generated project supports this path without ad hoc folders:

```text
source ingestion
  -> SOTA evidence and claim promotion
  -> survey synthesis
  -> research agenda
  -> contribution packages
  -> strict analysis bundles, results reports, and publication assets
  -> paper frame
  -> paper-specific release
  -> manuscript
  -> paper submission package
  -> review response and revision lifecycle
  -> badge/compliance review
  -> final clean package
```

A smoke-generated project must pass:

```bash
npm install
npm run doctor
npm run skills:status
npm run workflow:literature
npm run workflow:survey
npm run workflow:agenda
npm run workflow:contribution
npm run workflow:analysis
npm run workflow:frame
npm run workflow:release
npm run workflow:manuscript
npm run workflow:submission
npm run workflow:response
npm run doctor
```

This final smoke does not prove scientific quality. It proves that the scaffold, contracts, commands, and validation infrastructure are present and coherent enough for project-local skills and agents to run the research workflow rigorously.
