# Survey

`survey.tex` is the single reading reference for the whole SOTA: after
reading it, returning to syntheses or PDFs should rarely be necessary.

## Contract

- digests ALL digested papers in `sota/index.md` (the write-survey skill
  enforces the read-everything gate in create mode)
- groups the SOTA by themes/concepts/methodologies — whatever fits best
- discusses every paper's contributions and notable aspects in depth
  within its group(s); names comparisons, tensions, contradictions
- ends its content with a mandatory Gaps and Research Directions section
- single-column article, table of contents, no length limit
- cites exclusively via the root `references.bib`, rendered **author-year**
  (biblatex `style=authoryear`) — a discursive review reads better than
  numbered references
- `survey.pdf` stays committed and fresh (`make survey`)

## coverage.md

Flat `- citekey` list of papers currently integrated in the text. The
write-survey skill diffs it against `sota/index.md` to apply additions and
removals surgically. Excluded papers (status `excluded`) must not appear.
