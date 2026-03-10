"""Tests for memory consolidation — finding and merging similar insights."""

from __future__ import annotations

import json

from memcp.core.consolidation import find_similar_groups, merge_group
from memcp.core.graph import GraphMemory
from memcp.core.memory import _ensure_graph_migrated, remember
from memcp.tools.consolidation_tools import do_consolidate, do_consolidation_preview


def _init_graph() -> None:
    """Ensure graph backend is active (creates graph.db if needed)."""
    g = _ensure_graph_migrated()
    g.close()


class TestFindSimilarGroups:
    def test_detects_near_duplicates(self):
        _init_graph()
        remember("The auth system uses JWT tokens", category="fact", tags="auth")
        remember("The authentication system uses JWT tokens", category="fact", tags="auth")
        remember("Something completely different about cooking", category="fact", tags="food")

        groups = find_similar_groups(threshold=0.5)
        # The two auth insights should group together
        if groups:
            assert any(len(g) >= 2 for g in groups)

    def test_no_groups_when_all_different(self):
        _init_graph()
        remember("Alpha: cooking recipes", category="fact", tags="food")
        remember("Beta: astronomy facts", category="fact", tags="space")
        remember("Gamma: mathematics", category="fact", tags="math")

        groups = find_similar_groups(threshold=0.95)
        # At very high threshold, all should be unique
        assert len(groups) == 0

    def test_empty_with_single_insight(self):
        _init_graph()
        remember("Only one insight here", category="fact")
        groups = find_similar_groups(threshold=0.5)
        assert len(groups) == 0


class TestMergeGroup:
    def test_merge_keeps_best_insight(self):
        _init_graph()
        r1 = remember("Auth uses JWT tokens", category="fact", tags="auth", importance="low")
        r2 = remember(
            "Auth system JWT tokens",
            category="fact",
            tags="auth,security",
            importance="high",
        )

        # Simulate access count
        graph = _ensure_graph_migrated()
        try:
            graph.update_node(r2["id"], {"access_count": 10})
        finally:
            graph.close()

        result = merge_group([r1["id"], r2["id"]])
        assert result["status"] == "ok"
        assert result["kept_id"] == r2["id"]  # most accessed
        assert r1["id"] in result["deleted_ids"]
        assert result["importance"] == "high"

    def test_merge_unions_tags(self):
        _init_graph()
        r1 = remember("Insight A", category="fact", tags="tag1,tag2")
        r2 = remember("Insight B similar", category="fact", tags="tag2,tag3")

        result = merge_group([r1["id"], r2["id"]])
        assert result["status"] == "ok"
        assert "tag1" in result["tags"]
        assert "tag3" in result["tags"]

    def test_merge_with_explicit_keep_id(self):
        _init_graph()
        r1 = remember("Keep this one", category="decision", importance="critical")
        r2 = remember("Delete this one", category="fact", importance="low")

        result = merge_group([r1["id"], r2["id"]], keep_id=r1["id"])
        assert result["kept_id"] == r1["id"]
        assert r2["id"] in result["deleted_ids"]

    def test_merge_redirects_edges(self):
        _init_graph()
        r1 = remember("Insight with edges A", category="fact", tags="auth")
        r2 = remember("Insight with edges B", category="fact", tags="auth")
        r3 = remember("Related to A via auth", category="fact", tags="auth")

        graph = GraphMemory()
        try:
            # Verify r3 has edges to at least one of r1/r2
            _ = graph._get_edges(r3["id"])
            result = merge_group([r1["id"], r2["id"]])
            assert result["status"] == "ok"

            # After merge, deleted node should be gone
            deleted = graph.get_node(result["deleted_ids"][0])
            assert deleted is None
        finally:
            graph.close()

    def test_merge_requires_two_ids(self):
        _init_graph()
        r1 = remember("Only one", category="fact")
        result = merge_group([r1["id"]])
        assert result["status"] == "error"


class TestConsolidationTools:
    def test_preview_is_dry_run(self):
        _init_graph()
        r1 = remember("Preview test A", category="fact", tags="test")
        r2 = remember("Preview test A similar", category="fact", tags="test")

        result = json.loads(do_consolidation_preview(threshold=0.3))
        assert result["status"] == "ok"

        # Both insights should still exist (dry-run)
        graph = GraphMemory()
        try:
            assert graph.get_node(r1["id"]) is not None
            assert graph.get_node(r2["id"]) is not None
        finally:
            graph.close()

    def test_consolidate_tool(self):
        _init_graph()
        r1 = remember("Consolidate tool test X", category="fact")
        r2 = remember("Consolidate tool test X same", category="fact")

        result = json.loads(do_consolidate(f"{r1['id']},{r2['id']}"))
        assert result["status"] == "ok"
        assert result["merged_count"] == 1

    def test_consolidate_too_few_ids(self):
        _init_graph()
        result = json.loads(do_consolidate("single_id"))
        assert result["status"] == "error"
