export interface McpServerSpec {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

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
    env: { SEMANTIC_SCHOLAR_API_KEY: "${SEMANTIC_SCHOLAR_API_KEY}" }
  },
  { id: "dblp", command: "uvx", args: ["mcp-dblp"] }
];

// overleaf is manual-setup only: documented in the generated README,
// never written to .mcp.json by the wizard.
const OPTIONAL: Record<string, McpServerSpec | null> = {
  openalex: {
    id: "openalex",
    command: "npx",
    args: ["-y", "@cyanheads/openalex-mcp-server@latest"],
    env: { OPENALEX_API_KEY: "${OPENALEX_API_KEY}" }
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
  if (!spec.env) return { command: spec.command, args: spec.args };
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
