# ADR-002: Tiered Search Architecture

## Status

Accepted

## Date

2026-02-07

## Context

MemCP stores knowledge in two forms: structured insights (memory) and unstructured content (context variables/chunks). Users need to search across both, with queries ranging from exact keyword lookups to fuzzy typo-tolerant matches to semantic similarity.

The search system must:

- **Always work** — A fresh `pip install memcp` (no optional deps) must still support search
- **Scale incrementally** — Users install better search capabilities as needed
- **Avoid large mandatory downloads** — Embedding models can be 30-400MB; this should not be required
- **Support the RLM pattern** — Sub-agents call `memcp_search()` and should get the best available results automatically

Research context: BM25 outperforms pure embeddings on many retrieval tasks (Letta benchmark: filesystem 74.0% vs mem0 68.5%). Hybrid fusion (BM25 + semantic) consistently outperforms either alone.

## Decision

Implement a **5-tier search stack** with automatic tier selection based on installed dependencies:

| Tier | Method | Dependency | What It Does |
|------|--------|-----------|--------------|
| 1 | Keyword | stdlib (always available) | Tokenize query, score by token overlap in content/tags/summary |
| 2 | BM25 | `bm25s` (optional) | Sparse matrix BM25 ranking — statistically-grounded term frequency scoring |
| 3 | Fuzzy | `rapidfuzz` (optional) | Levenshtein-based matching — tolerates typos and morphological variations |
| 4 | Semantic | `model2vec` or `fastembed` (optional) | Dense embedding cosine similarity — finds synonyms and paraphrases |
| 5 | Hybrid | BM25 + Semantic (both required) | Weighted fusion: `0.6 * semantic + 0.4 * BM25` (tunable via `MEMCP_SEARCH_ALPHA`) |

The `search()` function auto-selects the best available tier: hybrid > BM25 > keyword. Each tier is gated by an `*_AVAILABLE` boolean flag set at import time.

All tiers share a common interface: `(query, limit, max_tokens) → list[SearchResult]`.

## Consequences

### Positive

- **Zero-dep baseline**: Core install always has keyword search. No feature is broken without optional deps.
- **Graceful degradation**: If `model2vec` is unavailable, search silently falls back to BM25 or keyword. No errors, no config needed.
- **User choice**: `pip install memcp[search]` for BM25, `[semantic]` for embeddings, `[all]` for everything.
- **Hybrid fusion wins**: When both BM25 and semantic are available, the hybrid tier captures both exact matches and semantic similarity.
- **Token budgeting**: All tiers respect `max_tokens` — results are returned until the token budget is exhausted.

### Negative

- **Multiple code paths**: Each tier has its own scoring logic. Five tiers means five paths to test (plus combinations).
- **Import-time detection**: `*_AVAILABLE` flags are set once at import. Installing a new dep requires restarting the server.
- **Alpha tuning**: The `0.6/0.4` hybrid weight is a reasonable default but not universally optimal. Different corpora may benefit from different ratios.

## Alternatives Considered

### Single Embedding-Only Search (like mem0)

Use dense embeddings for all queries. Rejected because:
- Requires a mandatory 30-400MB model download on first install
- BM25 outperforms pure embeddings on exact keyword and entity-name queries
- Research shows hybrid always beats embedding-only (Letta benchmarks)

### Elasticsearch / Tantivy

Use a dedicated full-text search engine. Rejected because:
- Adds infrastructure dependency (Elasticsearch requires JVM, server process)
- Overkill for MemCP's data volume (<100K documents)
- `bm25s` provides BM25 with pure numpy — no external process

### Fixed Pipeline (always run all tiers)

Always run keyword + BM25 + semantic and merge results. Rejected because:
- Forces users to install all optional deps
- Slower than running only the best available tier
- Unnecessary when only one tier is available

### bm25s over rank_bm25

Within the BM25 tier, we chose `bm25s` over `rank_bm25` because:
- `bm25s` uses sparse matrices (scipy) — 500x faster on large corpora
- `rank_bm25` loads everything into Python lists — O(n) per query
- `bm25s` has numpy-based batch scoring; `rank_bm25` is pure Python

### model2vec over sentence-transformers

For the default semantic tier, we chose `model2vec` over `sentence-transformers` because:
- `model2vec` produces static embeddings from ~8-30MB models (no ONNX, no PyTorch)
- `sentence-transformers` requires PyTorch (~2GB) or ONNX Runtime (~500MB)
- `model2vec` is 500x faster for embedding generation
- `fastembed` (ONNX-based) is offered as a `[semantic-hq]` extra for users who need higher quality
