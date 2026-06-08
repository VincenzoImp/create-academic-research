# Epic 1 Bibliography And Zotero Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zotero a first-class optional source-ingestion and bibliography interface without letting it bypass repository source ledgers, BibTeX, citation audit, or SOTA linkage.

**Architecture:** Add Zotero-specific ledgers under `sources/zotero/`, add reconciliation columns to source and citation ledgers, validate those headers in `doctorProject`, and let `updateProject` append missing ledger columns conservatively. Keep Zotero opt-in in the MCP catalog and document it as optional local-library enrichment in `workflow literature`.

**Tech Stack:** TypeScript ESM generator, CSV template ledgers, Markdown template docs, Node test runner, `npm test -- tests/create.test.mjs tests/cli.test.mjs tests/capabilities.test.mjs`, `npm run lint`.

---

## Scope Boundary

Epic 1 does not enable Zotero by default and does not run Zotero imports. It only creates the repository contract for importing, reconciling, and auditing Zotero-derived bibliography records.

## File Structure

Create:

- `template/sources/zotero/README.md`: rules for Zotero as optional ingestion interface.
- `template/sources/zotero/import-log.csv`: per-import item reconciliation ledger.
- `template/sources/zotero/collection-map.csv`: collection-to-project-scope map.

Modify:

- `template/sources/source-ledger.csv`: add Zotero discovery/reconciliation columns.
- `template/sources/bib/citation-audit.csv`: add Zotero export/reconciliation columns.
- `template/docs/agent/research-workflow.md`: state that Zotero discoveries return to source ingestion and SOTA linkage.
- `template/AGENTS.md`: add Zotero evidence routing rules.
- `template/README.md`: add Zotero ledger paths.
- `template/docs/getting-started.md`: add optional Zotero enrichment notes.
- `template/tests/test_project_structure.py`: assert Zotero ledger files exist.
- `src/project.ts`: required CSV headers, user-owned Zotero ledger specs, conservative CSV header migration.
- `src/cli.ts`: print Zotero as optional local-library enrichment in `workflow literature`.
- `tests/create.test.mjs`: creation, doctor, and migration assertions.
- `tests/cli.test.mjs`: workflow literature output assertion.
- `tests/capabilities.test.mjs`: preserve Zotero opt-in local-service assertions.

---

## Task 1: Add Failing Tests

**Files:**

- Modify: `tests/create.test.mjs`
- Modify: `tests/cli.test.mjs`
- Modify: `tests/capabilities.test.mjs`

- [ ] **Step 1: Add creation assertions for Zotero ledgers**

In `createProject generates a personalized research project without global side effects`, after the existing `sources/markdown-linear/.gitkeep` assertion, add:

```js
  await stat(join(target, "sources/zotero/README.md"));
  await stat(join(target, "sources/zotero/import-log.csv"));
  await stat(join(target, "sources/zotero/collection-map.csv"));
```

After reading `literatureMatrix`, read the ledgers:

```js
  const sourceLedger = await readFile(join(target, "sources/source-ledger.csv"), "utf8");
  assert.match(sourceLedger, /discovery_source/);
  assert.match(sourceLedger, /zotero_item_key/);
  assert.match(sourceLedger, /zotero_attachment_path/);
  const citationAudit = await readFile(join(target, "sources/bib/citation-audit.csv"), "utf8");
  assert.match(citationAudit, /zotero_item_key/);
  assert.match(citationAudit, /zotero_exported_bib_key/);
  assert.match(citationAudit, /reconciliation_status/);
  const zoteroImportLog = await readFile(join(target, "sources/zotero/import-log.csv"), "utf8");
  assert.match(zoteroImportLog, /^import_id,imported_on,zotero_collection_key,zotero_collection_name,zotero_item_key,zotero_item_type,title,attachment_path,exported_bib_key,source_id,reconciliation_status,notes/m);
  const zoteroCollectionMap = await readFile(join(target, "sources/zotero/collection-map.csv"), "utf8");
  assert.match(zoteroCollectionMap, /^collection_key,collection_name,zotero_parent_key,scope,source_set,status,last_imported_on,notes/m);
```

- [ ] **Step 2: Add doctor assertions for Zotero headers**

In `doctorProject reports broken configs and research ledger headers`, add:

```js
  await writeFile(join(target, "sources/zotero/import-log.csv"), "import_id,zotero_item_key\n", "utf8");
```

Then assert:

```js
  assert.ok(result.errors.some((error) => error.includes("sources/zotero/import-log.csv missing column imported_on")));
```

- [ ] **Step 3: Add update migration assertion for user-owned CSV headers**

Add a new test after the workflow config update migration test:

```js
test("updateProject adds missing Zotero ledgers and appends missing bibliography columns conservatively", async () => {
  const root = await mkdtemp(join(tmpdir(), "academic-update-zotero-contract-"));
  const target = join(root, "update-zotero-contract-project");
  await createProject({
    target,
    title: "Update Zotero Contract Project",
    preset: "minimal",
    installSkills: false
  });

  await rm(join(target, "sources/zotero"), { recursive: true, force: true });
  await writeFile(
    join(target, "sources/source-ledger.csv"),
    "source_id,type,title\ns1,paper,Existing Source\n",
    "utf8"
  );
  await writeFile(
    join(target, "sources/bib/citation-audit.csv"),
    "citation_key,status,issue\nsmith2024,ok,\n",
    "utf8"
  );

  const dryRun = await updateProject(target, { apply: false });
  assert.ok(dryRun.changes.some((change) => change.path === "sources/zotero/import-log.csv" && change.action === "create"));
  assert.ok(dryRun.changes.some((change) => change.path === "sources/source-ledger.csv" && change.action === "update"));

  await updateProject(target, { apply: true });
  const sourceLedger = await readFile(join(target, "sources/source-ledger.csv"), "utf8");
  const citationAudit = await readFile(join(target, "sources/bib/citation-audit.csv"), "utf8");
  const doctor = await doctorProject(target);

  assert.match(sourceLedger, /^source_id,type,title,authors,year,venue,identifiers,raw_path,derived_path,bib_path,status,relevance,evidence_level,quality_notes,added_on,last_checked,discovery_source,zotero_item_key,zotero_attachment_path,notes/m);
  assert.match(sourceLedger, /^s1,paper,Existing Source,/m);
  assert.match(citationAudit, /^citation_key,status,issue,source_id,claim_or_location,expected_fix,checked_on,zotero_item_key,zotero_exported_bib_key,reconciliation_status,notes/m);
  assert.match(citationAudit, /^smith2024,ok,/m);
  await stat(join(target, "sources/zotero/import-log.csv"));
  await stat(join(target, "sources/zotero/collection-map.csv"));
  assert.equal(doctor.ok, true);
});
```

- [ ] **Step 4: Add workflow literature assertion**

In `academic-research workflow literature configures a practical SOTA stack`, add:

```js
  assert.match(workflow.stdout, /optional_zotero\tlocal-library enrichment; reconcile through sources\/zotero\/import-log\.csv and sources\/source-ledger\.csv/);
```

- [ ] **Step 5: Run RED**

Run:

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs tests/capabilities.test.mjs
```

Expected: FAIL because Zotero ledgers, columns, doctor validation, migration, and workflow output are missing.

---

## Task 2: Add Templates And Docs

**Files:**

- Create: `template/sources/zotero/README.md`
- Create: `template/sources/zotero/import-log.csv`
- Create: `template/sources/zotero/collection-map.csv`
- Modify: `template/sources/source-ledger.csv`
- Modify: `template/sources/bib/citation-audit.csv`
- Modify: `template/docs/agent/research-workflow.md`
- Modify: `template/AGENTS.md`
- Modify: `template/README.md`
- Modify: `template/docs/getting-started.md`
- Modify: `template/tests/test_project_structure.py`

- [ ] **Step 1: Add Zotero ledger templates**

Use these exact headers:

```csv
import_id,imported_on,zotero_collection_key,zotero_collection_name,zotero_item_key,zotero_item_type,title,attachment_path,exported_bib_key,source_id,reconciliation_status,notes
```

```csv
collection_key,collection_name,zotero_parent_key,scope,source_set,status,last_imported_on,notes
```

- [ ] **Step 2: Add source and citation columns**

Use:

```csv
source_id,type,title,authors,year,venue,identifiers,raw_path,derived_path,bib_path,status,relevance,evidence_level,quality_notes,added_on,last_checked,discovery_source,zotero_item_key,zotero_attachment_path,notes
```

and:

```csv
citation_key,status,issue,source_id,claim_or_location,expected_fix,checked_on,zotero_item_key,zotero_exported_bib_key,reconciliation_status,notes
```

- [ ] **Step 3: Add doc wording**

Docs must state:

- Zotero is optional local-library enrichment.
- Zotero is not the source of truth.
- Every Zotero item must reconcile to `sources/source-ledger.csv`, `sources/bib/references.bib`, `sources/bib/citation-audit.csv`, and SOTA linkage before becoming durable evidence.

---

## Task 3: Implement Doctor And Update Migration

**Files:**

- Modify: `src/project.ts`

- [ ] **Step 1: Add required CSV headers**

Add required columns to `REQUIRED_CSV_COLUMNS` for:

- `sources/source-ledger.csv`
- `sources/bib/citation-audit.csv`
- `sources/zotero/import-log.csv`
- `sources/zotero/collection-map.csv`

- [ ] **Step 2: Add user-owned managed specs**

Add `sources/zotero/README.md`, `sources/zotero/import-log.csv`, and `sources/zotero/collection-map.csv` to `managedFileSpecs` with policy `user-owned`.

- [ ] **Step 3: Add required doctor files**

Add the three Zotero files to the `doctorProject` required array.

- [ ] **Step 4: Add conservative header migration**

Implement `updateProjectDelimitedHeaders` and call it from `updateProject` before `managedFileSpecs`. It should:

- read each CSV/TSV if it exists;
- append missing required columns to the header in declared order;
- append empty cells to existing non-empty data rows for each missing column;
- push `{ path, action: "update" }` on dry-run/apply;
- write only when `apply` is true.

---

## Task 4: Update Workflow Literature Output

**Files:**

- Modify: `src/cli.ts`

- [ ] **Step 1: Print optional Zotero guidance**

After `mcp_selected`, print:

```ts
  console.log("optional_zotero\tlocal-library enrichment; reconcile through sources/zotero/import-log.csv and sources/source-ledger.csv");
```

Do not add Zotero to `literatureServers`.

---

## Task 5: Verify, Review, Commit, Push

- [ ] **Step 1: Run focused tests**

```bash
npm test -- tests/create.test.mjs tests/cli.test.mjs tests/capabilities.test.mjs
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Run full tests**

```bash
npm test
```

- [ ] **Step 4: Self-review**

```bash
rg -n "TB[D]|T[O]DO|FIX[M]E|fill[[:space:]-]+in" template/sources/zotero template/docs/agent/research-workflow.md template/AGENTS.md template/README.md template/docs/getting-started.md
git diff --check
git status --short --untracked-files=all
```

- [ ] **Step 5: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-08-epic-1-bibliography-zotero-contract-implementation-plan.md src/project.ts src/cli.ts template tests
git commit -m "feat: add zotero bibliography contract"
git push
```

## Acceptance Criteria

- New projects include `sources/zotero/README.md`, `import-log.csv`, and `collection-map.csv`.
- Doctor validates Zotero ledger headers.
- `updateProject` creates missing Zotero ledgers and appends missing bibliography columns without dropping existing row values.
- `workflow literature` names Zotero as optional enrichment and keeps the default selected MCP stack unchanged.
- `npm run lint` passes.
- `npm test` passes.
