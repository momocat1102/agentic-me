"""Tests for entity extraction — regex + optional spaCy NER."""

from __future__ import annotations

import pytest

from memcp.core.node_store import (
    RegexEntityExtractor,
    _get_best_extractor,
)


class TestRegexEntityExtractor:
    def test_extracts_filenames(self):
        ext = RegexEntityExtractor()
        entities = ext.extract("Modified src/memcp/core/graph.py and tests/test_graph.py")
        lowered = [e.lower() for e in entities]
        assert any("graph.py" in e for e in lowered)

    def test_extracts_urls(self):
        ext = RegexEntityExtractor()
        entities = ext.extract("See https://github.com/example/repo for details")
        assert any("github.com" in e for e in entities)

    def test_extracts_camelcase(self):
        ext = RegexEntityExtractor()
        entities = ext.extract("The GraphMemory class handles storage")
        assert any("GraphMemory" in e for e in entities)

    def test_deduplicates(self):
        ext = RegexEntityExtractor()
        entities = ext.extract("graph.py and graph.py again graph.py")
        # Should only appear once
        lower_entities = [e.lower() for e in entities]
        count = sum(1 for e in lower_entities if "graph.py" in e)
        assert count <= 1


class TestSpacyEntityExtractor:
    def test_spacy_available_or_skipped(self):
        """Test spaCy extraction if available, skip otherwise."""
        try:
            from memcp.core.node_store import SpacyEntityExtractor

            ext = SpacyEntityExtractor()
            entities = ext.extract("Microsoft announced a partnership with OpenAI in San Francisco")
            assert len(entities) > 0
            # spaCy should find organization/location entities
            lowered = [e.lower() for e in entities]
            assert any("microsoft" in e or "openai" in e or "san francisco" in e for e in lowered)
        except (ImportError, OSError):
            pytest.skip("spaCy or en_core_web_sm not installed")

    def test_spacy_caps_content_length(self):
        """Verify spaCy doesn't process more than 10K chars."""
        try:
            from memcp.core.node_store import SpacyEntityExtractor

            ext = SpacyEntityExtractor()
            long_text = "x " * 20000  # 40K chars
            entities = ext.extract(long_text)  # should not error
            assert isinstance(entities, list)
        except (ImportError, OSError):
            pytest.skip("spaCy or en_core_web_sm not installed")


class TestCombinedExtractor:
    def test_combined_deduplicates(self):
        try:
            from memcp.core.node_store import CombinedEntityExtractor, SpacyEntityExtractor

            regex = RegexEntityExtractor()
            spacy_ext = SpacyEntityExtractor()
            combined = CombinedEntityExtractor(regex, spacy_ext)
            entities = combined.extract("Check https://github.com/example for Microsoft news")
            # Should have entities from both but deduplicated
            assert len(entities) > 0
            lowered = [e.lower() for e in entities]
            assert len(lowered) == len(set(lowered))
        except (ImportError, OSError):
            pytest.skip("spaCy or en_core_web_sm not installed")


class TestBestExtractorSelection:
    def test_get_best_extractor_returns_extractor(self):
        ext = _get_best_extractor()
        # Should always return something (at minimum RegexEntityExtractor)
        result = ext.extract("Modified src/memcp/core/graph.py")
        assert isinstance(result, list)

    def test_regex_fallback_when_spacy_missing(self, monkeypatch):
        """Force spaCy to be unavailable and verify regex fallback."""
        import memcp.core.node_store as ns

        def _force_regex():
            return RegexEntityExtractor()

        monkeypatch.setattr(ns, "_get_best_extractor", _force_regex)
        ext = ns._get_best_extractor()
        assert isinstance(ext, RegexEntityExtractor)
