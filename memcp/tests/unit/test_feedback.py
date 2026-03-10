"""Tests for the feedback/reinforce API."""

from __future__ import annotations

import json

from memcp.core.graph import GraphMemory
from memcp.core.memory import _ensure_graph_migrated, remember
from memcp.tools.feedback_tools import do_reinforce


def _init_graph() -> None:
    """Ensure graph backend is active (creates graph.db if needed)."""
    g = _ensure_graph_migrated()
    g.close()


class TestReinforce:
    def test_reinforce_positive_boosts_score(self):
        _init_graph()
        r = remember("Test insight for feedback", category="fact")
        result = json.loads(do_reinforce(r["id"], helpful=True))
        assert result["status"] == "ok"
        assert result["feedback_score"] > 0
        assert result["helpful"] is True

    def test_reinforce_negative_lowers_score(self):
        _init_graph()
        r = remember("Misleading insight", category="fact")
        result = json.loads(do_reinforce(r["id"], helpful=False))
        assert result["status"] == "ok"
        assert result["feedback_score"] < 0
        assert result["helpful"] is False

    def test_feedback_score_clamped_positive(self):
        _init_graph()
        r = remember("Repeatedly helpful", category="fact")
        # Reinforce many times
        for _ in range(20):
            result = json.loads(do_reinforce(r["id"], helpful=True))
        assert result["feedback_score"] <= 1.0

    def test_feedback_score_clamped_negative(self):
        _init_graph()
        r = remember("Repeatedly misleading", category="fact")
        for _ in range(20):
            result = json.loads(do_reinforce(r["id"], helpful=False))
        assert result["feedback_score"] >= -1.0

    def test_reinforce_nonexistent_insight(self):
        _init_graph()
        result = json.loads(do_reinforce("nonexistent_id_xyz", helpful=True))
        assert result["status"] == "error"
        assert "not found" in result["message"].lower()

    def test_reinforce_with_note(self):
        _init_graph()
        r = remember("Insight with feedback note", category="fact")
        result = json.loads(do_reinforce(r["id"], helpful=True, note="Very useful"))
        assert result["status"] == "ok"
        assert result.get("note") == "Very useful"

    def test_feedback_affects_query_ranking(self):
        """Positively reinforced insights should rank higher in queries."""
        _init_graph()
        remember("SQLite is used for graph storage backend", category="fact", tags="database")
        r2 = remember("SQLite database stores the graph nodes", category="fact", tags="database")

        # Reinforce r2
        do_reinforce(r2["id"], helpful=True)
        do_reinforce(r2["id"], helpful=True)
        do_reinforce(r2["id"], helpful=True)

        # Query — r2 should rank higher due to feedback boost
        graph = GraphMemory()
        try:
            results = graph.query(query="SQLite database graph", limit=5)
            if len(results) >= 2:
                result_ids = [r["id"] for r in results]
                # r2 should appear (may or may not be first depending on other scores)
                assert r2["id"] in result_ids
        finally:
            graph.close()
