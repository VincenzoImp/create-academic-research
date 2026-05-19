from pathlib import Path


def test_core_research_structure_exists() -> None:
    root = Path(__file__).resolve().parents[1]
    for relative in (
        "AGENTS.md",
        "configs/default.yaml",
        "configs/capabilities.yaml",
        "docs/agent/capability-profile.md",
        "notebooks/README.md",
        "outputs/figures",
        "outputs/tables",
        "data/raw",
        "analysis_outputs",
        "sources/source-ledger.csv",
        "sota/literature-matrix.csv",
        "wiki/index.md",
        "wiki/log.md",
    ):
        assert (root / relative).exists()
