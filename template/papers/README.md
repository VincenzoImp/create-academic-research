# Papers

One folder per venue submission. The current version always lives in
`manuscript/`; every submitted round is frozen in `archive/`.

## Contract

Every `papers/<slug>/` has:

- `venue.md` — venue, rules, deadlines, badge/artifact requirements
- `framing.md` — story, claims → contributions mapping
- `manuscript/main.tex` (+ committed `main.pdf`) — on the venue's official
  template; the entry point is always renamed to `main.tex`; the
  bibliography reads the root `references.bib` (bibtex or biblatex,
  whichever the venue class dictates). The `_template` base manuscript is a
  general, compilable skeleton (biblatex numeric, no imposed structure) to
  draft in before a venue is chosen; swap in the venue template later.
- `artifacts/` — the self-contained submission bundle (package-artifacts
  skill)
- `correspondence/` — reviews received, concern maps, response letters
- `archive/` — immutable frozen submissions: `r1/`, `r2/`, `camera-ready/`

## Rules

- never edit `archive/` contents
- new scientific work requested by reviewers goes through contributions
- start new papers by copying `_template/`
