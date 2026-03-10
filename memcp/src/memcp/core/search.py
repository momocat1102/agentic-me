"""Tiered search — keyword (stdlib) → BM25 → fuzzy → semantic → hybrid.

Auto-selects the best available search method based on installed packages.
Gracefully degrades when optional dependencies are not installed.
"""

from __future__ import annotations

import re
from typing import Any

from memcp.config import get_config
from memcp.core.fileutil import estimate_tokens

# Detect available search backends
BM25_AVAILABLE = False
try:
    import bm25s  # noqa: F401

    BM25_AVAILABLE = True
except ImportError:
    pass

FUZZY_AVAILABLE = False
try:
    from rapidfuzz import fuzz  # noqa: F401

    FUZZY_AVAILABLE = True
except ImportError:
    pass

SEMANTIC_AVAILABLE = False
try:
    import model2vec  # noqa: F401

    SEMANTIC_AVAILABLE = True
except ImportError:
    pass

if not SEMANTIC_AVAILABLE:
    try:
        import fastembed  # noqa: F401

        SEMANTIC_AVAILABLE = True
    except ImportError:
        pass

NUMPY_AVAILABLE = False
try:
    import numpy  # noqa: F401

    NUMPY_AVAILABLE = True
except ImportError:
    pass


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r"\w+", text.lower())


def keyword_search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    max_tokens: int = 0,
) -> list[dict[str, Any]]:
    """Stdlib-only keyword search. Always available.

    Scores documents by counting matching query tokens in content fields.
    """
    if not query.strip():
        return documents[:limit]

    query_tokens = set(_tokenize(query))
    scored = []

    for doc in documents:
        text = " ".join(
            [
                doc.get("content", ""),
                doc.get("summary", ""),
                " ".join(doc.get("tags", [])),
            ]
        ).lower()

        doc_tokens = set(_tokenize(text))
        matches = query_tokens & doc_tokens
        if matches:
            score = len(matches) / len(query_tokens)
            scored.append((score, doc))

    scored.sort(key=lambda x: -x[0])
    results = [{**doc, "_score": score} for score, doc in scored[:limit]]

    if max_tokens > 0:
        results = _apply_token_budget(results, max_tokens)

    return results


class _BM25Cache:
    """In-memory cache for BM25 index — avoids rebuilding for same corpus."""

    def __init__(self) -> None:
        self._corpus_hash: str = ""
        self._retriever: Any = None
        self._documents: list[dict[str, Any]] = []

    def _hash_corpus(self, documents: list[dict[str, Any]]) -> str:
        """Fast hash of document IDs/content to detect corpus changes."""
        import hashlib

        h = hashlib.md5()  # noqa: S324
        for doc in documents:
            h.update(doc.get("id", "").encode())
            h.update(doc.get("content", "")[:100].encode())
        return h.hexdigest()

    def search(
        self,
        query: str,
        documents: list[dict[str, Any]],
        limit: int,
    ) -> list[tuple[int, float]]:
        """Search, rebuilding index only if corpus changed.

        Returns list of (doc_index, score) tuples.
        """
        import bm25s as _bm25s

        corpus_hash = self._hash_corpus(documents)
        if corpus_hash != self._corpus_hash or self._retriever is None:
            corpus_texts = []
            for doc in documents:
                text = " ".join(
                    [
                        doc.get("content", ""),
                        doc.get("summary", ""),
                        " ".join(doc.get("tags", [])),
                    ]
                )
                corpus_texts.append(text)

            corpus_tokens = _bm25s.tokenize(corpus_texts)
            self._retriever = _bm25s.BM25()
            self._retriever.index(corpus_tokens)
            self._corpus_hash = corpus_hash
            self._documents = documents

        query_tokens = _bm25s.tokenize([query])
        doc_ids, scores = self._retriever.retrieve(query_tokens, k=min(limit, len(documents)))

        results = []
        for idx, score in zip(doc_ids[0], scores[0], strict=False):
            if score > 0:
                results.append((int(idx), float(score)))
        return results

    def invalidate(self) -> None:
        """Force rebuild on next search."""
        self._corpus_hash = ""
        self._retriever = None


_bm25_cache = _BM25Cache()


def invalidate_bm25_cache() -> None:
    """Invalidate the BM25 cache (call after remember/forget)."""
    _bm25_cache.invalidate()


def bm25_search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    max_tokens: int = 0,
) -> list[dict[str, Any]]:
    """BM25 ranked search using bm25s library with cached index."""
    if not BM25_AVAILABLE:
        return keyword_search(query, documents, limit, max_tokens)

    if not documents:
        return []

    scored = _bm25_cache.search(query, documents, limit)
    results = [{**documents[idx], "_score": score} for idx, score in scored]

    if max_tokens > 0:
        results = _apply_token_budget(results, max_tokens)

    return results


def fuzzy_search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    threshold: int = 60,
    max_tokens: int = 0,
) -> list[dict[str, Any]]:
    """Fuzzy matching using rapidfuzz for typo tolerance."""
    if not FUZZY_AVAILABLE:
        return keyword_search(query, documents, limit, max_tokens)

    from rapidfuzz import fuzz as _fuzz

    scored = []
    for doc in documents:
        text = " ".join(
            [
                doc.get("content", ""),
                doc.get("summary", ""),
                " ".join(doc.get("tags", [])),
            ]
        )
        score = _fuzz.partial_ratio(query.lower(), text.lower())
        if score >= threshold:
            scored.append((score, doc))

    scored.sort(key=lambda x: -x[0])
    results = [{**doc, "_score": score} for score, doc in scored[:limit]]

    if max_tokens > 0:
        results = _apply_token_budget(results, max_tokens)

    return results


def semantic_search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    max_tokens: int = 0,
) -> list[dict[str, Any]]:
    """Semantic search using embeddings + cosine similarity.

    Falls back to bm25/keyword if no provider or numpy available.
    """
    from memcp.core.embed_cache import get_embed_cache
    from memcp.core.embeddings import get_provider

    provider = get_provider()
    if provider is None or not NUMPY_AVAILABLE:
        return bm25_search(query, documents, limit, max_tokens)

    if not documents:
        return []

    import numpy as _np

    cache = get_embed_cache()
    provider_name = type(provider).__name__

    # Embed query (check cache first)
    cached_q = cache.get(query, provider_name)
    if cached_q is not None:
        query_vec = cached_q
    else:
        query_vec = provider.embed(query)
        cache.put(query, provider_name, query_vec)

    # Embed documents (using cache where possible)
    doc_vectors: list[list[float]] = []
    texts_to_embed: list[tuple[int, str]] = []

    for i, doc in enumerate(documents):
        text = " ".join(
            [
                doc.get("content", ""),
                doc.get("summary", ""),
                " ".join(doc.get("tags", [])),
            ]
        )
        cached_v = cache.get(text, provider_name)
        if cached_v is not None:
            doc_vectors.append(cached_v)
        else:
            doc_vectors.append([])  # placeholder
            texts_to_embed.append((i, text))

    # Batch embed uncached documents
    if texts_to_embed:
        indices, texts = zip(*texts_to_embed, strict=False)
        batch_vecs = provider.embed_batch(list(texts))
        for idx, vec, text in zip(indices, batch_vecs, texts, strict=False):
            doc_vectors[idx] = vec
            cache.put(text, provider_name, vec)

    # Cosine similarity scoring
    q = _np.asarray(query_vec, dtype=_np.float32)
    q_norm = float(_np.linalg.norm(q))
    if q_norm == 0:
        return bm25_search(query, documents, limit, max_tokens)

    scored: list[tuple[float, dict[str, Any]]] = []
    for i, doc in enumerate(documents):
        if not doc_vectors[i]:
            continue
        v = _np.asarray(doc_vectors[i], dtype=_np.float32)
        v_norm = float(_np.linalg.norm(v))
        if v_norm == 0:
            continue
        sim = float(_np.dot(q, v) / (q_norm * v_norm))
        sim = max(0.0, min(1.0, sim))
        if sim > 0:
            scored.append((sim, {**doc, "_score": sim}))

    scored.sort(key=lambda x: -x[0])
    results = [doc for _, doc in scored[:limit]]

    if max_tokens > 0:
        results = _apply_token_budget(results, max_tokens)

    return results


def _rrf_fuse(
    *ranked_lists: list[dict[str, Any]],
    k: int = 60,
) -> list[tuple[float, dict[str, Any]]]:
    """Reciprocal Rank Fusion across multiple ranked result lists.

    RRF formula: score(d) = sum(1 / (k + rank_i(d))) for each list.
    k=60 is the standard constant from the original RRF paper.
    """
    scores: dict[str, float] = {}
    docs: dict[str, dict[str, Any]] = {}

    for ranked in ranked_lists:
        for rank, doc in enumerate(ranked):
            doc_id = doc.get("id", "") or doc.get("content", "")[:50]
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
            if doc_id not in docs:
                docs[doc_id] = doc

    fused = [(score, docs[doc_id]) for doc_id, score in scores.items()]
    fused.sort(key=lambda x: -x[0])
    return fused


def hybrid_search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    max_tokens: int = 0,
    alpha: float = 0.0,
    fusion: str = "rrf",
) -> list[dict[str, Any]]:
    """Hybrid search — fuses BM25 + semantic using RRF (default) or weighted alpha.

    fusion="rrf": Reciprocal Rank Fusion (better for combining diverse signals).
    fusion="alpha": Weighted alpha blend (legacy behavior).

    For alpha mode:
      alpha controls the blend: 0.0 = use env default, 1.0 = pure semantic.
      Default alpha from MEMCP_SEARCH_ALPHA env var (default: 0.6).
    """
    import os

    from memcp.core.embeddings import get_provider

    provider = get_provider()
    if provider is None or not NUMPY_AVAILABLE:
        return bm25_search(query, documents, limit, max_tokens)

    if not documents:
        return []

    # Get ranked lists from each source
    bm25_results = bm25_search(query, documents, limit=len(documents), max_tokens=0)
    sem_results = semantic_search(query, documents, limit=len(documents), max_tokens=0)

    if fusion == "rrf":
        fused = _rrf_fuse(bm25_results, sem_results, k=get_config().rrf_k)
        results = [{**doc, "_score": round(score, 6)} for score, doc in fused[:limit]]
    else:
        # Legacy weighted alpha fusion
        if alpha == 0.0:
            alpha = float(os.getenv("MEMCP_SEARCH_ALPHA", "0.6"))

        bm25_scores: dict[str, float] = {}
        max_bm25 = 0.0
        for r in bm25_results:
            key = f"{r.get('id', '')}:{r.get('content', '')[:50]}"
            score = r.get("_score", 0.0)
            bm25_scores[key] = score
            max_bm25 = max(max_bm25, score)

        sem_scores: dict[str, float] = {}
        for r in sem_results:
            key = f"{r.get('id', '')}:{r.get('content', '')[:50]}"
            sem_scores[key] = r.get("_score", 0.0)

        if max_bm25 > 0:
            bm25_scores = {k: v / max_bm25 for k, v in bm25_scores.items()}

        fused_alpha: list[tuple[float, dict[str, Any]]] = []
        for doc in documents:
            key = f"{doc.get('id', '')}:{doc.get('content', '')[:50]}"
            s_bm25 = bm25_scores.get(key, 0.0)
            s_sem = sem_scores.get(key, 0.0)
            fused_score = alpha * s_sem + (1 - alpha) * s_bm25
            if fused_score > 0:
                fused_alpha.append((fused_score, {**doc, "_score": round(fused_score, 4)}))

        fused_alpha.sort(key=lambda x: -x[0])
        results = [doc for _, doc in fused_alpha[:limit]]

    if max_tokens > 0:
        results = _apply_token_budget(results, max_tokens)

    return results


def search(
    query: str,
    documents: list[dict[str, Any]],
    limit: int = 10,
    max_tokens: int = 0,
    method: str = "auto",
) -> list[dict[str, Any]]:
    """Search using the best available method.

    Auto-selects: hybrid > bm25 > keyword.

    Args:
        query: Search query
        documents: List of document dicts with 'content', 'tags', etc.
        limit: Max results
        max_tokens: Token budget (0 = unlimited)
        method: "auto", "keyword", "bm25", "fuzzy", "semantic", "hybrid"
    """
    if not query.strip():
        results = documents[:limit]
        if max_tokens > 0:
            results = _apply_token_budget(results, max_tokens)
        return results

    if method == "keyword":
        return keyword_search(query, documents, limit, max_tokens)
    elif method == "bm25":
        return bm25_search(query, documents, limit, max_tokens)
    elif method == "fuzzy":
        return fuzzy_search(query, documents, limit, max_tokens=max_tokens)
    elif method == "semantic":
        return semantic_search(query, documents, limit, max_tokens)
    elif method == "hybrid":
        return hybrid_search(query, documents, limit, max_tokens, fusion="rrf")
    elif method == "hybrid-alpha":
        return hybrid_search(query, documents, limit, max_tokens, fusion="alpha")
    elif method == "auto":
        if SEMANTIC_AVAILABLE and NUMPY_AVAILABLE and BM25_AVAILABLE:
            return hybrid_search(query, documents, limit, max_tokens, fusion="rrf")
        if BM25_AVAILABLE:
            return bm25_search(query, documents, limit, max_tokens)
        return keyword_search(query, documents, limit, max_tokens)
    else:
        from memcp.core.errors import ValidationError

        raise ValidationError(
            f"Unknown search method {method!r}. "
            "Must be: auto, keyword, bm25, fuzzy, semantic, hybrid, hybrid-alpha"
        )


def search_all(
    query: str,
    limit: int = 10,
    source: str = "all",
    max_tokens: int = 0,
    project: str = "",
    scope: str = "project",
    method: str = "auto",
) -> dict[str, Any]:
    """Search across memory insights and context chunks.

    Args:
        query: Search query
        limit: Max results
        source: "all", "memory", "contexts"
        max_tokens: Token budget (0 = unlimited)
        project: Filter by project
        scope: "project", "session", "all"
        method: Search method
    """
    from memcp.core.memory import recall

    results: list[dict[str, Any]] = []

    # Search memory insights
    if source in ("all", "memory"):
        # Fetch candidate insights via recall (handles project/session scoping).
        # Pass empty query so recall returns all candidates without its own
        # keyword filtering; scoring is done below via search() instead.
        insights = recall(
            query="",
            limit=limit * 5,  # over-fetch so search() has enough candidates to score
            project=project,
            scope=scope,
        )
        # Score insights through the same search pipeline as context chunks
        # so they get _score values and compete fairly in re-ranking
        if query.strip() and insights:
            insights = search(query, insights, limit=limit, method=method)
        else:
            insights = insights[:limit]
        for ins in insights:
            ins["_source"] = "memory"
        results.extend(insights)

    # Search context chunks
    if source in ("all", "contexts"):
        config = get_config()
        chunks_dir = config.chunks_dir

        if chunks_dir.exists():
            chunk_docs = []
            for ctx_dir in chunks_dir.iterdir():
                if not ctx_dir.is_dir():
                    continue

                index_path = ctx_dir / "index.json"
                index = None
                try:
                    from memcp.core.fileutil import locked_read_json

                    index = locked_read_json(index_path)
                except Exception:
                    continue

                if index is None:
                    continue

                for chunk_info in index.get("chunks", []):
                    chunk_path = ctx_dir / f"{chunk_info['index']:04d}.md"
                    if not chunk_path.exists():
                        continue
                    content = chunk_path.read_text(encoding="utf-8")
                    chunk_docs.append(
                        {
                            "content": content,
                            "id": f"{ctx_dir.name}:{chunk_info['index']}",
                            "context_name": ctx_dir.name,
                            "chunk_index": chunk_info["index"],
                            "token_count": chunk_info.get("tokens", estimate_tokens(content)),
                            "tags": [],
                            "_source": "context",
                        }
                    )

            if chunk_docs:
                chunk_results = search(query, chunk_docs, limit=limit, method=method)
                for r in chunk_results:
                    r["_source"] = "context"
                results.extend(chunk_results)

    # Re-rank combined results if we have scores
    results_with_score = [r for r in results if "_score" in r]
    results_without_score = [r for r in results if "_score" not in r]

    results_with_score.sort(key=lambda x: -x.get("_score", 0))
    combined = results_with_score + results_without_score
    combined = combined[:limit]

    if max_tokens > 0:
        combined = _apply_token_budget(combined, max_tokens)

    # Determine actual method used
    if method == "auto":
        if SEMANTIC_AVAILABLE and NUMPY_AVAILABLE and BM25_AVAILABLE:
            actual_method = "hybrid"
        elif BM25_AVAILABLE:
            actual_method = "bm25"
        else:
            actual_method = "keyword"
    else:
        actual_method = method

    return {
        "query": query,
        "method": actual_method,
        "count": len(combined),
        "results": combined,
        "capabilities": {
            "bm25": BM25_AVAILABLE,
            "fuzzy": FUZZY_AVAILABLE,
            "semantic": SEMANTIC_AVAILABLE,
            "hybrid": SEMANTIC_AVAILABLE and BM25_AVAILABLE,
        },
    }


def _apply_token_budget(results: list[dict[str, Any]], max_tokens: int) -> list[dict[str, Any]]:
    """Trim results to fit within a token budget."""
    budgeted = []
    tokens_used = 0

    for r in results:
        r_tokens = r.get("token_count", estimate_tokens(r.get("content", "")))
        if tokens_used + r_tokens > max_tokens and budgeted:
            break
        budgeted.append(r)
        tokens_used += r_tokens

    return budgeted
