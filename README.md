# Create Academic Research

Create agent-ready academic research repositories with one command.

From the npm registry:

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

The generator creates a complete research repository, personalizes the project
name and Python package, configures project-local skills, writes MCP records,
and prepares a durable wiki/log structure for agentic academic work.

The wizard is discipline-general: it creates a clean structure for academic
research projects in any field. Its companion skill stack gives first-class
support to computer science research, including AI/ML, systems, HCI, security,
software engineering, databases, theory, robotics, IR, PL, graphics, and
adjacent interdisciplinary CS.

The generated repository is agent-neutral. By default the wizard records
`agent: universal`, installs one shared project-local `.agents/skills` copy,
and writes generic MCP snippets. Use `--agent <id>` only when you want to force
a specific target recognized by the `skills` CLI. Run
`npx academic-research agents list` inside a generated project to see every
supported target and alias.

## Default Experience

By default, the wizard:

- creates the repository structure;
- installs the project-local `VincenzoImp/academic-research-skills` package;
- enables the scholarly MCP records for `arxiv`, `semantic-scholar`, and
  `openalex`;
- writes `configs/capabilities.yaml`;
- writes `docs/agent/capability-profile.md`;
- writes `docs/agent/generated/mcp.json` unless an explicit agent target is set;
- appends the onboarding event to `wiki/log.md`;
- does not install external MCP tools unless explicitly requested.

Use `--preset enhanced` when you also want the curated complementary external
skill bundles for agent engineering, frontend work, testing, document formats,
and PDF conversion.

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
npx academic-research doctor
npx academic-research rename --title "New Title" --slug new-title --package new_title
npx academic-research agents list
npx academic-research skills presets
npx academic-research skills install --preset default
npx academic-research skills install --preset enhanced
npx academic-research skills list
npx academic-research skills status
npx academic-research skills remove source-ingestion
npx academic-research skills uninstall source-ingestion
npx academic-research skills update
npx academic-research mcp list
npx academic-research mcp enabled
npx academic-research mcp available
npx academic-research mcp commands arxiv
npx academic-research mcp enable arxiv openalex
npx academic-research mcp disable arxiv
npx academic-research mcp install arxiv
npx academic-research mcp uninstall arxiv
npx academic-research mcp doctor
```

## Command Model

Skills are project-local by default.

| Command | Meaning |
|---|---|
| `skills presets` | List available capability presets. |
| `skills install` | Install project-local skills for the selected preset and project agent. This does not change MCP records. |
| `skills list` | List skills found in project-local skill loader directories. |
| `skills status` | Show configured project preset, agent, scope, skill roots, unique skill ids, and installed copies. |
| `skills remove` / `skills uninstall` | Remove selected project-local skills. |
| `skills update` | Update project-local skill copies. |

MCP commands are split by side-effect:

| Command | Meaning |
|---|---|
| `mcp list` | List known MCP servers with enabled/available status. |
| `mcp enabled` | List only enabled MCP server ids. |
| `mcp available` | List the local MCP catalog. |
| `mcp commands` | Print finite external install commands without running them. Runtime-only `uvx`/`npx` servers may have no install command. |
| `mcp enable` | Enable an MCP server in project records and generated snippets. |
| `mcp disable` | Remove an MCP server from project records and generated snippets. |
| `mcp install` | Run finite external tool install commands for selected MCP servers. It must not launch stdio MCP servers. |
| `mcp uninstall` | Run the external uninstall command when one exists. |
| `mcp doctor` | Validate enabled MCP records and generated snippets. |

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
`academic-research agents list`. The shorthand `--agent claude` is normalized
to the supported `claude-code` target.
Avoid `--agent auto` for unattended setup: the upstream `skills` CLI may expand
it to every agent it detects on the machine.

Preset intent:

| Preset | Intent |
|---|---|
| `minimal` | Academic research skills only, no MCP records. |
| `default` | Academic research skills plus core scholarly MCP records. |
| `enhanced` | `default` plus curated external complementary skill bundles. |
| `literature` | SOTA and systematic-review work with citation-library MCP records. |
| `writing` | Paper-writing and Overleaf-oriented work. |
| `full` | Broad optional connector and specialist setup. |

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
git tag -a v0.1.5 -m "v0.1.5"
git push origin main v0.1.5
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
