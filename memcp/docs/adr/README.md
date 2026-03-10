# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for MemCP.

ADRs document significant architectural and technology choices made during the design and implementation of MemCP. Each record follows the [Michael Nygard ADR format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](001-sqlite-filesystem-hybrid-storage.md) | SQLite + Filesystem Hybrid Storage | Accepted | 2026-02-07 |
| [ADR-002](002-tiered-search-architecture.md) | Tiered Search Architecture | Accepted | 2026-02-07 |
| [ADR-003](003-magma-4-graph-memory.md) | MAGMA 4-Graph Memory | Accepted | 2026-02-07 |
| [ADR-004](004-sub-agents-over-sub-llms.md) | Sub-Agents over Sub-LLMs and Skills | Accepted | 2026-02-08 |
| [ADR-005](005-minimal-core-dependencies.md) | Minimal Core Dependencies | Accepted | 2026-02-07 |
| [ADR-006](006-mcp-tools-over-python-repl.md) | MCP Tools over Python REPL | Accepted | 2026-02-07 |
| [ADR-007](007-auto-save-hook-architecture.md) | Auto-Save Hook Architecture | Accepted | 2026-02-08 |
| [ADR-008](008-three-zone-retention-lifecycle.md) | 3-Zone Retention Lifecycle | Accepted | 2026-02-08 |
| [ADR-009](009-user-level-global-deployment.md) | User-Level Global Deployment | Accepted | 2026-02-09 |
| [ADR-010](010-twelve-factor-configuration.md) | 12-Factor Configuration | Accepted | 2026-02-07 |
| [ADR-011](011-hebbian-learning-edge-decay.md) | Hebbian Co-Retrieval Strengthening and Edge Decay | Accepted | 2026-02-18 |
| [ADR-012](012-reciprocal-rank-fusion-search.md) | Reciprocal Rank Fusion Search | Accepted | 2026-02-18 |
| [ADR-013](013-memory-feedback-consolidation.md) | Memory Feedback and Consolidation | Accepted | 2026-02-18 |

## Format

Each ADR follows this structure:

- **Title** — Short noun phrase describing the decision
- **Status** — Proposed, Accepted, Deprecated, or Superseded
- **Context** — What forces are at play, including technological, political, social, and project-specific
- **Decision** — The change we are proposing or have agreed to implement
- **Consequences** — What becomes easier or harder as a result of this decision
- **Alternatives Considered** — What other options were evaluated and why they were rejected
