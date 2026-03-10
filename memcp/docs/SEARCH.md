# MemCP Search System

MemCP uses a tiered search architecture that auto-selects the best available method based on installed packages. Every tier gracefully degrades — the system always works, even with zero optional dependencies.

## Tiered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Hybrid RRF Fusion (BM25 + Semantic + Graph scores)     │  pip install memcp[semantic,search]
├─────────────────────────────────────────────────────────┤
│  Semantic Search (model2vec or fastembed + cosine sim)   │  pip install memcp[semantic]
├─────────────────────────────────────────────────────────┤
│  Fuzzy Search (rapidfuzz, Levenshtein-based)            │  pip install memcp[fuzzy]
├─────────────────────────────────────────────────────────┤
│  BM25 Search (bm25s, sparse matrix ranked retrieval)    │  pip install memcp[search]
├─────────────────────────────────────────────────────────┤
│  Keyword Search (stdlib — always available)              │  (built-in)
└─────────────────────────────────────────────────────────┘
```

## Auto-Selection Logic

`search()` picks the best available method:

1. If semantic + BM25 both available → **hybrid** (fuses both scores)
2. If BM25 available → **bm25** (ranked keyword search)
3. Otherwise → **keyword** (stdlib tokenization + set intersection)

You can also force a specific method: `search(query, method="fuzzy")`.

## Tier Details

### Keyword Search (always available)

- **Deps**: None (stdlib only)
- **How it works**: Tokenizes query and documents via `re.findall(r"\w+", text.lower())`. Scores by counting matching tokens: `score = len(matches) / len(query_tokens)`.
- **Searches**: `content`, `summary`, and `tags` fields
- **Strengths**: Zero deps, fast, predictable
- **Weaknesses**: No ranking sophistication, exact token match only

### BM25 Search

- **Deps**: `bm25s>=0.2.0` (brings numpy, scipy)
- **Install**: `pip install memcp[search]`
- **How it works**: Builds a sparse BM25 index over the corpus using `bm25s.BM25()`. Tokenization via `bm25s.tokenize()`. Retrieval returns scored document IDs.
- **Persistent cache**: The BM25 index is cached in memory with a corpus-hash key. The cache is invalidated when insights are added or removed (`remember()` and `forget()` call `invalidate_bm25_cache()`), so the index is only rebuilt when the corpus changes — not on every query.
- **Strengths**: TF-IDF weighting, handles term frequency and document length, 500x faster than `rank_bm25`
- **Weaknesses**: Keyword-based — doesn't understand synonyms or paraphrases

### Fuzzy Search

- **Deps**: `rapidfuzz>=3.0` (10x faster than thefuzz, no C dep)
- **Install**: `pip install memcp[fuzzy]`
- **How it works**: Uses `rapidfuzz.fuzz.partial_ratio()` for Levenshtein-based partial matching. Default threshold: 60%.
- **Strengths**: Typo-tolerant — finds "autentication" when searching for "authentication"
- **Weaknesses**: Not suitable for semantic matching, can be noisy on short queries

### Semantic Search

- **Deps**: `model2vec>=0.4.0` + `numpy>=1.24.0` (or `fastembed>=0.5.0` + `numpy>=1.24.0`)
- **Install**: `pip install memcp[semantic]` (model2vec) or `pip install memcp[semantic-hq]` (fastembed)
- **How it works**: Embeds query and all documents into dense vectors, then computes cosine similarity. Results are cached via `embed_cache.py` (uses `diskcache` if installed).
- **HNSW backend**: When `usearch>=2.0` is installed (`pip install memcp[hnsw]`), the vector store uses an HNSW (Hierarchical Navigable Small World) index for O(log N) approximate nearest neighbor search, replacing the default O(N*D) brute-force cosine scan. This scales to 100K+ vectors. Falls back to brute-force `VectorStore` when `usearch` is not installed.
- **Providers**:

| Provider | Model | Dimensions | Size | Speed |
|----------|-------|-----------|------|-------|
| Model2VecProvider (default) | `minishlab/potion-multilingual-128M` | 256 | ~30MB | Very fast |
| FastEmbedProvider | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | 384 | ~200MB | More accurate |

- **Provider selection**: `MEMCP_EMBEDDING_PROVIDER` env var (`model2vec`, `fastembed`, or `auto`). Auto tries model2vec first, then fastembed.
- **Strengths**: Understands synonyms, paraphrases, semantic similarity
- **Weaknesses**: Requires model download, higher memory usage

### Hybrid Search (RRF Fusion)

- **Deps**: BM25 + Semantic (both required)
- **Install**: `pip install memcp[search,semantic]`
- **How it works**: Runs BM25, semantic, and graph-boosted searches, then fuses results using **Reciprocal Rank Fusion (RRF)**:

```
score(d) = Σ 1/(k + rank_i(d))
```

Where `k=60` (standard constant from Cormack et al. 2009) and `rank_i(d)` is the 1-indexed position of document `d` in ranked list `i`.

- **Three-way fusion**: BM25 ranked list + semantic ranked list + graph-boosted ranked list are fused via RRF. This is score-agnostic — no normalization needed.
- **RRF K**: Default 60. Configurable via `MEMCP_RRF_K` env var.
- **Strengths**: Score-agnostic (no BM25 normalization issues), robust to outliers, naturally extends to 3+ sources
- **Weaknesses**: Rank-only — ignores score magnitude differences between sources

### Hybrid Search (Alpha Blend) — Legacy

- **Method**: `method="hybrid-alpha"`
- **How it works**: The original fusion method, kept for backward compatibility:

```
final_score = alpha * semantic_score + (1 - alpha) * bm25_score_normalized
```

- **Alpha**: Default 0.6 (60% semantic, 40% BM25). Configurable via `MEMCP_SEARCH_ALPHA` env var.

## Token Budgeting

All search functions support `max_tokens` parameter:

```
memcp_search("query", max_tokens=500)
```

When set, results are returned until the cumulative `token_count` exceeds the budget. The first result is always included regardless of budget. Token counts are computed via `len(content) // 4` heuristic.

## Cross-Source Search

`memcp_search()` searches across two sources:

1. **Memory insights** — Stored in `graph.db` nodes, searched via `memcp_recall()`
2. **Context chunks** — Stored in `~/.memcp/chunks/*/`, scanned from disk

The `source` parameter controls scope:
- `"all"` (default) — searches both
- `"memory"` — insights only
- `"contexts"` — chunks only

Results from both sources are combined and re-ranked by score.

## Embedding Cache

When `diskcache>=5.6.0` is installed, embeddings are cached by content hash:

- First embedding of a text → computed by provider, stored in disk cache (`~/.memcp/cache/`)
- Subsequent embeddings of the same text → instant return from cache
- Cache key: `content_hash(text) + provider_name`

Install: `pip install memcp[cache]`

## Graceful Degradation

The search system never fails due to missing dependencies:

| What's installed | Search method used |
|-----------------|-------------------|
| Nothing (core only) | Keyword |
| `bm25s` | BM25 |
| `model2vec` + `numpy` | Semantic (falls back to BM25/keyword for scoring) |
| `bm25s` + `model2vec` + `numpy` | Hybrid |
| `rapidfuzz` | Fuzzy (called explicitly via `method="fuzzy"`) |

Each function checks availability flags at import time:
- `BM25_AVAILABLE` — `bm25s` importable
- `FUZZY_AVAILABLE` — `rapidfuzz.fuzz` importable
- `SEMANTIC_AVAILABLE` — `model2vec` or `fastembed` importable
- `NUMPY_AVAILABLE` — `numpy` importable

## Installation Summary

```bash
# Core only (keyword search)
pip install memcp

# BM25 ranked search
pip install memcp[search]

# Fuzzy matching
pip install memcp[fuzzy]

# Semantic search (fast, small model)
pip install memcp[semantic]

# Semantic search (higher quality, larger model)
pip install memcp[semantic-hq]

# Embedding cache
pip install memcp[cache]

# HNSW vector index (O(log N) approximate nearest neighbor)
pip install memcp[hnsw]

# Everything
pip install memcp[all]
```
