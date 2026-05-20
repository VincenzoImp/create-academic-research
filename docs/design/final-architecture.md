# Final Architecture

`create-academic-research` is the product. It owns project creation, the bundled
research repository structure, and lifecycle commands.

`academic-research-skills` is the companion skills.sh package. It owns agent
procedures for academic research work.

The generator and the skills package are independently useful:

- The generator can create a clean research repo without installing skills.
- The skills package can be installed in any compatible repo.
- Together they produce the intended agentic academic research environment.

The generated project is agent-neutral. `agent: universal` is the default
capability state, which installs one shared project-local `.agents/skills` copy
and writes generic MCP snippets. Passing `--agent <id>` is an explicit override
for users who want a supported skills.sh agent target, while `--agent auto`
delegates detection to the upstream `skills` CLI and may create multiple
agent-specific copies.

The generator does not depend on a separate public template repository. The
template is an implementation detail under `template/`.

The wizard source is TypeScript. Runtime files are generated into `dist/`, and
the npm package exposes only `dist/` plus the bundled `template/` and public
documentation.
