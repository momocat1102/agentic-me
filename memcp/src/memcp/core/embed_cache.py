"""Embedding cache — optional diskcache-backed memoization.

Caches text -> vector mappings to avoid re-embedding identical content.
Works without diskcache (in-memory LRU fallback with limited capacity).
"""

from __future__ import annotations

import hashlib
from typing import Any

DISKCACHE_AVAILABLE = False
try:
    import diskcache  # noqa: F401

    DISKCACHE_AVAILABLE = True
except ImportError:
    pass


class EmbedCache:
    """Cache for embedding vectors, keyed by content hash.

    Uses diskcache if available (persistent, unlimited capacity).
    Falls back to a simple in-memory dict with size limit.
    """

    def __init__(self, cache_dir: str = "", max_memory_items: int = 5000) -> None:
        self._disk_cache: Any = None
        self._memory_cache: dict[str, list[float]] = {}
        self._max_memory = max_memory_items

        if DISKCACHE_AVAILABLE and cache_dir:
            try:
                import diskcache as _dc

                self._disk_cache = _dc.Cache(cache_dir)
            except Exception:
                self._disk_cache = None

    def _key(self, text: str, provider_name: str) -> str:
        """Generate cache key from text content and provider."""
        h = hashlib.sha256(f"{provider_name}:{text}".encode()).hexdigest()[:24]
        return f"emb:{h}"

    def get(self, text: str, provider_name: str) -> list[float] | None:
        """Look up a cached embedding. Returns None on miss."""
        key = self._key(text, provider_name)
        if self._disk_cache is not None:
            try:
                val = self._disk_cache.get(key)
                if val is not None:
                    return val
            except Exception:
                pass
        return self._memory_cache.get(key)

    def put(self, text: str, provider_name: str, vector: list[float]) -> None:
        """Store an embedding in the cache."""
        key = self._key(text, provider_name)
        if self._disk_cache is not None:
            try:
                self._disk_cache.set(key, vector)
                return
            except Exception:
                pass
        # Memory fallback with eviction
        if len(self._memory_cache) >= self._max_memory:
            # Evict oldest (first inserted, since dict is ordered in 3.7+)
            oldest_key = next(iter(self._memory_cache))
            del self._memory_cache[oldest_key]
        self._memory_cache[key] = vector

    def close(self) -> None:
        """Close the disk cache if open."""
        if self._disk_cache is not None:
            import contextlib

            with contextlib.suppress(Exception):
                self._disk_cache.close()


# ── Module-level singleton ─────────────────────────────────────────────

_cache: EmbedCache | None = None


def get_embed_cache() -> EmbedCache:
    """Get or create the global embed cache singleton."""
    global _cache
    if _cache is None:
        from memcp.config import get_config

        config = get_config()
        cache_dir = str(config.cache_dir / "embeddings") if DISKCACHE_AVAILABLE else ""
        _cache = EmbedCache(cache_dir=cache_dir)
    return _cache


def reset_embed_cache() -> None:
    """Reset the cache singleton (for testing)."""
    global _cache
    if _cache is not None:
        _cache.close()
    _cache = None
