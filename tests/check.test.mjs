import assert from "node:assert/strict";
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const TEMPLATE = new URL("../template", import.meta.url).pathname;
const BIB_MARKER = "% =========================== WHITELIST ===========================";

const VALID_METADATA = `citekey: qin2022quantifying
title: Quantifying Blockchain Extractable Value
authors: [Kaihua Qin]
year: 2022
venue: IEEE S&P
doi: 10.1109/SP46214.2022.9833734
arxiv: "2101.05511"
pdf_source: https://arxiv.org/pdf/2101.05511
status: digested
tags: [mev]
verified:
  bib_source: dblp
  record: https://dblp.org/rec/conf/sp/QinZG22
  citation_graph_source: semantic-scholar
  s2_id: abc123
  date: 2026-06-11
cites: []
cited_by: []
`;

async function freshProject() {
  const root = await mkdtemp(join(tmpdir(), "check-"));
  const target = join(root, "proj");
  cpSync(TEMPLATE, target, { recursive: true });
  return target;
}

function runCheck(target) {
  return spawnSync("python3", [join(target, "scripts", "check.py")], {
    encoding: "utf8"
  });
}

function addPaperFolder(target, metadata = VALID_METADATA) {
  const dir = join(target, "sota", "papers", "qin2022quantifying");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "paper.pdf"), "%PDF-fake");
  writeFileSync(join(dir, "synthesis.md"), "# Quantifying BEV (qin2022quantifying)\n");
  writeFileSync(join(dir, "metadata.yaml"), metadata);
  return dir;
}

function addBibAndIndex(target) {
  const bibPath = join(target, "references.bib");
  const entry = "@inproceedings{qin2022quantifying,\n  title={Quantifying},\n  year={2022}\n}\n";
  writeFileSync(bibPath, readFileSync(bibPath, "utf8").replace(BIB_MARKER, entry + "\n" + BIB_MARKER));
  appendFileSync(
    join(target, "sota", "index.md"),
    "| qin2022quantifying | Quantifying BEV | 2022 | IEEE S&P | mev | digested |\n"
  );
}

test("fresh template passes check.py", async () => {
  const target = await freshProject();
  const r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("paper folder without bib entry and index row fails 1:1:1", async () => {
  const target = await freshProject();
  addPaperFolder(target);
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /references\.bib/);
  assert.match(r.stderr, /index\.md/);
});

test("complete digested paper passes; missing verified block fails", async () => {
  const target = await freshProject();
  const dir = addPaperFolder(target);
  addBibAndIndex(target);
  let r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  writeFileSync(
    join(dir, "metadata.yaml"),
    VALID_METADATA.replace("verified:", "unverified:")
  );
  r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /verified/);
});

test("whitelisted bib entries need no SOTA folder", async () => {
  const target = await freshProject();
  appendFileSync(
    join(target, "references.bib"),
    "\n@software{foundry2023,\n  title={Foundry}\n}\n"
  );
  const r = runCheck(target);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("coverage citekey not in SOTA fails", async () => {
  const target = await freshProject();
  appendFileSync(join(target, "survey", "coverage.md"), "\n- ghost2020paper\n");
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /coverage/);
});

test("contribution without report fails; _template is skipped", async () => {
  const target = await freshProject();
  mkdirSync(join(target, "contributions", "my-analysis"), { recursive: true });
  writeFileSync(join(target, "contributions", "my-analysis", "README.md"), "# x\n");
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /my-analysis/);
});

test("missing survey.pdf fails the PDF rule", async () => {
  const target = await freshProject();
  rmSync(join(target, "survey", "survey.pdf"), { force: true });
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /survey\.pdf/);
});

test("placeholder-only identifiers are rejected", async () => {
  const target = await freshProject();
  const meta = VALID_METADATA
    .replace("doi: 10.1109/SP46214.2022.9833734", "doi: ...")
    .replace('arxiv: "2101.05511"', "arxiv: ...")
    .replace("  record: https://dblp.org/rec/conf/sp/QinZG22", "  record: ...")
    .replace("  s2_id: abc123", "  s2_id: ...");
  addPaperFolder(target, meta);
  addBibAndIndex(target);
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /resolvable identifier/);
});

test("malformed index rows are flagged", async () => {
  const target = await freshProject();
  appendFileSync(join(target, "sota", "index.md"), "| only | four | cells | here |\n");
  const r = runCheck(target);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /malformed row/);
});
