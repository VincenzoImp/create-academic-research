# MCP Setup

Record active MCP servers, install commands, auth requirements, smoke tests,
and known risks here.

Use `.env.example` as the committed environment reference. Put filled values in
`.env.local`, the shell, or the MCP client secret store. Regenerate the example
with `npx academic-research mcp env --write .env.example --all`.

Use `npx academic-research mcp doctor --env-file .env.local` when you want the
CLI to read an explicit local env file. Use `npx academic-research mcp probe
<server>` only when you want to start a selected MCP server and verify a real
stdio handshake.
