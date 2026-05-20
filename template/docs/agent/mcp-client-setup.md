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
npx academic-research mcp env --dotenv --all > .env.example
```

Create a private local file when needed:

```bash
cp .env.example .env.local
```

Do not commit filled `.env`, `.env.local`, tokens, cookies, or browser sessions.
`mcp doctor` checks the current process environment; it does not automatically
load `.env.local`.

## Workflow

1. Enable only the MCP servers needed for the current research task.
2. Inspect prerequisites with `npx academic-research mcp env <server>`.
3. Put required secrets in the MCP client secret store, shell, or `.env.local`.
4. Run `npx academic-research mcp smoke` before wiring the client.
5. Load the generated snippet in the MCP client.
6. Treat MCP output as retrieval metadata until it is ingested into repository
   source records.
