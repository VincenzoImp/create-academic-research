# Create Academic Research

[![npm](https://img.shields.io/npm/v/create-academic-research)](https://www.npmjs.com/package/create-academic-research)
[![Validate](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml/badge.svg)](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml)
[![Release](https://github.com/VincenzoImp/create-academic-research/actions/workflows/release.yml/badge.svg)](https://github.com/VincenzoImp/create-academic-research/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Create agent-ready academic research repositories with one command.

`create-academic-research` scaffolds a serious research workspace: source
ledgers, SOTA files, citation audit tables, experiment records, reproducibility
docs, durable wiki/log memory, project-local skills, and MCP setup for scholarly
search. The template is discipline-general and especially strong for computer
science research.

## Quickstart

```bash
npm create academic-research@latest my-project
```

Equivalent explicit form:

```bash
npx create-academic-research@latest my-project
```

Prefer the explicit `@latest` form. Some npm/npx versions reuse an older
cached creator when the version is omitted.

From GitHub:

```bash
npx --yes github:VincenzoImp/create-academic-research my-project
```

## What It Creates

| Area | Generated Support |
|---|---|
| Sources | PDFs, derived Markdown, metadata, BibTeX, conversion ledger, source ledger. |
| Literature Review | Search strategy, screening decisions, literature matrix, SOTA synthesis, gaps, PRISMA flow. |
| Agent Memory | `AGENTS.md`, capability profile, MCP setup docs, generated MCP snippets, wiki index/log/templates. |
| Reproducibility | Python package scaffold, tests, experiment registry, autonomous campaign ledgers, output folders, artifact checklist. |
| Skills | Project-local installation flow for `VincenzoImp/academic-research-skills`. |
| MCP | Conservative default records for scholarly discovery plus documented optional integrations. |

The wizard is discipline-general: it creates a clean structure for academic
research projects in any field. Its companion skill stack gives first-class
support to computer science research, including AI/ML, systems, HCI, security,
software engineering, databases, theory, robotics, IR, PL, graphics, and
adjacent interdisciplinary CS.

The generated repository is agent-neutral. By default the wizard records
`agent: universal`, installs one shared project-local `.agents/skills` copy,
and writes generic MCP snippets. Use `--agent <id>` only when you want to force
a specific target recognized by the `skills` CLI. Run
`npm run agents:list` inside a generated project to see every
supported target and alias.

## When To Use It

Use this when starting or cleaning up an academic research project that needs
evidence tracking, literature-review discipline, repeatable experiments, paper
writing support, or LLM-agent collaboration. It is not a paper generator and it
does not replace methodological judgment; it gives the repository enough
structure for serious research work to compound instead of scattering across
chat history, notebooks, PDFs, and ad hoc folders.

## Default Experience

By default, the wizard:

- creates the repository structure;
- installs the project-local `VincenzoImp/academic-research-skills` package;
- enables only the low-friction `arxiv` MCP record;
- documents the wider MCP catalog, including Semantic Scholar, OpenAlex, DBLP,
  PubMed, Zotero, Crossref, Overleaf, and fallback aggregators;
- writes `configs/capabilities.yaml`;
- writes `docs/agent/capability-profile.md`;
- writes `docs/agent/mcp-setup.md`;
- writes `docs/agent/generated/mcp.json` unless an explicit agent target is set;
- includes `scripts/README.md` for repeatable command entrypoints;
- includes reusable `wiki/templates/` pages for sources, claims, experiments,
  decisions, reviewer concerns, and research questions;
- appends the onboarding event to `wiki/log.md`;
- does not install external MCP tools unless explicitly requested.

Use `--preset enhanced` when you also want the curated complementary external
skill bundles for agent engineering, frontend work, testing, document formats,
and PDF conversion.

Research-specific skills are intentionally not pulled from external packages by
default. The academic research workflow, literature review, citation audit,
paper writing, peer review, rebuttal, and reproduction policies come from
`VincenzoImp/academic-research-skills`. External skills installed by the wizard
are complementary tooling only.

## Non-Interactive Create

```bash
npx create-academic-research@latest my-project --yes
```

For CI or local testing without installing skills:

```bash
npx create-academic-research@latest my-project --yes --no-install-skills
```

## Project Lifecycle

Inside a generated project:

```bash
npm run doctor
npm run update
npm run update -- --apply
npm run setup -- --env-file .env.local
npm run workflow:literature
npm run rename -- --title "New Title" --slug new-title --package new_title
npm run agents:list
npm run skills:presets
npm run skills:install
npm run skills:install -- --preset enhanced
npm run skills:install -- source-ingestion sota-literature-review
npm run skills:list
npm run skills:status
npm run skills:remove -- source-ingestion
npm run skills:uninstall -- source-ingestion
npm run skills:update
npm run mcp:list
npm run mcp:modes
npm run mcp:enabled
npm run mcp:available
npm run mcp:commands -- arxiv
npm run mcp:env -- openalex semantic-scholar zotero
npm run mcp:env -- --dotenv --all > .env.example
npm run mcp:dotenv
npm run mcp:enable -- arxiv dblp
npm run mcp:disable -- arxiv
npm run mcp:install -- arxiv
npm run mcp:uninstall -- arxiv
npm run mcp:smoke -- --env-file .env.local
npm run mcp:doctor -- --env-file .env.local
npm run mcp:probe -- arxiv --timeout-ms 5000
```

For direct one-off invocation without the generated package scripts, use
`npx --yes --package create-academic-research@latest academic-research <command>`.

## Command Model

`academic-research update` is a dry-run by default. It reports managed project
files that would change and writes them only with `--apply`.
Generated projects intentionally keep `npm run update` on
`create-academic-research@latest` so one command can preview migrations from an
older scaffold. Other lifecycle scripts use the package version recorded in the
project dev dependency for reproducibility.

```bash
npm run update
npm run update -- --apply
```

Very old projects may still have a pinned `update` script. Use the latest
generator directly in that case:

```bash
npm exec --yes --package=create-academic-research@latest -- academic-research update --root .
npm exec --yes --package=create-academic-research@latest -- academic-research update --root . --apply
```

Safe migrations are tracked in `.academic-research/managed-files.json`. The
manifest stores non-secret checksums for generator-owned files. If a file was
edited locally, update reports `skip` instead of overwriting it.

### Migration 0.1.17 -> 0.1.18

Projects created with `0.1.17` can migrate in place:

```bash
npm run update
npm run update -- --apply
npm run doctor
```

The migration adds the project-quality contract, badge evidence ledger, SOTA
reading and citation-chasing ledgers, paper synthesis folders, linear reading
copies, autonomous experiment campaign files, claim-audit and reproduction
templates, and `workflow:literature`. Locally edited managed files are skipped;
new research record templates are created as user-owned where the project is
expected to fill them over time.

`academic-research init` initializes an existing repository without overwriting
existing files. It adds the research contract, merges lifecycle package scripts,
and preserves existing README, `.gitignore`, and custom package scripts.

`academic-research setup` is the friendly post-update recovery command. It
prints the active preset, agent, skill counts, selected MCP records, and next
commands. When you pass `--env-file .env.local`, it may complete safe
project-local setup such as the Overleaf wrapper and generated MCP snippet. It
does not register global MCP clients.

Skills are project-local by default.

| Command | Meaning |
|---|---|
| `skills presets` | List available capability presets. |
| `skills install` | Install project-local skills by preset, or selected skill ids such as `source-ingestion`. This does not change MCP records. |
| `skills list` | List skills found in project-local skill loader directories. |
| `skills status` | Show configured project preset, agent, scope, skill roots, unique skill ids, and installed copies. |
| `skills remove` / `skills uninstall` | Remove selected project-local skills. |
| `skills update` | Update project-local skill copies. |

MCP commands are split by side-effect:

| Command | Meaning |
|---|---|
| `mcp list` | List known MCP servers with enabled/available status. |
| `mcp modes` | Show which servers can run locally, use a hosted endpoint, use a custom endpoint, require a local app, or need manual setup. |
| `mcp status` | Show friendly selected/setup/client/probe readiness and next action for each MCP server. Add `--verbose` for technical lifecycle fields. |
| `mcp enabled` | List only enabled MCP server ids. |
| `mcp available` | List the local MCP catalog. |
| `mcp commands` | Print finite external install commands without running them. Runtime-only `uvx`/`npx` servers may have no install command. |
| `mcp env` | Print required/recommended env vars, hosted endpoints, local prerequisites, and setup commands for selected servers. Use `--dotenv --all` to print dotenv content or `--write .env.example --all` to regenerate `.env.example`. |
| `mcp enable` | Select an MCP server in project records and generated snippets. Use `--mode local`, `--mode remote`, or `--mode remote-custom --url <url>` where supported. |
| `mcp disable` | Remove an MCP server from project records and generated snippets. |
| `mcp setup` | Run or dry-run finite project-local setup for manual-local integrations such as Overleaf, including wrapper and generated snippet refresh. |
| `mcp client add` / `mcp client remove` | Register or remove supported MCP client entries, currently Codex, without writing secrets into client config. |
| `mcp install` | Run finite external tool install commands for selected MCP servers. It must not launch stdio MCP servers. |
| `mcp uninstall` | Run the external uninstall command when one exists. |
| `mcp smoke` | Print non-launching readiness diagnostics for enabled or selected MCP servers. |
| `mcp doctor` | Validate enabled MCP records, generated snippets, required env vars, and documented manual prerequisites. Pass `--env-file .env.local` to read explicit local secrets. |
| `mcp probe` | Opt-in runtime check. Local stdio servers get a JSON-RPC handshake; remote endpoints are reported as configured without a network probe. |

Workflow commands are scenario-level shortcuts over skills and MCP records.
Use `npm run workflow:literature` when starting a serious SOTA, survey, or
related-work pass: it selects a practical literature stack with arXiv, DBLP,
Semantic Scholar, and OpenAlex remote graph search, then prints the next checks.

## Companion Skills

The generated project works best with:

```bash
npx -y skills add VincenzoImp/academic-research-skills --skill '*' --copy -y
```

The create wizard can install that project-local package automatically.
Those skills are portable `SKILL.md` instructions, but they require an
agent/runtime that can load skills or include the relevant instructions in
context. They are not automatic capabilities of every raw model API.
Use `--agent <id>` for explicit setup with any id from
`npm run agents:list`. The shorthand `--agent claude` is normalized
to the supported `claude-code` target.
Avoid `--agent auto` for unattended setup: the upstream `skills` CLI may expand
it to every agent it detects on the machine.

Preset intent:

| Preset | Intent |
|---|---|
| `minimal` | Academic research skills only, no MCP records. |
| `default` | Academic research skills plus the low-friction arXiv MCP record. |
| `enhanced` | `default` plus curated external complementary skill bundles. |
| `literature` | SOTA and systematic-review work with arXiv plus DBLP for computer science bibliography. |
| `writing` | Paper-writing work; Overleaf is documented as an opt-in credentialed integration. |
| `full` | Broad setup with low-friction arXiv and DBLP records plus the full optional MCP catalog documented. |

MCP defaults are intentionally conservative. Semantic Scholar, OpenAlex,
Zotero, Overleaf, Crossref, and fallback aggregators are useful, but they need
API keys, local apps, manual setup, or source-policy review. Enable them with
`npm run mcp:enable -- <server>` after reading
`docs/agent/mcp-setup.md`, use `npm run mcp:env -- <server>` to see runtime
prerequisites, then run `npm run mcp:modes`, `npm run mcp:status`, and
`npm run mcp:doctor`.

The MCP catalog uses plain modes by default:
local means your machine runs the MCP server, remote means your client connects
to an existing hosted endpoint, custom remote means you provide the endpoint,
requires local app means another desktop/service app must be running, and
manual setup means guided setup is required before client registration.
arXiv and DBLP are low-friction local `uvx` runtimes.
Semantic Scholar is useful for citation graphs but works best with
`SEMANTIC_SCHOLAR_API_KEY`. OpenAlex requires `OPENALEX_API_KEY` for the
selected local adapter, while OpenAlex and PubMed can also be selected in
remote hosted mode or a custom remote endpoint. PubMed local mode is a
biomedical-specific `npx` runtime and remains opt-in. Zotero needs the local
Zotero desktop app and Zoty setup. Overleaf is a manual setup integration with
a generated safe dotenv-loading wrapper after `mcp setup`.
Crossref and broad paper-search aggregators are kept as fallback/manual entries
until a project explicitly needs them.

For SOTA work, the recommended low-friction path is:

```bash
npm run workflow:literature
npm run skills:install -- --preset literature
npm run mcp:status
npm run mcp:smoke -- --env-file .env.local
```

Then use `$sota-literature-review` with a declared review scale and seed set.

Codex automatic registration supports custom remote endpoints when the URL is
stored in project config with `--url`. If the endpoint URL is kept private via
`--url-env`, Codex automatic registration is not available because the Codex CLI
currently has no `--url-env` option. Either re-enable with
`--url <url>` if the endpoint URL may be stored in Codex config, or manually run
`codex mcp add <server> --url "$MCP_URL_ENV_VAR"` from a shell where the env var
is set.
An explicit `--mode remote-custom` override is not enough by itself; smoke and
probe report `missing-remote-url` until the project has either a stored URL or a
URL env var configured.

Generated projects include a committed `.env.example` with empty MCP variables
and ignore filled `.env` or `.env.local` files. Regenerate the example with
`npm run mcp:dotenv`. `mcp doctor`, `mcp smoke`, and `mcp probe` check the
current process environment unless you explicitly pass
`--env-file .env.local`.

Generated MCP snippets are project documentation and client-ready config, not
live tools by themselves. Your MCP client must load the generated snippet, and
the referenced commands must be available on your machine or runnable through
`uvx`/`npx`. `mcp install` only runs finite setup commands such as the arXiv
tool install; it deliberately does not launch stdio MCP servers.
`mcp setup overleaf --mode local --env-file .env.local` creates a local wrapper
that loads secrets at runtime and records non-secret facts in
`docs/agent/capability-lock.json`.
`configs/capabilities.yaml` records intended project capabilities. The
capability lock records observed setup facts such as MCP setup/client/probe
state and project-local skill install/update/remove actions. The lock is
non-secret and should never contain API keys, tokens, cookies, or env values.
Use `mcp smoke` for a non-launching readiness pass before wiring a client: it
checks required env vars, manual/local-service status, and whether runtime
commands are visible on `PATH`.
Use `mcp probe` only when you intentionally want to start selected MCP server
processes and verify a real stdio JSON-RPC handshake. Remote MCP endpoints are
not started locally; probe reports that the remote endpoint is configured and
does not perform network-dependent checks.

## Validate This Package

```bash
npm install
npm run typecheck
npm test
npm run lint
npm pack --dry-run
```

## Release

Releases are tag-driven. Update `package.json` and `package-lock.json`, commit
the change, create `vX.Y.Z`, and push the tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z
```

Once the GitHub repository is public, the release workflow validates the tag
against the package version, runs CI, smoke-tests the generated project,
publishes `create-academic-research` to npm, and creates a GitHub Release with
generated notes. npm publishing is configured for trusted
publishing/provenance; configure npm trusted publishing for
`VincenzoImp/create-academic-research` and workflow file `release.yml`, or add
an `NPM_TOKEN` repository secret for token-based first publication. If a tag was
pushed while the repository was private, make the repository public and run the
`Release` workflow manually with the existing tag.
