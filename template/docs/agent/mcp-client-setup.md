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
npm run mcp:dotenv
```

Create a private local file when needed:

```bash
cp .env.example .env.local
```

Do not commit filled `.env`, `.env.local`, tokens, cookies, or browser sessions.
`mcp doctor`, `mcp smoke`, and `mcp probe` check the current process
environment unless you explicitly pass `--env-file .env.local`.

```bash
npm run mcp:status
npm run mcp:doctor -- --env-file .env.local
npm run mcp:smoke -- --env-file .env.local
npm run mcp:probe -- arxiv --timeout-ms 5000
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

Codex registration can be automated for servers with a generated command or
hosted URL:

```bash
npm run mcp:client:add -- overleaf --agent codex
npm run mcp:client:remove -- overleaf --agent codex
```

Use `--dry-run` to print the exact `codex mcp add` or `codex mcp remove`
command without changing Codex config. Secrets are not written to Codex config;
credentialed local integrations should use a wrapper that loads `.env.local` at
runtime. Overleaf client registration is intentionally blocked until
`npm run mcp:setup -- overleaf --mode local --env-file .env.local` has created
the wrapper and recorded non-secret setup facts.

Custom remote endpoints may use a stored URL or a URL env var name. Bearer token
support stores only the token env var name. Codex automatic registration
supports stored URL mode because Codex has `--url`:

```bash
npm run mcp:enable -- openalex --mode remote-custom --url https://example.com/mcp --bearer-token-env-var OPENALEX_MCP_TOKEN
```

If the endpoint URL is kept in an env var with `--url-env`, automatic Codex
registration is not available because the Codex CLI currently has no
`--url-env` option. Either re-enable the server with `--url <url>` if the
endpoint URL may be stored in Codex config, or manually register it from a shell
where the env var is set:

```bash
codex mcp add openalex --url "$OPENALEX_MCP_URL"
```

Claude Code, Cursor, and other clients may still require manual registration.
Use `npm run mcp:status` to see whether the selected server has a generated
snippet, a supported client registration path, and the next setup action.

## Workflow

1. Enable only the MCP servers needed for the current research task.
2. Inspect prerequisites with `npm run mcp:env -- <server>`.
3. Put required secrets in the MCP client secret store, shell, or `.env.local`.
4. Run `npm run mcp:smoke -- --env-file .env.local`.
5. Run `npm run mcp:status`.
6. Register the selected server with the active client, or load the generated
   snippet manually.
7. Run `npm run mcp:probe -- <server>` only when you want to start
   the server and verify a real stdio handshake.
8. Treat MCP output as retrieval metadata until it is ingested into repository
   source records.
