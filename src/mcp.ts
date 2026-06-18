export interface McpServerSpec {
  id: string;
  command: string;
  args: string[];
  // API-key variables this server reads from the project .env. When non-empty,
  // the server is launched through the .env-sourcing prologue (see toEntry).
  envKeys?: string[];
}

// Always-on: every SOTA MCP that runs via uvx without a required API key, so the
// SOTA workflow (searching + digesting) has them all active with NO Node
// dependency. Where a server can use a key it is an optional rate-limit/source
// boost read from .env (see toEntry), never a requirement. (openalex is opt-in
// below because its server needs Node; paper-search already covers OpenAlex.)
export const ALWAYS_ON: McpServerSpec[] = [
  {
    id: "arxiv",
    command: "uvx",
    args: ["--from", "arxiv-mcp-server[pdf]", "arxiv-mcp-server"]
  },
  // semantic-scholar: akapet00's server is the richest one (14 tools incl. the
  // citation graph + export_bibtex) and the workflow's primary identity/citation
  // source. It is git-only (not on PyPI, no release tags), so it is referenced by
  // repo rather than a pinned version. The PyPI packages named "semantic-scholar-
  // mcp" are different, narrower servers — do not swap to "fix" the git URL.
  {
    id: "semantic-scholar",
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/akapet00/semantic-scholar-mcp",
      "semantic-scholar-mcp"
    ],
    envKeys: ["SEMANTIC_SCHOLAR_API_KEY"]
  },
  { id: "dblp", command: "uvx", args: ["mcp-dblp"] },
  // paper-search: multi-source discovery aggregator (also queries OpenAlex). Its
  // Sci-Hub (last-resort full-text fallback) and Google Scholar (no API ->
  // scrapes via a proxy) connectors are opt-in and off by default; enable them
  // via .env if you choose.
  {
    id: "paper-search",
    command: "uvx",
    args: ["paper-search-mcp"],
    envKeys: ["PAPER_SEARCH_MCP_UNPAYWALL_EMAIL"]
  }
];

// Opt-in (written only when selected). openalex's only comprehensive servers run
// via Node (npx), so it is opt-in to keep the default stack Node-free — OpenAlex
// is still reachable through the always-on paper-search. zotero needs the Zotero
// desktop app + one-time `zoty setup`; overleaf needs an OVERLEAF_TOKEN and a
// local clone (manual — never written to .mcp.json by the wizard).
const OPTIONAL: Record<string, McpServerSpec | null> = {
  openalex: {
    id: "openalex",
    command: "npx",
    args: ["-y", "@cyanheads/openalex-mcp-server@latest"],
    envKeys: ["OPENALEX_API_KEY"]
  },
  zotero: { id: "zotero", command: "uvx", args: ["zoty", "mcp"] },
  overleaf: null
};

export const OPTIONAL_IDS = Object.keys(OPTIONAL);

// API keys live in the project's gitignored .env. `${VAR}` expansion inside
// .mcp.json reads the MCP client's own environment, and Claude Code does not
// auto-load .env — so a key placed in .env never reaches the server that way.
// Instead, every server that declares an env key is launched through a tiny
// POSIX-sh prologue that sources .env (when present) before exec, passing the
// real command and args positionally (`"$@"`) so the shell never re-parses
// them. Keys stay in .env: never committed, never globally exported. Keyless
// servers (arxiv, dblp) launch directly.
const ENV_PROLOGUE = 'set -a; [ -f .env ] && . ./.env; set +a; exec "$@"';

function toEntry(spec: McpServerSpec): Record<string, unknown> {
  if (!spec.envKeys?.length) return { command: spec.command, args: spec.args };
  return {
    command: "sh",
    args: ["-c", ENV_PROLOGUE, "sh", spec.command, ...spec.args]
  };
}

export function renderMcpJson(optionalIds: string[]): string {
  const servers: Record<string, unknown> = {};
  for (const spec of ALWAYS_ON) servers[spec.id] = toEntry(spec);
  for (const id of optionalIds) {
    const spec = OPTIONAL[id];
    if (spec) servers[spec.id] = toEntry(spec);
  }
  return JSON.stringify({ mcpServers: servers }, null, 2) + "\n";
}
