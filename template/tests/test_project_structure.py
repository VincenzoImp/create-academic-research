from pathlib import Path


def test_core_research_structure_exists() -> None:
    root = Path(__file__).resolve().parents[1]
    for relative in (
        "AGENTS.md",
        "configs/default.yaml",
        "configs/capabilities.yaml",
        "docs/agent/capability-profile.md",
        "scripts/README.md",
        "notebooks/README.md",
        "outputs/figures",
        "outputs/tables",
        "data/raw",
        "analysis_outputs",
        "artifacts/cache",
        "artifacts/data",
        "artifacts/models",
        "artifacts/releases",
        "sources/source-ledger.csv",
        "sota/literature-matrix.csv",
        "wiki/index.md",
        "wiki/log.md",
        "wiki/templates/source-page.md",
        "wiki/templates/claim-page.md",
        "wiki/templates/experiment-page.md",
        "wiki/templates/decision-record.md",
        "wiki/templates/reviewer-concern.md",
        "wiki/templates/research-question.md",
    ):
        assert (root / relative).exists()
