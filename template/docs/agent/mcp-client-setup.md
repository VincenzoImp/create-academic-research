# MCP Client Setup

Generated MCP snippets live in `docs/agent/generated/`. They are client-ready
configuration fragments, not live tools by themselves. The active MCP client
must load the generated snippet and must receive any required environment
variables from the shell, a local untracked env file, or the client's secret
store.

## Files

- `docs/agent/generated/mcp.json`: generic/default generated snippet.
- `docs/agent/generated/<agent>-mcp.json`: generated when a specific agent is
  selected.
- `.env.example`: committed reference for MCP environment variables.
- `.env.local`: recommended local untracked file for filled secrets.

## Environment

Regenerate the committed reference from the current MCP catalog with:

```bash
npx academic-research mcp env --write .env.example --all
```

Create a private local file when needed:

```bash
cp .env.example .env.local
```

Do not commit filled `.env`, `.env.local`, tokens, cookies, or browser sessions.
`mcp doctor`, `mcp smoke`, and `mcp probe` check the current process
environment unless you explicitly pass `--env-file .env.local`.

```bash
npx academic-research mcp doctor --env-file .env.local
npx academic-research mcp smoke --env-file .env.local
npx academic-research mcp probe arxiv --timeout-ms 5000
```

## Client Notes

For Codex, Claude Code, Cursor, or another MCP client, load the generated
snippet that matches the active agent target:

- `docs/agent/generated/mcp.json` for the universal/default target.
- `docs/agent/generated/codex-mcp.json` when the project was created with
  `--agent codex`.
- `docs/agent/generated/claude-code-mcp.json` when using Claude Code.
- `docs/agent/generated/cursor-mcp.json` when using Cursor.

The generated snippet is project documentation until the client loads it. If a
client has its own secret store, prefer that store for API keys and tokens. If
the client inherits shell environment variables, start it from a shell where the
required variables are already exported.

## Workflow

1. Enable only the MCP servers needed for the current research task.
2. Inspect prerequisites with `npx academic-research mcp env <server>`.
3. Put required secrets in the MCP client secret store, shell, or `.env.local`.
4. Run `npx academic-research mcp smoke --env-file .env.local`.
5. Run `npx academic-research mcp probe <server>` only when you want to start
   the server and verify a real stdio handshake.
6. Load the generated snippet in the MCP client.
7. Treat MCP output as retrieval metadata until it is ingested into repository
   source records.
