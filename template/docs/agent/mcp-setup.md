# MCP Setup

Record active MCP servers, install commands, auth requirements, smoke tests,
and known risks here.

Use `.env.example` as the committed environment reference. Put filled values in
`.env.local`, the shell, or the MCP client secret store. Regenerate the example
with `npm run mcp:dotenv`.

Use `npm run mcp:doctor -- --env-file .env.local` when you want the CLI to read
an explicit local env file. Use `npm run mcp:probe -- <server>` only when you
want to start a selected MCP server and verify a real stdio handshake.

Use `npm run mcp:modes` to see what each integration supports. Use
`npm run mcp:status` to distinguish selected project records from operational
readiness. Default status uses friendly labels such as ready, not selected,
setup needed, missing env, probe needed, probe failed, local, remote, requires
local app, and manual setup.
Use `npm run mcp:status -- --verbose` when you need technical mode names,
snippet state, client registration state, and probe details.

`configs/capabilities.yaml` records intended project capability state.
`docs/agent/capability-lock.json` records non-secret observed setup facts for
MCP setup/client/probe actions and project-local skill operations. The scaffold
manifest at `.academic-research/managed-files.json` records non-secret
checksums used by `npm run update` to avoid overwriting local edits.

Mode labels:

- local: your machine runs the MCP server when the client needs it.
- remote: your client connects to an existing hosted MCP endpoint.
- custom remote: you provide the endpoint.
- requires local app: another app must be running, such as Zotero Desktop.
- manual setup: guided setup is required before client registration.

OpenAlex and PubMed support explicit local and remote modes:

```bash
npm run mcp:enable -- openalex --mode remote
npm run mcp:enable -- pubmed --mode local
```

Advanced custom remote endpoints are non-secret project facts. Store only the
URL or the env var name that contains the URL. Store token env var names, never
token values:

```bash
npm run mcp:enable -- openalex --mode remote-custom --url https://example.com/mcp
npm run mcp:enable -- openalex --mode remote-custom --url-env OPENALEX_MCP_URL --bearer-token-env-var OPENALEX_MCP_TOKEN
```

Codex automatic registration supports stored URL mode with `--url`. If the URL
is kept in an env var with `--url-env`, automatic Codex registration is not
available because the Codex CLI currently has no `--url-env` option. Manually
register from a shell where the env var is set, or re-enable with `--url <url>`
if the endpoint URL may be stored in Codex config.

`mcp smoke` checks custom remote URL env vars without launching a local server.
`mcp probe` does not perform network probes for remote endpoints; it reports a
remote configured status when the required endpoint configuration is present.
If you use `--mode remote-custom` without `--url` or `--url-env`, smoke and
probe report `missing-remote-url`.

Overleaf is a manual-local integration. Keep secrets in `.env.local`, then run
the setup command to create a local wrapper and non-secret capability lock:

```bash
npm run mcp:env -- overleaf --dotenv
npm run mcp:setup -- overleaf --mode local --env-file .env.local
npm run mcp:client:add -- overleaf --agent codex --dry-run
npm run mcp:probe -- overleaf --env-file .env.local
```

After a scaffold update, the friendlier project setup command can run the same
project-local Overleaf setup when the env file is present:

```bash
npm run setup -- --env-file .env.local
```

This may create ignored files under `.academic-research/mcp/` and refresh the
generated MCP snippet. It does not run `codex mcp add`; client registration
stays explicit.
