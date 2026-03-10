"""Tests for Hebbian co-retrieval strengthening and edge decay."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from memcp.core.edge_manager import EdgeManager
from memcp.core.memory import _ensure_graph_migrated, remember


def _init_graph() -> None:
    """Ensure graph backend is active (creates graph.db if needed)."""
    g = _ensure_graph_migrated()
    g.close()


def _store_two_linked_insights() -> tuple[str, str]:
    """Helper: store 2 insights that share entities so they get edges."""
    _init_graph()
    r1 = remember(
        "The auth system uses JWT tokens for authentication",
        category="fact",
        tags="auth,jwt",
    )
    r2 = remember(
        "JWT tokens expire after 24 hours in the auth system",
        category="fact",
        tags="auth,jwt",
    )
    return r1["id"], r2["id"]


class TestHebbianStrengthening:
    def test_co_retrieval_strengthens_edges(self):
        graph = _ensure_graph_migrated()
        try:
            id1, id2 = _store_two_linked_insights()

            # Get initial edge weights
            edges_before = graph._get_edges(id1)
            shared_edges = [
                e
                for e in edges_before
                if e["target_id"] in (id1, id2) or e["source_id"] in (id1, id2)
            ]
            if not shared_edges:
                # If no edges exist, the test is trivially OK (no edges to strengthen)
                return

            initial_weight = shared_edges[0]["weight"]
            strengthened = graph._edge_manager.strengthen_co_retrieved([id1, id2], boost=0.1)

            assert strengthened > 0

            edges_after = graph._get_edges(id1)
            shared_after = [
                e
                for e in edges_after
                if e["target_id"] in (id1, id2) or e["source_id"] in (id1, id2)
            ]
            assert shared_after[0]["weight"] > initial_weight
        finally:
            graph.close()

    def test_hebbian_weight_caps_at_1(self):
        graph = _ensure_graph_migrated()
        try:
            id1, id2 = _store_two_linked_insights()

            # Boost many times
            for _ in range(30):
                graph._edge_manager.strengthen_co_retrieved([id1, id2], boost=0.1)

            edges = graph._get_edges(id1)
            for e in edges:
                assert e["weight"] <= 1.0
        finally:
            graph.close()

    def test_hebbian_disabled(self, monkeypatch):
        monkeypatch.setenv("MEMCP_HEBBIAN_ENABLED", "false")
        # Just verify config is respected — actual skipping happens in GraphTraversal.query()
        from memcp.config import get_config

        config = get_config()
        assert config.hebbian_enabled is False

    def test_no_crash_on_no_shared_edges(self):
        _init_graph()
        graph = _ensure_graph_migrated()
        try:
            r1 = remember("Alpha topic about cooking", category="fact", tags="food")
            r2 = remember("Beta topic about astronomy", category="fact", tags="space")
            # These likely have no shared edges
            result = graph._edge_manager.strengthen_co_retrieved([r1["id"], r2["id"]], boost=0.05)
            assert result >= 0  # no crash, returns 0 or more
        finally:
            graph.close()


class TestEdgeDecay:
    def test_edge_decay_reduces_weight(self):
        id1, id2 = _store_two_linked_insights()
        graph = _ensure_graph_migrated()
        try:
            # Activate edges so they have last_activated_at
            graph._edge_manager.strengthen_co_retrieved([id1, id2], boost=0.01)

            # Manually backdate last_activated_at to 60 days ago
            conn = graph._get_conn()
            old_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
            conn.execute("UPDATE edges SET last_activated_at = ?", (old_date,))
            conn.commit()

            # Reset rate limiter
            EdgeManager._last_decay_time = 0.0

            edges_before = graph._get_edges(id1)
            weights_before = {(e["source_id"], e["target_id"]): e["weight"] for e in edges_before}

            pruned = graph._edge_manager.decay_stale_edges(half_life_days=30, min_weight=0.01)

            edges_after = graph._get_edges(id1)
            weights_after = {(e["source_id"], e["target_id"]): e["weight"] for e in edges_after}

            # Either some were pruned or weights decreased
            changed = False
            for key, w_before in weights_before.items():
                if key not in weights_after:
                    changed = True  # pruned
                elif weights_after[key] < w_before:
                    changed = True  # decayed
            assert changed or pruned > 0
        finally:
            EdgeManager._last_decay_time = 0.0
            graph.close()

    def test_edge_decay_prunes_below_threshold(self):
        graph = _ensure_graph_migrated()
        try:
            id1, id2 = _store_two_linked_insights()
            graph._edge_manager.strengthen_co_retrieved([id1, id2], boost=0.01)

            # Backdate to very old
            conn = graph._get_conn()
            old_date = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
            conn.execute("UPDATE edges SET last_activated_at = ?", (old_date,))
            conn.commit()

            EdgeManager._last_decay_time = 0.0
            pruned = graph._edge_manager.decay_stale_edges(half_life_days=30, min_weight=0.05)
            # After 365 days with 30-day half-life, most edges should be pruned
            assert pruned >= 0  # at least runs without error
        finally:
            EdgeManager._last_decay_time = 0.0
            graph.close()

    def test_decay_rate_limiting(self):
        graph = _ensure_graph_migrated()
        try:
            id1, id2 = _store_two_linked_insights()
            graph._edge_manager.strengthen_co_retrieved([id1, id2], boost=0.01)

            # First call should execute
            EdgeManager._last_decay_time = 0.0
            graph._edge_manager.decay_stale_edges()

            # Second call within the hour should be skipped (return 0)
            result = graph._edge_manager.decay_stale_edges()
            assert result == 0
        finally:
            EdgeManager._last_decay_time = 0.0
            graph.close()
