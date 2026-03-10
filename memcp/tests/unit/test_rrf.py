"""Tests for Reciprocal Rank Fusion (RRF) search."""

from __future__ import annotations

from memcp.core.search import _rrf_fuse


class TestRRFFusion:
    def test_basic_two_lists(self):
        """Two ranked lists, verify fused order."""
        list_a = [
            {"id": "a", "content": "alpha"},
            {"id": "b", "content": "beta"},
            {"id": "c", "content": "gamma"},
        ]
        list_b = [
            {"id": "b", "content": "beta"},
            {"id": "c", "content": "gamma"},
            {"id": "a", "content": "alpha"},
        ]

        fused = _rrf_fuse(list_a, list_b, k=60)
        ids = [doc.get("id") for _, doc in fused]

        # "b" appears at rank 0 in list_b and rank 1 in list_a → highest RRF score
        assert ids[0] == "b"

    def test_three_sources(self):
        """Three ranked lists fuse correctly."""
        list_a = [{"id": "x"}, {"id": "y"}, {"id": "z"}]
        list_b = [{"id": "y"}, {"id": "z"}, {"id": "x"}]
        list_c = [{"id": "z"}, {"id": "x"}, {"id": "y"}]

        fused = _rrf_fuse(list_a, list_b, list_c, k=60)
        scores = {doc.get("id"): score for score, doc in fused}

        # All three docs appear in all three lists, but at different ranks
        # x: ranks 0, 2, 1 → 1/61 + 1/63 + 1/62
        # y: ranks 1, 0, 2 → 1/62 + 1/61 + 1/63
        # z: ranks 2, 1, 0 → 1/63 + 1/62 + 1/61
        # All should have equal RRF scores (same rank distribution)
        assert abs(scores["x"] - scores["y"]) < 0.001
        assert abs(scores["y"] - scores["z"]) < 0.001

    def test_disjoint_results(self):
        """Results only in one list still appear."""
        list_a = [{"id": "a"}, {"id": "b"}]
        list_b = [{"id": "c"}, {"id": "d"}]

        fused = _rrf_fuse(list_a, list_b, k=60)
        ids = {doc.get("id") for _, doc in fused}

        assert ids == {"a", "b", "c", "d"}

    def test_empty_lists(self):
        """Empty input returns empty output."""
        fused = _rrf_fuse([], [], k=60)
        assert fused == []

    def test_single_list(self):
        """Single list preserves order."""
        docs = [{"id": "a"}, {"id": "b"}, {"id": "c"}]
        fused = _rrf_fuse(docs, k=60)
        ids = [doc.get("id") for _, doc in fused]
        assert ids == ["a", "b", "c"]

    def test_k_parameter_affects_scores(self):
        """Different k values change score magnitudes."""
        docs = [{"id": "a"}, {"id": "b"}]

        fused_k1 = _rrf_fuse(docs, k=1)
        fused_k60 = _rrf_fuse(docs, k=60)

        # With k=1, scores are larger (1/2 vs 1/61)
        score_k1 = fused_k1[0][0]
        score_k60 = fused_k60[0][0]
        assert score_k1 > score_k60
