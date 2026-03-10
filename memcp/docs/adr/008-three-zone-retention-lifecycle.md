# ADR-008: 3-Zone Retention Lifecycle

## Status

Accepted

## Date

2026-02-08

## Context

MemCP accumulates data over time: insights from `memcp_remember()`, contexts from `memcp_load_context()`, and chunks from `memcp_chunk_context()`. Without lifecycle management, storage grows unbounded. A project that runs for months will accumulate thousands of insights and hundreds of context snapshots, most of which become irrelevant.

At the same time, some data must never be deleted — critical decisions, architectural rules, and high-importance preferences. The retention system must distinguish between disposable and protected data.

Requirements:
- **Prevent unbounded growth** — Old, unused data should eventually be cleaned up
- **Protect important data** — Critical decisions and frequently-accessed insights must be immune
- **Allow recovery** — Accidental archiving should be reversible
- **Transparent** — Users should preview what will be affected before any destructive action
- **Configurable** — Different projects may need different retention policies

## Decision

Implement a **3-zone retention lifecycle**: Active → Archive → Purge.

```
ACTIVE (default)            ARCHIVE (compressed)           PURGE (deleted)
~/.memcp/contexts/          ~/.memcp/archive/              metadata in purge_log.json
~/.memcp/chunks/            *.md.gz compressed              content gone forever
~/.memcp/graph.db

   ── 30 days, 0 access ──→   ── 180 days, 0 access ──→
        (archive)                    (purge)
   ←── restore ────────────
```

### Zone Transitions

- **Active → Archive**: Items with 0 access count and older than `MEMCP_RETENTION_ARCHIVE_DAYS` (default 30). Content is gzip-compressed and moved to `~/.memcp/archive/`. Metadata preserved.
- **Archive → Purge**: Archived items older than `MEMCP_RETENTION_PURGE_DAYS` (default 180) with still 0 access. Content deleted permanently. Metadata logged to `purge_log.json` for audit.
- **Archive → Active**: `memcp_restore(name)` decompresses and moves back. Full recovery.

### Immunity Rules

Items matching any of these conditions are **never auto-archived**:

| Rule | Why |
|------|-----|
| `importance == "critical"` | Explicitly marked as permanent |
| Tags include `critical`, `decision`, `keep`, `important` | Protected by tag |
| `access_count >= 3` | Frequently accessed = still relevant |
| Content contains `DECISION:`, `IMPORTANT:`, `CRITICAL:` | Content-level protection |

### MCP Tools

| Tool | Purpose |
|------|---------|
| `memcp_retention_preview(archive_days, purge_days)` | Dry-run showing what would be archived/purged |
| `memcp_retention_run(archive, purge)` | Execute retention actions |
| `memcp_restore(name, item_type)` | Restore from archive to active |

## Consequences

### Positive

- **Bounded growth**: Old, unused data is automatically compressed (archive) and eventually removed (purge).
- **Safe by default**: Immunity rules protect critical data. `memcp_retention_preview()` shows exactly what will be affected before any action.
- **Reversible archiving**: Archived items can be fully restored. Only purge is permanent.
- **Audit trail**: `purge_log.json` records what was deleted and when, even after content is gone.
- **Configurable thresholds**: `MEMCP_RETENTION_ARCHIVE_DAYS` and `MEMCP_RETENTION_PURGE_DAYS` env vars let users adjust policies per deployment.

### Negative

- **Compressed archives are not searchable**: Archived content is gzip-compressed. `memcp_search()` only searches active data. Users must restore before searching archived content.
- **Access count as proxy**: Using `access_count >= 3` as an immunity signal means rarely-accessed-but-important insights could be archived if not tagged correctly.
- **Manual trigger**: Retention doesn't run automatically on a schedule. Users or hooks must call `memcp_retention_run()`. This is intentional — automatic deletion is dangerous.
- **Storage during archive phase**: Compressed archives still consume disk space. The archive zone is a staging area, not a space saver (though gzip typically achieves 60-80% compression on text).

## Alternatives Considered

### No Retention (Manual Cleanup Only)

Let users manually delete old data with `memcp_forget()` and `memcp_clear_context()`. Rejected because:
- Users rarely clean up manually — data accumulates silently
- No visibility into what's old/unused without `memcp_retention_preview()`
- The 10K insight limit is a hard wall; better to proactively manage before hitting it

### 2-Zone (Active → Delete)

Skip the archive zone; move directly from active to deleted. Rejected because:
- No recovery from accidental deletion
- Users lose confidence in the system if data can disappear permanently without a safety net
- The archive zone costs minimal implementation complexity but provides significant safety

### Time-Based Only (No Access Count)

Archive purely based on age, ignoring access patterns. Rejected because:
- A 60-day-old insight that's accessed daily is clearly still relevant
- Access count captures "still in use" better than any time-based heuristic
- Combined time + access provides the best signal: old AND unused = safe to archive

### Automatic Scheduled Retention

Run retention automatically (e.g., daily via cron or on server startup). Rejected because:
- Automatic deletion of user data without explicit consent is dangerous
- Different sessions may have different retention needs
- The preview → confirm → execute pattern gives users full control
- A hook could be added later to suggest running retention periodically
