# ADR-013: Memory Feedback and Consolidation

## Status

Accepted

## Date

2026-02-18

## Context

MemCP stores insights but has no mechanism for users to signal which ones are valuable and which are misleading. Without feedback:

- Low-quality insights rank alongside high-quality ones indefinitely
- Near-duplicate insights accumulate, cluttering search results
- The system can't learn from usage patterns beyond Hebbian edge strengthening

Two capabilities are needed:

1. **Feedback**: A way to mark insights as helpful or misleading, affecting future ranking.
2. **Consolidation**: A way to detect and merge near-duplicate insights.

## Decision

### Memory Feedback API (`memcp_reinforce`)

Add a new MCP tool that lets users provide feedback on insights:

- `memcp_reinforce(insight_id, helpful=True, note="")`
- `helpful=True`: `feedback_score += 0.1`, boost all connected edges by 0.02
- `helpful=False`: `feedback_score -= 0.2`, weaken all connected edges by 0.05
- `feedback_score` clamped to `[-1.0, 1.0]`
- Asymmetric: negative feedback has 2x the magnitude, since false positives are more harmful than missed true positives

In `query()` ranking, feedback adjusts the total score:

```
total_score *= (1 + feedback_score * 0.3)
```

A fully helpful insight (+1.0) gets a 30% boost. A fully misleading one (-1.0) gets a 30% penalty.

### Schema Migration

Add `feedback_score REAL DEFAULT 0.0` column to the `nodes` table.

### Memory Consolidation

Two new MCP tools:

1. **`memcp_consolidation_preview(threshold, limit, project)`** — Dry-run: find groups of similar insights above the threshold. Uses embedding similarity (if available) or keyword Jaccard overlap. Groups found via Union-Find.

2. **`memcp_consolidate(group_ids, keep_id, merged_content)`** — Merge a group into one insight:
   - Keep the insight with `keep_id` (or the most accessed one)
   - Union all tags and entities
   - Keep the highest importance level
   - Sum access counts
   - Re-point edges from deleted nodes to the kept node
   - Delete the rest

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEMCP_CONSOLIDATION_THRESHOLD` | `0.85` | Similarity threshold for grouping near-duplicates |

### Entity Extraction Enhancement (spaCy NER)

As part of this phase, entity extraction is enhanced with an optional spaCy NER extractor:

- `SpacyEntityExtractor` uses `en_core_web_sm` (~12MB) for natural language entity recognition
- `CombinedEntityExtractor` merges regex patterns (files, modules, URLs) with spaCy NER (people, organizations, concepts)
- Falls back gracefully to regex-only when spaCy is not installed
- Install: `pip install memcp[ner]` (adds `spacy>=3.7`)

## Consequences

### Positive

- **Closed learning loop**: Users can signal quality, and the system adapts — helpful insights rise, misleading ones sink.
- **Edge propagation**: Feedback on one insight affects its neighborhood via edge weight changes, amplifying the signal.
- **Deduplication**: Consolidation reduces clutter from near-duplicate insights that accumulate over long usage.
- **Non-destructive preview**: `consolidation_preview` is a dry-run — users see what would be merged before committing.
- **Graceful NER**: spaCy is optional; the system works with regex alone but extracts richer entities when spaCy is available.

### Negative

- **Asymmetric feedback bias**: The 2:1 negative-to-positive ratio means a single "misleading" vote requires two "helpful" votes to neutralize. This is intentional but could over-penalize insights that are occasionally unhelpful.
- **Consolidation is destructive**: Once merged, deleted insights are gone. The `keep_id` selection (most accessed by default) may not always be the best choice. Mitigated by the preview step.
- **spaCy model download**: Users must run `python -m spacy download en_core_web_sm` after installing the `ner` extra. The installer handles this, but manual installs may miss it.

## Alternatives Considered

### Thumbs-Up/Down Counter Instead of Score

Track positive and negative counts separately and compute a Wilson score interval. Rejected because:
- Wilson scores are designed for binary ratings with many votes; MemCP insights typically get 1-3 feedback signals
- A simple clamped score is easier to reason about and debug

### Auto-Consolidation on Remember

Automatically merge similar insights when a new one is stored. Rejected because:
- Users may intentionally store similar-but-distinct insights (e.g., same topic, different contexts)
- Auto-merging without user consent could destroy nuance
- The preview + explicit merge workflow gives users control

### LLM-Based Merge Content Generation

Use Claude to generate a merged summary of consolidated insights. Rejected for the initial implementation because:
- Adds LLM call latency and cost to a core operation
- The `merged_content` parameter allows users to provide their own merged text when needed
- Can be added later as an enhancement
