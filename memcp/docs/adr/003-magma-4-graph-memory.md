# ADR-003: MAGMA 4-Graph Memory

## Status

Accepted

## Date

2026-02-07

## Context

Phase 1's memory system stores isolated insights in a flat JSON list. But knowledge is inherently connected — a decision was caused by a finding, an entity appears in multiple insights, events occurred in temporal proximity. Flat storage loses these connections.

The MAGMA paper (arXiv:2601.03236) describes a Multi-Agent Graph Memory Architecture with 4 orthogonal graph types that capture different relationship dimensions. This maps directly to how developers navigate knowledge: "why did we choose X?" (causal), "what else mentions Y?" (entity), "what happened around the same time?" (temporal), "what's similar to Z?" (semantic).

Requirements:
- **Intent-aware retrieval** — "why" queries should follow causal edges, "who/which" should follow entity edges
- **Automatic edge generation** — Edges should be created on insert, not manually by the user
- **Single-file storage** — Avoid proliferating data files; one DB for all graph data
- **Backward compatibility** — Must migrate existing `memory.json` data to the graph

## Decision

Implement MAGMA's 4-graph architecture in SQLite with automatic edge generation:

**Edge Types:**

| Type | Connects | Detection |
|------|----------|-----------|
| Semantic | Insights with similar content | Keyword overlap scoring (+ cosine similarity when embeddings available) |
| Temporal | Insights created close in time | Same session or within 30-minute window |
| Causal | Cause → effect pairs | Pattern detection: "because", "therefore", "due to", "decided to" |
| Entity | Insights mentioning the same entity | `RegexEntityExtractor`: file paths, module names, URLs, @mentions, CamelCase identifiers |

**Schema** (SQLite `graph.db`):

- `nodes` table: `id`, `content`, `summary`, `category`, `importance`, `tags` (JSON), `entities` (JSON), `project`, `session`, `token_count`, `access_count`, `last_accessed_at`, `created_at`
- `edges` table: `source_id`, `target_id`, `edge_type`, `weight`, `metadata` (JSON)

**Intent Detection:**

The `_detect_intent(query)` function maps query patterns to edge types:
- "why" / "because" / "reason" → causal edges
- "when" / "timeline" / "history" → temporal edges
- "who" / "which" / entity names → entity edges
- Default / "what" / "how" → semantic edges (hybrid traversal)

## Consequences

### Positive

- **Rich retrieval**: `memcp_recall("why SQLite?")` follows causal edges and returns the decision plus its rationale — not just keyword matches.
- **Graph traversal**: `memcp_related(insight_id, depth=2)` discovers connections the user didn't know existed.
- **Automatic enrichment**: Every `memcp_remember()` call auto-generates temporal, entity, and semantic edges without user effort.
- **Single-file graph**: All nodes and edges live in `graph.db` — easy to backup, query, and inspect with any SQLite client.
- **Extensible**: Adding a new edge type requires only a new detection function and edge_type string.

### Negative

- **Regex entity extraction is limited**: `RegexEntityExtractor` catches file paths and CamelCase but misses natural language entities like "the authentication system". Mitigated by the `memcp-entity-extractor` sub-agent (Phase 4) for LLM-based extraction.
- **Causal pattern detection has false positives**: "because" appears in many non-causal contexts. Weights are set lower (0.3-0.5) to reduce impact.
- **Edge proliferation**: Semantic edges are created to the top-3 similar insights on every insert. With 10K insights, this could mean 30K+ semantic edges. Mitigated by limiting semantic edge creation to above-threshold similarity.
- **Migration complexity**: Moving from `memory.json` to `graph.db` requires a one-time migration that preserves all data while rebuilding edges.

## Alternatives Considered

### Flat JSON with Tags (no graph)

Keep Phase 1's `memory.json` and rely on tags/categories for retrieval. Rejected because:
- Cannot answer "why" questions — no causal links
- Cannot discover connections — no entity or temporal edges
- Tag-based filtering is a subset of what graph traversal provides

### Neo4j / Full Graph Database

Use a dedicated graph database for maximum query power. Rejected because:
- Requires running a separate server process (violates zero-infrastructure)
- Cypher queries are powerful but overkill for 4 edge types and <100K nodes
- SQLite with `nodes`/`edges` tables handles this workload efficiently

### NetworkX In-Memory Graph

Build the graph in memory using NetworkX. Rejected because:
- No persistence — graph must be rebuilt from scratch on every server start
- Memory usage scales linearly with graph size
- No ACID guarantees for concurrent access
- SQLite provides persistence and concurrency for free

### Single "similarity" Edge Type

Use only semantic similarity edges instead of 4 types. Rejected because:
- Loses the intent-aware routing that makes MAGMA effective
- "Why did we choose X?" becomes indistinguishable from "What's related to X?"
- The MAGMA paper demonstrates that orthogonal edge types capture different knowledge dimensions
