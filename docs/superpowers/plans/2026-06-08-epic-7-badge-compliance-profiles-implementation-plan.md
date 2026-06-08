# Epic 7 Badge Compliance Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make badge and compliance support concrete without forcing every project to target every badge.

**Architecture:** Extend `compliance/profiles.yaml` into the project-level registry of supported profiles, active-profile field schema, source URLs, and evidence files. Add one evidence document per profile family. Extend `artifacts/badge-evidence-ledger.csv` so badge evidence rows can link profile, target, applicability, gaps, reviewer, checked date, and status. Doctor validates profile registry fields and badge evidence headers.

**Tech Stack:** TypeScript ESM generator/doctor, YAML and CSV templates, Markdown profile docs, Node test runner, `npm test -- tests/create.test.mjs`, `npm run lint`.

---

## File Structure

Create:

- `template/compliance/acm-artifact-review.md`
- `template/compliance/open-practice-badges.md`
- `template/compliance/top-transparency.md`
- `template/compliance/venue-checklist.md`
- `template/compliance/method-reporting.md`
- `template/compliance/survey-reporting.md`
- `template/compliance/dataset-metadata.md`
- `template/compliance/ai-model-release.md`

Modify:

- `template/compliance/profiles.yaml`: profile registry, active-profile fields, official/source URLs, evidence files.
- `template/artifacts/artifact-checklist.md`: cross-profile final badge claim gate.
- `template/artifacts/badge-evidence-ledger.csv`: profile-aware evidence header.
- `template/docs/agent/project-quality.md`, `template/docs/agent/research-workflow.md`, `template/docs/agent/output-contracts.md`: badge evidence rules.
- `src/project.ts`: required CSV columns, YAML required paths, required files, managed specs.
- `tests/create.test.mjs`: creation and doctor assertions.

## Task 1: Add Failing Tests

- [ ] **Step 1: Add generated file assertions**

Assert profile docs exist:

```js
  await stat(join(target, "compliance/acm-artifact-review.md"));
  await stat(join(target, "compliance/open-practice-badges.md"));
  await stat(join(target, "compliance/top-transparency.md"));
  await stat(join(target, "compliance/venue-checklist.md"));
  await stat(join(target, "compliance/method-reporting.md"));
  await stat(join(target, "compliance/survey-reporting.md"));
  await stat(join(target, "compliance/dataset-metadata.md"));
  await stat(join(target, "compliance/ai-model-release.md"));
```

Assert registry and ledger:

```js
  assert.deepEqual(complianceProfiles.active_profile_fields, [
    "profile_id",
    "target",
    "applicability",
    "evidence_paths",
    "missing_evidence",
    "blocking_gaps",
    "reviewer",
    "checked_date",
    "status"
  ]);
  assert.equal(complianceProfiles.profiles["acm-artifact-review"].source_url, "https://www.acm.org/publications/policies/artifact-review-and-badging-current");
  assert.equal(complianceProfiles.profiles["dataset-metadata"].source_url, "https://schema.datacite.org/");
```

Assert badge evidence header:

```js
  assert.match(
    badgeEvidence,
    /^badge_target,profile_id,profile_target,applicability,evidence_id,evidence_path,claim_or_result_id,artifact_component,command_or_procedure,validation_status,missing_evidence,blocking_gaps,reviewer,checked_date,checked_on,status,notes/m
  );
```

- [ ] **Step 2: Add doctor assertions**

Add a dedicated broken compliance test:

```js
test("doctorProject reports broken compliance profiles and badge evidence headers", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-doctor-compliance-broken-"));
  const target = join(root, "doctor-compliance-broken-project");
  await createProject({
    target,
    title: "Doctor Compliance Broken Project",
    preset: "minimal",
    installSkills: false
  });

  await writeFile(join(target, "compliance/profiles.yaml"), "version: 1\nactive_profiles: []\nprofiles: {}\n", "utf8");
  await writeFile(join(target, "artifacts/badge-evidence-ledger.csv"), "badge_target,evidence_id\n", "utf8");

  const result = await doctorProject(target);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("compliance/profiles.yaml missing active_profile_fields")));
  assert.ok(result.errors.some((error) => error.includes("compliance/profiles.yaml missing profiles.acm-artifact-review")));
  assert.ok(result.errors.some((error) => error.includes("artifacts/badge-evidence-ledger.csv missing column profile_id")));
});
```

- [ ] **Step 3: Add update migration assertion**

Remove profile docs and old badge ledger columns, then verify `updateProject`
creates docs and appends missing columns without losing rows.

- [ ] **Step 4: Run RED**

```bash
npm test -- tests/create.test.mjs
```

Expected: FAIL because profile docs, registry schema, ledger columns, and doctor validation are missing.

## Task 2: Implement Profiles And Wiring

- [ ] Create profile evidence docs for ACM/USENIX/SIGPLAN artifact evaluation, COS/OSF open practice, TOP, venue checklists, method reporting, PRISMA, dataset metadata, and AI model release.
- [ ] Update `profiles.yaml` with `active_profile_fields`, profile source URLs, badge labels, evidence files, and default inactive active profile list.
- [ ] Extend `artifacts/badge-evidence-ledger.csv` and `REQUIRED_CSV_COLUMNS`.
- [ ] Add `compliance/profiles.yaml` YAML required paths.
- [ ] Add profile docs to doctor required files and managed specs.
- [ ] Update docs and artifact checklist.

## Task 3: Verify, Commit, Push

Run:

```bash
npm test -- tests/create.test.mjs
npm run lint
npm test
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/compliance docs/superpowers/plans/2026-06-08-epic-7-badge-compliance-profiles-implementation-plan.md
git diff --check
git status --short --untracked-files=all
```

Commit and push:

```bash
git add docs/superpowers/plans/2026-06-08-epic-7-badge-compliance-profiles-implementation-plan.md src/project.ts template tests
git commit -m "feat: expand badge compliance profiles"
git push
```

## Acceptance Criteria

- New projects include every compliance profile evidence document.
- `profiles.yaml` defines supported profiles and active-profile field schema.
- Badge evidence ledger rows can record profile, target, applicability, gaps, reviewer, checked dates, and status.
- Doctor catches broken profile registry and badge evidence headers.
- `npm run lint` passes.
- `npm test` passes.
