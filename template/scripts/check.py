#!/usr/bin/env python3
"""Structure validator for this research project (create-academic-research v0.2).

Enforces the four-entity scaffold invariants. Stdlib only; Python >= 3.11
recommended (the uv-workspace check degrades to a warning below 3.11).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[1]
# Must match only the dedicated marker line in references.bib
# ("% =========================== WHITELIST ==========================="),
# not prose comments that merely mention the word WHITELIST.
WHITELIST_MARKER = "=== WHITELIST ==="

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_bib() -> tuple[dict[str, int], set[str]]:
    """Return ({sota key: count}, {whitelisted keys})."""
    sota: dict[str, int] = {}
    whitelisted: set[str] = set()
    in_whitelist = False
    for line in read(ROOT / "references.bib").splitlines():
        if re.match(r"^\s*%", line) and WHITELIST_MARKER in line:
            in_whitelist = True
            continue
        m = re.match(r"^\s*@\w+\s*\{\s*([^,\s]+)\s*,", line)
        if not m:
            continue
        key = m.group(1)
        if in_whitelist:
            whitelisted.add(key)
        else:
            sota[key] = sota.get(key, 0) + 1
    return sota, whitelisted


def parse_index() -> dict[str, str]:
    """Return {citekey: status} from sota/index.md table rows."""
    rows: dict[str, str] = {}
    for line in read(ROOT / "sota" / "index.md").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cells) < 6 or cells[0] == "citekey" or set(cells[0]) <= {"-", ":", " "}:
            continue
        rows[cells[0]] = cells[5]
    return rows


def check_metadata(paper_dir: Path) -> str | None:
    """Validate metadata.yaml; return its status field."""
    meta_path = paper_dir / "metadata.yaml"
    text = read(meta_path)
    key = paper_dir.name
    rel = meta_path.relative_to(ROOT)
    if not re.search(rf"^citekey:\s*{re.escape(key)}\s*$", text, re.M):
        err(f"{rel}: citekey field must equal folder name {key!r}")
    m = re.search(r"^status:\s*(\S+)", text, re.M)
    status = m.group(1) if m else None
    if status not in ("digested", "excluded"):
        err(f"{rel}: status must be 'digested' or 'excluded', got {status!r}")
    if not re.search(r"^verified:\s*$", text, re.M):
        err(f"{rel}: missing mandatory 'verified:' provenance block")
    if not re.search(r"^(doi|arxiv):\s*\S+", text, re.M) and not re.search(
        r"^\s+(s2_id|record):\s*\S+", text, re.M
    ):
        err(f"{rel}: needs at least one resolvable identifier (doi/arxiv/s2_id/record)")
    return status


def check_sota() -> set[str]:
    """Validate the 1:1:1 invariant; return the set of digested citekeys."""
    papers_dir = ROOT / "sota" / "papers"
    dirs = {d.name: d for d in papers_dir.iterdir() if d.is_dir()} if papers_dir.is_dir() else {}
    sota_bib, _whitelisted = parse_bib()
    index = parse_index()

    for key, count in sota_bib.items():
        if count > 1:
            err(f"references.bib: duplicate key {key!r}")

    statuses: dict[str, str] = {}
    for name, d in sorted(dirs.items()):
        for required in ("paper.pdf", "synthesis.md", "metadata.yaml"):
            if not (d / required).is_file():
                err(f"sota/papers/{name}: missing {required}")
        if (d / "metadata.yaml").is_file():
            status = check_metadata(d)
            if status:
                statuses[name] = status

    folder_keys, bib_keys, index_keys = set(dirs), set(sota_bib), set(index)
    for key in sorted(folder_keys - bib_keys):
        err(f"sota/papers/{key}: no matching entry in references.bib (1:1:1)")
    for key in sorted(bib_keys - folder_keys):
        err(f"references.bib: key {key!r} has no sota/papers/{key}/ folder (1:1:1)")
    for key in sorted(folder_keys - index_keys):
        err(f"sota/papers/{key}: no row in sota/index.md (1:1:1)")
    for key in sorted(index_keys - folder_keys):
        err(f"sota/index.md: row {key!r} has no sota/papers/{key}/ folder (1:1:1)")
    for key in sorted(folder_keys & index_keys):
        if key in statuses and index[key] != statuses[key]:
            err(
                f"{key}: status differs between index.md ({index[key]}) "
                f"and metadata.yaml ({statuses[key]})"
            )

    return {k for k, s in statuses.items() if s == "digested"}


def check_coverage(digested: set[str]) -> None:
    for line in read(ROOT / "survey" / "coverage.md").splitlines():
        m = re.match(r"^-\s+(\S+)\s*$", line.strip())
        if not m:
            continue
        key = m.group(1)
        if key not in digested:
            err(f"survey/coverage.md: {key!r} is not a digested SOTA paper")


def content_dirs(parent: Path) -> list[Path]:
    if not parent.is_dir():
        return []
    return sorted(d for d in parent.iterdir() if d.is_dir() and d.name != "_template")


def check_contributions() -> None:
    for d in content_dirs(ROOT / "contributions"):
        for required in ("README.md", "report/report.tex"):
            if not (d / required).is_file():
                err(f"contributions/{d.name}: missing {required}")


def check_papers() -> None:
    for d in content_dirs(ROOT / "papers"):
        for required in ("venue.md", "framing.md", "manuscript/main.tex"):
            if not (d / required).is_file():
                err(f"papers/{d.name}: missing {required}")


def check_pdfs() -> None:
    pairs = [ROOT / "survey" / "survey.tex"]
    pairs += [d / "report" / "report.tex" for d in content_dirs(ROOT / "contributions")]
    pairs += [d / "manuscript" / "main.tex" for d in content_dirs(ROOT / "papers")]
    for tex in pairs:
        if not tex.is_file():
            continue  # the missing .tex is reported elsewhere
        pdf = tex.with_suffix(".pdf")
        rel = pdf.relative_to(ROOT)
        if not pdf.is_file():
            err(f"{rel}: missing — every required .tex keeps its built PDF committed")
        elif tex.stat().st_mtime > pdf.stat().st_mtime:
            warn(f"{rel}: older than its .tex — rebuild (make pdfs)")


def check_workspace() -> None:
    contribs = [
        d for d in content_dirs(ROOT / "contributions") if (d / "pyproject.toml").is_file()
    ]
    if not contribs:
        return
    if tomllib is None:
        warn("python < 3.11: cannot verify uv workspace membership")
        return
    data = tomllib.loads(read(ROOT / "pyproject.toml"))
    ws = data.get("tool", {}).get("uv", {}).get("workspace", {})
    members = set(ws.get("members", []))
    exclude = set(ws.get("exclude", []))
    for d in contribs:
        rel = f"contributions/{d.name}"
        if rel not in members and rel not in exclude:
            warn(f"{rel}: has pyproject.toml but is not in workspace members or exclude")


def main() -> int:
    digested = check_sota()
    check_coverage(digested)
    check_contributions()
    check_papers()
    check_pdfs()
    check_workspace()
    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        print(f"check: FAIL ({len(errors)} errors, {len(warnings)} warnings)")
        return 1
    print(f"check: OK ({len(warnings)} warnings)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
