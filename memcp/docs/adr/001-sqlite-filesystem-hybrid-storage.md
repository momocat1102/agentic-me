# ADR-001: SQLite + Filesystem Hybrid Storage

## Status

Accepted

## Date

2026-02-07

## Context

MemCP needs to persist two distinct types of data:

1. **Structured data** — Insights (memory nodes), graph edges, entity relationships, session metadata. This data is queried, filtered, joined, and updated frequently.
2. **Unstructured content** — Context variables (markdown files, source code, conversation logs, chunked segments). This data is read/written as whole files or line-range slices.

The storage layer must support:

- **Concurrent access** — Multiple Claude Code instances may share the same `~/.memcp/` directory
- **Crash safety** — Writes must be atomic; partial writes should never corrupt data
- **Human readability** — Users should be able to inspect their stored data without special tools
- **Zero infrastructure** — No external database server, no Docker dependency for basic usage
- **Backup simplicity** — Copy the data directory and you have a complete backup

## Decision

Use a **hybrid storage model**:

- **SQLite** (`graph.db`) for structured, relational data — insight nodes, graph edges, session tracking. WAL mode enabled for concurrent read access.
- **Filesystem** (JSON + Markdown) for unstructured content — context variables stored as `contexts/{name}/content.md` + `meta.json`, chunks stored as numbered `.md` files with an `index.json` manifest.
- **JSON** (`memory.json`) as a Phase 1 flat store for insights, migrated to SQLite graph nodes in Phase 3. Retained as a legacy migration path.

Atomic writes use `tempfile` + `os.replace()` + `fcntl.flock()` for filesystem operations. SQLite uses WAL mode and handles its own concurrency.

## Consequences

### Positive

- **Human-inspectable**: Context files are plain Markdown; metadata is JSON. Users can browse `~/.memcp/contexts/` with any text editor.
- **Zero infrastructure**: SQLite is part of Python's standard library. No external process to manage.
- **Simple backups**: `cp -r ~/.memcp/ backup/` captures everything.
- **Concurrent safety**: SQLite WAL handles reader-writer concurrency. File locking (`fcntl.flock`) handles filesystem writes.
- **ACID transactions**: SQLite provides full ACID guarantees for graph operations (edge creation, node updates).

### Negative

- **Two storage engines**: Developers must understand both SQLite (for graph queries) and filesystem (for content reads). More surface area to test.
- **No single query language**: Cannot JOIN across graph edges and context content in a single SQL query.
- **File count growth**: Each context creates a directory with multiple files. Large numbers of contexts may hit filesystem inode limits (unlikely in practice under 10K contexts).

## Alternatives Considered

### Pure SQLite (all data in one DB)

Would simplify queries and enable cross-table JOINs. Rejected because:
- Large text blobs in SQLite are less efficient than filesystem reads for the `memcp_get_context(start, end)` line-slicing pattern
- Content becomes opaque — users cannot browse stored files without SQL tools
- Backup requires `sqlite3 .backup` instead of simple `cp`

### Pure Filesystem (JSON files only)

Would maximize human readability. Rejected because:
- No relational queries — graph traversal requires loading all edges into memory
- No ACID — concurrent writes to the same JSON file risk corruption even with file locking
- Poor query performance — filtering insights by category/importance requires scanning entire JSON

### PostgreSQL / External DB

Would provide the most powerful query engine. Rejected because:
- Violates the zero-infrastructure constraint — requires running a database server
- Overkill for the data volumes MemCP handles (typically <10K insights, <1K contexts)
- Complicates Docker deployment and local development
