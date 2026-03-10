"""Embedding providers — Model2Vec (fast) and FastEmbed (accurate).

Auto-selects the best available provider. Gracefully degrades if
no embedding libraries are installed.

Provider selection:
  1. MEMCP_EMBEDDING_PROVIDER env var ("model2vec" or "fastembed")
  2. Auto-detect: model2vec > fastembed > None
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        """Embed a single text into a vector."""

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts into vectors."""

    @abstractmethod
    def dim(self) -> int:
        """Return the embedding dimension."""


class Model2VecProvider(EmbeddingProvider):
    """Model2Vec static embeddings — fast, small (~30MB, 256 dims)."""

    MODEL_NAME = "minishlab/potion-multilingual-128M"
    DIM = 256

    def __init__(self, model_name: str = "") -> None:
        from model2vec import StaticModel

        self._model = StaticModel.from_pretrained(model_name or self.MODEL_NAME)

    def embed(self, text: str) -> list[float]:
        result = self._model.encode([text])
        return result[0].tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        result = self._model.encode(texts)
        return [v.tolist() for v in result]

    def dim(self) -> int:
        return self.DIM


class FastEmbedProvider(EmbeddingProvider):
    """FastEmbed ONNX embeddings — higher quality (~200MB, 384 dims)."""

    MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    DIM = 384

    def __init__(self, model_name: str = "") -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model_name=model_name or self.MODEL_NAME)

    def embed(self, text: str) -> list[float]:
        results = list(self._model.embed([text]))
        return results[0].tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = list(self._model.embed(texts))
        return [v.tolist() for v in results]

    def dim(self) -> int:
        return self.DIM


# ── Singleton with lazy initialization ────────────────────────────────

_cached_provider: EmbeddingProvider | None = None
_provider_loaded: bool = False


def get_provider() -> EmbeddingProvider | None:
    """Get the cached embedding provider (singleton, lazy init).

    Reads MEMCP_EMBEDDING_PROVIDER env var (default: auto-detect).
    Reads MEMCP_EMBEDDING_MODEL env var for custom model name.
    Returns None if no embedding library is installed.
    """
    global _cached_provider, _provider_loaded

    if _provider_loaded:
        return _cached_provider

    _provider_loaded = True
    provider_name = os.getenv("MEMCP_EMBEDDING_PROVIDER", "auto").lower()
    model_name = os.getenv("MEMCP_EMBEDDING_MODEL", "")

    if provider_name == "fastembed":
        try:
            _cached_provider = FastEmbedProvider(model_name)
        except (ImportError, Exception):
            _cached_provider = None
    elif provider_name == "model2vec":
        try:
            _cached_provider = Model2VecProvider(model_name)
        except (ImportError, Exception):
            _cached_provider = None
    else:  # auto
        try:
            _cached_provider = Model2VecProvider(model_name)
        except (ImportError, Exception):
            try:
                _cached_provider = FastEmbedProvider(model_name)
            except (ImportError, Exception):
                _cached_provider = None

    return _cached_provider


def reset_provider() -> None:
    """Reset the cached provider (for testing)."""
    global _cached_provider, _provider_loaded
    _cached_provider = None
    _provider_loaded = False
