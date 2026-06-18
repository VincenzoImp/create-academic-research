import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpJson, OPTIONAL_IDS } from "../dist/src/mcp.js";

test("always-on servers present with no optionals (uvx-only, no Node)", () => {
  const cfg = JSON.parse(renderMcpJson([]));
  assert.deepEqual(
    Object.keys(cfg.mcpServers).sort(),
    ["arxiv", "dblp", "paper-search", "semantic-scholar"]
  );
  // every always-on server ultimately runs via uvx (no Node): either uvx
  // directly, or `sh -c <prologue> sh uvx …` for the .env-sourcing wrapper
  for (const id of Object.keys(cfg.mcpServers)) {
    const s = cfg.mcpServers[id];
    const realCmd = s.command === "sh" ? s.args[3] : s.command;
    assert.equal(realCmd, "uvx", `${id} must run via uvx (no Node)`);
  }

  // keyless servers launch directly
  assert.equal(cfg.mcpServers.arxiv.command, "uvx");
  assert.equal(cfg.mcpServers.dblp.command, "uvx");

  // servers that read an optional key from .env go through the .env-sourcing
  // prologue, with the real command passed positionally; no ${VAR} env block
  for (const id of ["semantic-scholar", "paper-search"]) {
    const s = cfg.mcpServers[id];
    assert.equal(s.command, "sh", id);
    assert.equal(s.args[0], "-c", id);
    assert.ok(s.args[1].includes(". ./.env"), id);
    assert.ok(s.args[1].includes('exec "$@"'), id);
    assert.equal(s.args[2], "sh", id);
    assert.equal(s.env, undefined, id);
  }
});

test("openalex and zotero are added when selected; overleaf never writes an entry", () => {
  const cfg = JSON.parse(renderMcpJson(["openalex", "zotero", "overleaf"]));

  // openalex is opt-in (Node via npx) and reads its key from .env -> wrapped
  const oa = cfg.mcpServers.openalex;
  assert.equal(oa.command, "sh");
  assert.deepEqual(oa.args.slice(2), ["sh", "npx", "-y", "@cyanheads/openalex-mcp-server@latest"]);
  assert.equal(oa.env, undefined);

  // zotero declares no key -> launches directly
  assert.equal(cfg.mcpServers.zotero.command, "uvx");
  assert.deepEqual(cfg.mcpServers.zotero.args, ["zoty", "mcp"]);

  assert.equal(cfg.mcpServers.overleaf, undefined);
});

test("OPTIONAL_IDS lists the wizard's multi-select options in order", () => {
  assert.deepEqual(OPTIONAL_IDS, ["openalex", "zotero", "overleaf"]);
});
