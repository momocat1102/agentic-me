"""Shared fixtures for integration tests."""

from __future__ import annotations

from pathlib import Path

import pytest

import memcp.config as config_module


def _reset_singletons() -> None:
    """Reset all module-level singletons for test isolation."""
    config_module._config = None

    try:
        from memcp.core.embeddings import reset_provider

        reset_provider()
    except ImportError:
        pass

    try:
        from memcp.core.embed_cache import reset_embed_cache

        reset_embed_cache()
    except ImportError:
        pass

    try:
        from memcp.core.search import invalidate_bm25_cache

        invalidate_bm25_cache()
    except ImportError:
        pass

    try:
        from memcp.core import secrets

        secrets._detector = None
    except ImportError:
        pass


@pytest.fixture(autouse=True)
def isolated_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Give every test its own data directory."""
    data_dir = tmp_path / "memcp-integration"
    monkeypatch.setenv("MEMCP_DATA_DIR", str(data_dir))
    monkeypatch.delenv("MEMCP_PROJECT", raising=False)
    monkeypatch.setenv("MEMCP_SECRET_DETECTION", "true")

    _reset_singletons()

    # Ensure graph.db is created so the graph backend is used (not JSON fallback).
    # This mirrors real-world usage where the graph DB is initialized on first install.
    # We must call _get_conn() to force the lazy connection and create the file.
    from memcp.core.graph import GraphMemory

    graph = GraphMemory()
    graph._get_conn()  # Force schema creation
    graph.close()

    yield data_dir

    _reset_singletons()
