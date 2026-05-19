# Final Architecture

`create-academic-research` is the product. It owns project creation, the bundled
research repository structure, and lifecycle commands.

`academic-research-skills` is the companion skills.sh package. It owns agent
procedures for academic research work.

The generator and the skills package are independently useful:

- The generator can create a clean research repo without installing skills.
- The skills package can be installed in any compatible repo.
- Together they produce the intended agentic academic research environment.

The generated project is agent-neutral. `agent: auto` is the default capability
state, which means project-local skill installation relies on the local
`skills` CLI to detect the active agent. Passing `--agent <name>` is an
explicit override for users who want agent-specific skill installs and MCP
snippets.

The generator does not depend on a separate public template repository. The
template is an implementation detail under `template/`.

The wizard source is TypeScript. Runtime files are generated into `dist/`, and
the npm package exposes only `dist/` plus the bundled `template/` and public
documentation.
