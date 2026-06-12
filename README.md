# Create Academic Research

[![npm](https://img.shields.io/npm/v/create-academic-research)](https://www.npmjs.com/package/create-academic-research)
[![Validate](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml/badge.svg)](https://github.com/VincenzoImp/create-academic-research/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Scaffold a four-entity academic research project with one command:
**SOTA → survey → contributions → papers**, one root bibliography,
MCP-verified citations, agent skills included.

```bash
npm create academic-research@latest my-project
```

## What it creates

```
my-project/
├── README.md  AGENTS.md  CLAUDE.md
├── references.bib       # THE single bibliography (1:1:1 with the SOTA)
├── .mcp.json            # arxiv + semantic-scholar + dblp always on
├── pyproject.toml       # uv workspace: one venv for all contributions
├── Makefile             # make check | pdfs | survey | contribution | paper
├── scripts/check.py     # structure validator
├── sota/                # papers/<citekey>/{paper.pdf,synthesis.md,metadata.yaml} + index + queue
├── survey/              # survey.tex + committed survey.pdf + coverage.md
├── contributions/       # self-contained badge-compliant units (_template/)
└── papers/              # one folder per venue submission (_template/)
```

The wizard asks for a title, a one-line topic, optional MCP servers
(openalex pre-checked; zotero and overleaf opt-in), and installs the
companion [academic-research-skills](https://github.com/VincenzoImp/academic-research-skills)
project-locally. Flags: `--yes`, `--no-install-skills`, `--no-git`.

## The model

- **SOTA**: digesting a paper atomically produces its folder (PDF +
  standard synthesis + metadata with citation graph), its bib entry, and
  its index row. A citation exists only if a scholarly MCP lookup produced
  it — provenance is recorded per paper and enforced by `make check`.
- **Survey**: one single-column LaTeX document that digests every
  synthesis, groups the SOTA, and ends with gaps & research directions.
  `coverage.md` makes updates diff-driven when the SOTA changes.
- **Contributions**: each one self-contained and badge-general compliant,
  with a report detailed enough to write papers from.
- **Papers**: per-venue folders with framing, manuscript on the venue
  template, packaged artifacts, correspondence, and immutable submission
  archives.

Generated projects need: git, make, python3 (≥3.11), latexmk, and uv
(uvx runs the MCP servers). No Node at runtime (except the optional
openalex server).

## Develop this package

```bash
npm install
npm run typecheck
npm test
npm pack --dry-run
```

The test suite needs `python3` ≥ 3.11 on `PATH` (one test validates
generated TOML with `tomllib`); CI uses 3.12.

## Release

Tag-driven. Bump `package.json`, commit, tag `vX.Y.Z`, push the tag; the
release workflow validates, publishes to npm, and creates a GitHub release.
