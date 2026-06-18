import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpJson, OPTIONAL_IDS } from "../dist/src/mcp.js";

test("always-on servers present with no optionals", () => {
  const cfg = JSON.parse(renderMcpJson([]));
  assert.deepEqual(
    Object.keys(cfg.mcpServers).sort(),
    ["arxiv", "dblp", "openalex", "paper-search", "semantic-scholar"]
  );

  // keyless servers launch directly
  assert.equal(cfg.mcpServers.arxiv.command, "uvx");
  assert.equal(cfg.mcpServers.dblp.command, "uvx");

  // servers that read an optional key from .env are launched through the
  // .env-sourcing prologue, with the real command passed positionally so the
  // shell never re-parses it; no ${VAR} env block is emitted
  for (const id of ["semantic-scholar", "openalex", "paper-search"]) {
    const s = cfg.mcpServers[id];
    assert.equal(s.command, "sh", id);
    assert.equal(s.args[0], "-c", id);
    assert.ok(s.args[1].includes(". ./.env"), id);
    assert.ok(s.args[1].includes('exec "$@"'), id);
    assert.equal(s.args[2], "sh", id);
    assert.equal(s.env, undefined, id);
  }
  assert.deepEqual(cfg.mcpServers["paper-search"].args.slice(2), ["sh", "uvx", "paper-search-mcp"]);
});

test("zotero is added when selected; overleaf never writes an entry", () => {
  const cfg = JSON.parse(renderMcpJson(["zotero", "overleaf"]));
  // zotero declares no key -> launches directly
  assert.equal(cfg.mcpServers.zotero.command, "uvx");
  assert.deepEqual(cfg.mcpServers.zotero.args, ["zoty", "mcp"]);
  assert.equal(cfg.mcpServers.overleaf, undefined);
});

test("OPTIONAL_IDS lists the wizard's multi-select options in order", () => {
  assert.deepEqual(OPTIONAL_IDS, ["zotero", "overleaf"]);
});
