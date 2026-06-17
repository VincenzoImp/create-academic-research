import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpJson, OPTIONAL_IDS } from "../dist/src/mcp.js";

test("always-on servers present with no optionals", () => {
  const cfg = JSON.parse(renderMcpJson([]));
  assert.deepEqual(Object.keys(cfg.mcpServers).sort(), ["arxiv", "dblp", "semantic-scholar"]);

  // keyless servers launch directly
  assert.equal(cfg.mcpServers.arxiv.command, "uvx");
  assert.equal(cfg.mcpServers.dblp.command, "uvx");

  // a server that needs a key is launched through the .env-sourcing prologue,
  // with the real command passed positionally so the shell never re-parses it
  const ss = cfg.mcpServers["semantic-scholar"];
  assert.equal(ss.command, "sh");
  assert.equal(ss.args[0], "-c");
  assert.ok(ss.args[1].includes(". ./.env"));
  assert.ok(ss.args[1].includes('exec "$@"'));
  assert.deepEqual(ss.args.slice(2), [
    "sh",
    "uvx",
    "--from",
    "git+https://github.com/akapet00/semantic-scholar-mcp",
    "semantic-scholar-mcp"
  ]);
  // no ${VAR} env block is emitted anymore — keys arrive via .env
  assert.equal(ss.env, undefined);
});

test("openalex and zotero are added when selected; overleaf never writes an entry", () => {
  const cfg = JSON.parse(renderMcpJson(["openalex", "zotero", "overleaf"]));

  // openalex needs a key -> wrapped in the .env-sourcing prologue
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
