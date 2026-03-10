# ADR-011: Hebbian Co-Retrieval Strengthening and Edge Decay

## Status

Accepted

## Date

2026-02-18

## Context

MemCP's MAGMA 4-graph creates edges when insights are stored, but edge weights are static after creation. This means:

- Two insights recalled together repeatedly have the same edge weight as two recalled once
- Stale edges from months ago carry the same weight as recently active ones
- The graph grows monotonically — edges accumulate but never weaken or prune

Neuroscience's Hebbian principle ("neurons that fire together wire together") suggests that connections used together should strengthen, while unused connections should weaken. This makes the graph self-organizing: frequently co-recalled knowledge becomes more tightly connected, while forgotten paths fade.

Among memory MCP systems, only Shodh-Memory implements Hebbian learning. Adding it to MemCP — combined with our intent-aware traversal — creates a unique differentiator.

## Decision

### Hebbian Strengthening

Add `strengthen_co_retrieved(node_ids, boost)` to `EdgeManager`:

- After every `recall()` query, identify the top-10 result nodes
- For each pair of co-retrieved nodes, boost their shared edge weights: `weight = min(weight + boost, 1.0)`
- Default boost: `0.05` per co-retrieval (configurable via `MEMCP_HEBBIAN_BOOST`)
- Also update `last_activated_at` timestamp on strengthened edges for decay tracking
- Controlled by `MEMCP_HEBBIAN_ENABLED` (default `true`)

### Activation-Based Edge Decay

Add `decay_stale_edges(half_life_days, min_weight)` to `EdgeManager`:

- Exponential decay: `weight_new = weight * 2^(-days_since_activation / half_life)`
- Default half-life: 30 days (`MEMCP_EDGE_DECAY_HALF_LIFE`)
- Edges below `min_weight` (default 0.05, `MEMCP_EDGE_MIN_WEIGHT`) are pruned
- Rate-limited to once per hour to avoid performance overhead
- Called lazily during `query()` — no background scheduler needed

### Schema Migration

Add `last_activated_at TEXT` column to the `edges` table via `ALTER TABLE` with fallback for existing databases.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEMCP_HEBBIAN_ENABLED` | `true` | Enable/disable Hebbian strengthening |
| `MEMCP_HEBBIAN_BOOST` | `0.05` | Weight boost per co-retrieval |
| `MEMCP_EDGE_DECAY_HALF_LIFE` | `30` | Half-life in days for edge decay |
| `MEMCP_EDGE_MIN_WEIGHT` | `0.05` | Minimum weight before edge is pruned |

## Consequences

### Positive

- **Self-organizing graph**: Frequently co-recalled paths strengthen naturally, improving future recall quality without manual curation.
- **Graph hygiene**: Stale, unused edges are pruned automatically, keeping the graph clean and queries fast.
- **Feedback loop**: The more you use certain knowledge together, the better MemCP gets at surfacing it — a virtuous cycle.
- **Exponential decay is smooth**: Half-life-based decay is continuous and predictable — no sharp cliffs.
- **Zero overhead when disabled**: `MEMCP_HEBBIAN_ENABLED=false` skips all strengthening logic.

### Negative

- **Weight saturation**: With `boost=0.05` and cap at 1.0, it takes 20 co-retrievals to max out an edge. Very frequently queried edges may saturate, reducing differentiation between "often recalled" and "always recalled."
- **Decay adds SQL operations**: Each decay pass reads all edges and updates/deletes stale ones. Mitigated by the once-per-hour rate limit.
- **Cold start**: New edges start with their generation-time weight and only strengthen with use. A freshly created insight has no usage history to benefit from.

## Alternatives Considered

### Fixed Weight Decay (Linear)

Decay edges by a fixed amount per day instead of exponential. Rejected because linear decay doesn't model forgetting curves accurately — infrequently used memories should fade slowly at first, then faster, which exponential decay captures.

### Background Scheduler for Decay

Run decay on a timer (e.g., every 6 hours) using `asyncio.create_task`. Rejected because:
- Adds complexity (scheduler lifecycle management)
- Lazy evaluation during `query()` is simpler and sufficient
- Rate limiting achieves the same "not too often" goal without a scheduler

### Multiplicative Boost (weight *= 1.1)

Instead of additive boost, multiply the weight. Rejected because multiplicative boost favors already-strong edges disproportionately, creating a rich-get-richer effect that could suppress exploration of weaker but relevant paths.
