# ADR-012: Reciprocal Rank Fusion Search

## Status

Accepted

## Date

2026-02-18

## Context

MemCP's hybrid search fuses BM25 and semantic scores using a weighted alpha blend:

```
final_score = alpha * semantic_score + (1 - alpha) * bm25_score_normalized
```

This has two problems:

1. **Score distribution mismatch**: BM25 scores are unbounded and must be normalized to [0,1]. Semantic (cosine) scores are naturally in [0,1]. Normalization via min-max scaling is sensitive to outliers — one very high BM25 score compresses all others.

2. **Alpha tuning is fragile**: The default `alpha=0.6` works for average queries, but some queries benefit from more keyword weight (exact term lookup) while others need more semantic weight (synonym matching). A single alpha can't adapt.

Reciprocal Rank Fusion (RRF) is a well-studied score-agnostic fusion method that combines ranked lists without needing score normalization. It uses only the rank position from each source.

## Decision

Add RRF as the default hybrid fusion method:

```
score(d) = Σ 1/(k + rank_i(d))
```

Where `k=60` (standard constant from the Cormack et al. 2009 paper) and `rank_i(d)` is the 1-indexed position of document `d` in ranked list `i`.

### Implementation

- Add `_rrf_fuse(*ranked_lists, k=60)` function in `search.py`
- Update `hybrid_search()` to fuse three sources via RRF:
  1. BM25 ranked results
  2. Semantic ranked results
  3. Graph-boosted results (from `GraphTraversal.query()` if available)
- Keep alpha-based fusion as `method="hybrid-alpha"` for backward compatibility
- New default: `method="hybrid"` uses RRF

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEMCP_RRF_K` | `60` | RRF smoothing constant (higher = more uniform blending) |

## Consequences

### Positive

- **Score-agnostic**: No need to normalize BM25 scores — RRF works on rank positions only.
- **Robust to outliers**: A document with an extremely high BM25 score doesn't dominate; what matters is its rank.
- **Three-way fusion**: Adding graph scores as a third signal is natural — just another ranked list. Alpha blend only supports two sources.
- **Well-studied**: RRF is used in production at Elastic, Vespa, and other search engines. The `k=60` constant is empirically validated.
- **Backward compatible**: `method="hybrid-alpha"` preserves the old behavior for users who prefer it.

### Negative

- **Rank-only, not score-aware**: If one source gives a document a score of 0.99 and another gives 0.51, RRF treats them the same if they have the same rank. The magnitude information is lost.
- **k sensitivity**: The constant `k=60` works well in general but may not be optimal for MemCP's specific document sizes. Exposed as `MEMCP_RRF_K` for tuning.
- **Three-source overhead**: Fetching graph-boosted results adds a third query pass. Mitigated by limiting graph results to the top-N already returned.

## Alternatives Considered

### Improved Alpha Blend with Better Normalization

Use Z-score normalization or percentile-rank normalization instead of min-max. Rejected because this adds complexity without addressing the fundamental issue that different queries need different alpha values.

### Learned Fusion (Linear Combination with Query-Dependent Weights)

Train a small model to predict optimal weights per query. Rejected because:
- Requires training data (relevance judgments) we don't have
- Adds ML complexity to a search system that aims for simplicity
- RRF achieves similar robustness without any training

### Borda Count Fusion

Assign points based on rank (N points for rank 1, N-1 for rank 2, etc.) and sum. Rejected because Borda count is more sensitive to the total number of candidates and RRF's `1/(k+rank)` formula is more robust with varying list lengths.
