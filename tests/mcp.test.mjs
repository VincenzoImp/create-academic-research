import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpJson, OPTIONAL_IDS } from "../dist/src/mcp.js";

test("always-on servers present with no optionals", () => {
  const cfg = JSON.parse(renderMcpJson([]));
  assert.deepEqual(Object.keys(cfg.mcpServers).sort(), ["arxiv", "dblp", "semantic-scholar"]);
  assert.equal(
    cfg.mcpServers["semantic-scholar"].env.SEMANTIC_SCHOLAR_API_KEY,
    "${SEMANTIC_SCHOLAR_API_KEY}"
  );
  assert.equal(cfg.mcpServers.arxiv.command, "uvx");
});

test("openalex and zotero are added when selected; overleaf never writes an entry", () => {
  const cfg = JSON.parse(renderMcpJson(["openalex", "zotero", "overleaf"]));
  assert.equal(cfg.mcpServers.openalex.env.OPENALEX_API_KEY, "${OPENALEX_API_KEY}");
  assert.deepEqual(cfg.mcpServers.zotero.args, ["zoty", "mcp"]);
  assert.equal(cfg.mcpServers.overleaf, undefined);
});

test("OPTIONAL_IDS lists the wizard's multi-select options in order", () => {
  assert.deepEqual(OPTIONAL_IDS, ["openalex", "zotero", "overleaf"]);
});
