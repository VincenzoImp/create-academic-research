export interface McpServerSpec {
  id: string;
  command: string;
  args: string[];
  // API-key variables this server reads from the project .env. When non-empty,
  // the server is launched through the .env-sourcing prologue (see toEntry).
  envKeys?: string[];
}

// Always-on: every SOTA MCP that does not strictly require an API key, so the
// SOTA workflow (searching + digesting) has all of them active. Where a server
// can use a key it is an optional rate-limit/source boost read from .env (see
// toEntry), never a requirement.
export const ALWAYS_ON: McpServerSpec[] = [
  {
    id: "arxiv",
    command: "uvx",
    args: ["--from", "arxiv-mcp-server[pdf]", "arxiv-mcp-server"]
  },
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
  {
    id: "openalex",
    command: "npx",
    args: ["-y", "@cyanheads/openalex-mcp-server@latest"],
    envKeys: ["OPENALEX_API_KEY"]
  },
  // paper-search: multi-source discovery aggregator. Its Sci-Hub (last-resort
  // full-text fallback) and Google Scholar (no API -> scrapes via a proxy)
  // connectors are opt-in and off by default; enable them via .env if you choose.
  {
    id: "paper-search",
    command: "uvx",
    args: ["paper-search-mcp"],
    envKeys: ["PAPER_SEARCH_MCP_UNPAYWALL_EMAIL"]
  }
];

// Opt-in (written only when selected): zotero needs the Zotero desktop app +
// one-time `zoty setup`; overleaf needs an OVERLEAF_TOKEN and a local clone
// (manual — never written to .mcp.json by the wizard).
const OPTIONAL: Record<string, McpServerSpec | null> = {
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
