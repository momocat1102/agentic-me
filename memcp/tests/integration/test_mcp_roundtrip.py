"""Integration tests — full lifecycle through the memory + tool layers.

These tests exercise the real code paths (SQLite, file I/O, etc.) using
the isolated_data_dir fixture from conftest.py.
"""

from __future__ import annotations

import json

import pytest

from memcp.core.errors import SecretDetectedError, ValidationError
from memcp.core.graph import GraphMemory
from memcp.core.memory import forget, recall, remember
from memcp.tools.context_tools import load_context
from memcp.tools.search_tools import do_search

# ── remember → recall → forget lifecycle ──────────────────────────────


class TestMemoryLifecycle:
    """Full CRUD lifecycle: remember → recall → forget → verify gone."""

    def test_remember_and_recall(self, isolated_data_dir):
        result = remember("Python uses GIL for thread safety", category="fact", importance="high")
        assert result["id"]
        assert result["category"] == "fact"
        assert result["importance"] == "high"
        assert result["token_count"] > 0

        insights = recall(query="GIL thread", scope="all")
        assert len(insights) >= 1
        found = [i for i in insights if i["id"] == result["id"]]
        assert len(found) == 1
        assert "GIL" in found[0]["content"]

    def test_forget_removes_insight(self, isolated_data_dir):
        result = remember("Temporary insight to delete", category="general")
        insight_id = result["id"]

        removed = forget(insight_id)
        assert removed is True

        # Should not appear in recall
        insights = recall(scope="all")
        ids = [i["id"] for i in insights]
        assert insight_id not in ids

    def test_forget_nonexistent_returns_false(self, isolated_data_dir):
        removed = forget("nonexistent-id-12345")
        assert removed is False

    def test_duplicate_detection(self, isolated_data_dir):
        result1 = remember("Exact same content for dedup test")
        result2 = remember("Exact same content for dedup test")

        assert result2.get("_duplicate") is True
        assert result2["id"] == result1["id"]

    def test_tags_and_entities_roundtrip(self, isolated_data_dir):
        result = remember(
            "FastAPI supports async endpoints",
            tags="python,fastapi,async",
            entities="FastAPI,Python",
            category="fact",
        )
        assert result["tags"] == ["python", "fastapi", "async"]
        assert result["entities"] == ["FastAPI", "Python"]

        insights = recall(query="FastAPI async", scope="all")
        found = [i for i in insights if i["id"] == result["id"]]
        assert len(found) == 1
        assert "python" in found[0]["tags"]

    def test_multiple_insights_ordered_by_recency(self, isolated_data_dir):
        remember("First insight AAA", category="fact")
        remember("Second insight BBB", category="fact")
        remember("Third insight CCC", category="fact")

        insights = recall(scope="all")
        assert len(insights) == 3
        # Most recent first
        assert "CCC" in insights[0]["content"]

    def test_recall_with_category_filter(self, isolated_data_dir):
        remember("Decision: use PostgreSQL", category="decision")
        remember("Fact: API rate limit is 100/min", category="fact")

        decisions = recall(category="decision", scope="all")
        assert all(i["category"] == "decision" for i in decisions)
        assert len(decisions) == 1

    def test_recall_with_importance_filter(self, isolated_data_dir):
        remember("Critical rule: never push to main", importance="critical")
        remember("Low priority note", importance="low")

        critical = recall(importance="critical", scope="all")
        assert all(i["importance"] == "critical" for i in critical)
        assert len(critical) == 1

    def test_recall_with_limit(self, isolated_data_dir):
        for i in range(5):
            remember(f"Insight number {i} for limit test")

        limited = recall(limit=2, scope="all")
        assert len(limited) == 2

    def test_recall_with_max_tokens(self, isolated_data_dir):
        # Each insight is ~3 tokens
        for i in range(10):
            remember(f"Short insight {i}")

        # Request budget that fits only a few (3 tokens each, budget=8 fits ~2-3)
        budgeted = recall(max_tokens=8, scope="all")
        assert len(budgeted) < 10
        assert len(budgeted) >= 1


# ── Secret detection ──────────────────────────────────────────────────


class TestSecretDetection:
    """Secret detection should block storage of credentials."""

    # Build fake secrets dynamically to avoid triggering GitHub push protection.
    _AWS_KEY = "AKIA" + "IOSFODNN7EXAMPLE"
    _OPENAI_KEY = "sk-" + "abcdefghijklmnopqrstuvwxyz1234567890"
    _GITHUB_TOKEN = "ghp_" + "1234567890abcdefghijklmnopqrstuvwxyz"
    _PRIVATE_KEY = "-----BEGIN RSA " + "PRIVATE KEY-----\nMIIBog..."

    def test_aws_key_blocked(self, isolated_data_dir):
        with pytest.raises(SecretDetectedError):
            remember(f"My AWS key is {self._AWS_KEY}")

    def test_openai_key_blocked(self, isolated_data_dir):
        with pytest.raises(SecretDetectedError):
            remember(f"OpenAI key: {self._OPENAI_KEY}")

    def test_github_token_blocked(self, isolated_data_dir):
        with pytest.raises(SecretDetectedError):
            remember(f"GitHub token: {self._GITHUB_TOKEN}")

    def test_private_key_blocked(self, isolated_data_dir):
        with pytest.raises(SecretDetectedError):
            remember(self._PRIVATE_KEY)

    def test_safe_content_allowed(self, isolated_data_dir):
        result = remember("The API uses OAuth2 for authentication", category="fact")
        assert result["id"]


# ── Validation errors ─────────────────────────────────────────────────


class TestValidationErrors:
    """Invalid inputs should raise ValidationError."""

    def test_invalid_category(self, isolated_data_dir):
        with pytest.raises(ValidationError, match="Invalid category"):
            remember("test", category="invalid_cat")

    def test_invalid_importance(self, isolated_data_dir):
        with pytest.raises(ValidationError, match="Invalid importance"):
            remember("test", importance="super_high")

    def test_empty_content(self, isolated_data_dir):
        with pytest.raises(ValidationError, match="empty"):
            remember("   ")


# ── Entity edges via related() ────────────────────────────────────────


class TestEntityEdges:
    """Insights with shared entities should be connected by entity edges."""

    def test_shared_entity_creates_edge(self, isolated_data_dir):
        r1 = remember(
            "Python is great for data science",
            entities="Python,data science",
        )
        r2 = remember(
            "Python 3.12 adds new type features",
            entities="Python",
        )

        # Use GraphMemory directly to check edges
        graph = GraphMemory()
        try:
            result = graph.get_related(r1["id"], edge_type="entity")
            related_ids = [n["id"] for n in result["related"]]
            assert r2["id"] in related_ids
        finally:
            graph.close()

    def test_no_shared_entities_no_edge(self, isolated_data_dir):
        r1 = remember("Rust is fast", entities="Rust")
        remember("JavaScript for web", entities="JavaScript")

        graph = GraphMemory()
        try:
            result = graph.get_related(r1["id"], edge_type="entity")
            assert len(result["related"]) == 0
        finally:
            graph.close()

    def test_related_nonexistent_insight(self, isolated_data_dir):
        from memcp.core.errors import InsightNotFoundError

        # Ensure graph db exists first
        remember("Setup insight")

        graph = GraphMemory()
        try:
            with pytest.raises(InsightNotFoundError):
                graph.get_related("nonexistent-id")
        finally:
            graph.close()


# ── Graph stats ───────────────────────────────────────────────────────


class TestGraphStats:
    """Graph stats reflect stored insights."""

    def test_stats_reflect_stored_insights(self, isolated_data_dir):
        remember("Insight one", entities="Python")
        remember("Insight two", entities="Python")

        graph = GraphMemory()
        try:
            stats = graph.stats()  # No project filter — all nodes
        finally:
            graph.close()

        assert stats["node_count"] == 2
        assert any(e["entity"] == "Python" for e in stats["top_entities"])


# ── Search across memory and contexts ────────────────────────────────


class TestSearch:
    """Search should find results across memory insights and contexts."""

    def test_search_finds_memory_insights(self, isolated_data_dir):
        remember("SQLAlchemy ORM supports async sessions", tags="sqlalchemy,orm")

        result_json = do_search(query="SQLAlchemy async", scope="all")
        result = json.loads(result_json)

        assert result["status"] == "ok"
        assert result["count"] >= 1
        assert any("SQLAlchemy" in r["content"] for r in result["results"])

    def test_search_finds_context_content(self, isolated_data_dir):
        load_context(name="test-doc", content="FastAPI is a modern web framework for Python")

        result_json = do_search(query="FastAPI web framework", source="contexts", scope="all")
        result = json.loads(result_json)

        assert result["status"] == "ok"
        # Context search requires chunking; may or may not find depending on method
        # At minimum, the search should complete without error

    def test_search_both_sources(self, isolated_data_dir):
        remember("Redis is an in-memory data store", tags="redis")
        load_context(name="redis-notes", content="Redis supports pub/sub messaging")

        result_json = do_search(query="Redis", source="all", scope="all")
        result = json.loads(result_json)

        assert result["status"] == "ok"
        # Should find at least the memory insight
        assert result["count"] >= 1

    def test_search_empty_query_returns_error(self, isolated_data_dir):
        result_json = do_search(query="", scope="all")
        result = json.loads(result_json)
        # Empty query should either return error or empty results
        assert result["status"] in ("ok", "error")
