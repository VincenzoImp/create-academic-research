# Security Policy

Do not put API keys, cookies, Overleaf tokens, browser sessions, private
reviewer material, or restricted datasets in generated project files.

Generated projects keep secrets out of git: `.mcp.json` references
credentials through `${VAR}` environment expansion, `.env.example` is a
documentation-only placeholder file, and filled `.env*` files are
gitignored.

Report vulnerabilities through a private security advisory or by contacting
the repository owner before public disclosure.
