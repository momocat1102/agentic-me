"""Retention lifecycle — 3-zone model: Active → Archive → Purge.

Manages stale contexts and insights to prevent unbounded growth.

Archive format:
    ~/.memcp/archive/contexts/{name}/content.md.gz + meta.json
    ~/.memcp/archive/insights.json (append-only array)
    ~/.memcp/archive/purge_log.json (audit trail)

Immunity rules (never auto-archived):
    - importance == "critical" or "high"
    - access_count >= 3
    - tags contain "keep", "important", or "pinned"
"""

from __future__ import annotations

import gzip
import shutil
from datetime import datetime, timezone
from typing import Any

from memcp.config import get_config
from memcp.core.errors import InsightNotFoundError, ValidationError
from memcp.core.fileutil import (
    atomic_write_json,
    locked_read_json,
    safe_name,
)

_PROTECTED_TAGS = {"keep", "important", "pinned"}
_PROTECTED_IMPORTANCES = {"critical", "high"}
_MIN_ACCESS_FOR_IMMUNITY = 3


def is_immune(item: dict[str, Any]) -> bool:
    """Check if an item is protected from archiving.

    An item is immune if:
    - importance is "critical" or "high"
    - access_count >= 3
    - tags contain "keep", "important", or "pinned"
    """
    if item.get("importance") in _PROTECTED_IMPORTANCES:
        return True

    if item.get("access_count", 0) >= _MIN_ACCESS_FOR_IMMUNITY:
        return True

    tags = item.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    tag_set = {t.lower() for t in tags}
    return bool(tag_set & _PROTECTED_TAGS)


def _days_since(iso_timestamp: str | None) -> float:
    """Calculate days since a given ISO timestamp. Returns inf if None."""
    if not iso_timestamp:
        return float("inf")
    try:
        dt = datetime.fromisoformat(iso_timestamp)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except (ValueError, TypeError):
        return float("inf")


def _last_activity(item: dict[str, Any]) -> str | None:
    """Get the most recent activity timestamp (last_accessed_at or created_at)."""
    return item.get("last_accessed_at") or item.get("created_at")


def get_archive_candidates(
    days: int = 0,
    include_contexts: bool = True,
    include_insights: bool = True,
) -> dict[str, Any]:
    """Find items eligible for archiving.

    An item is a candidate if:
    - last activity was >= `days` ago (default from config)
    - access_count == 0
    - not immune

    Returns dict with "contexts", "insights", and "total".
    """
    config = get_config()
    threshold = days or config.retention_archive_days

    result: dict[str, Any] = {"contexts": [], "insights": [], "total": 0}

    if include_contexts:
        result["contexts"] = _get_context_candidates(threshold)

    if include_insights:
        result["insights"] = _get_insight_candidates(threshold)

    result["total"] = len(result["contexts"]) + len(result["insights"])
    return result


def _get_context_candidates(threshold_days: int) -> list[dict[str, Any]]:
    """Find context candidates for archiving."""
    config = get_config()
    contexts_dir = config.contexts_dir

    if not contexts_dir.exists():
        return []

    candidates = []
    for ctx_dir in contexts_dir.iterdir():
        if not ctx_dir.is_dir():
            continue
        meta = locked_read_json(ctx_dir / "meta.json")
        if meta is None:
            continue
        if is_immune(meta):
            continue
        if meta.get("access_count", 0) > 0:
            continue
        last = _last_activity(meta)
        if _days_since(last) >= threshold_days:
            candidates.append(meta)

    return candidates


def _get_insight_candidates(threshold_days: int) -> list[dict[str, Any]]:
    """Find insight candidates for archiving."""
    config = get_config()

    if not config.graph_db_path.exists():
        return _get_insight_candidates_json(threshold_days)

    from memcp.core.graph import GraphMemory

    graph = GraphMemory()
    try:
        conn = graph._get_conn()
        rows = conn.execute("SELECT * FROM nodes WHERE access_count = 0").fetchall()

        candidates = []
        for row in rows:
            node = graph._row_to_dict(row)
            if is_immune(node):
                continue
            last = _last_activity(node)
            if _days_since(last) >= threshold_days:
                candidates.append(node)
        return candidates
    finally:
        graph.close()


def _get_insight_candidates_json(threshold_days: int) -> list[dict[str, Any]]:
    """Find insight candidates from JSON backend."""
    config = get_config()
    data = locked_read_json(config.memory_path)
    if data is None:
        return []

    candidates = []
    for ins in data.get("insights", []):
        if is_immune(ins):
            continue
        if ins.get("access_count", 0) > 0:
            continue
        last = _last_activity(ins)
        if _days_since(last) >= threshold_days:
            candidates.append(ins)
    return candidates


def get_purge_candidates(days: int = 0) -> dict[str, Any]:
    """Find archived items eligible for permanent deletion.

    Items are candidates if they've been archived for >= `days` (default from config).
    """
    config = get_config()
    threshold = days or config.retention_purge_days
    archive_dir = config.archive_dir

    result: dict[str, Any] = {"contexts": [], "insights": [], "total": 0}

    # Check archived contexts
    ctx_archive = archive_dir / "contexts"
    if ctx_archive.exists():
        for ctx_dir in ctx_archive.iterdir():
            if not ctx_dir.is_dir():
                continue
            meta = locked_read_json(ctx_dir / "meta.json")
            if meta is None:
                continue
            archived_at = meta.get("archived_at")
            if _days_since(archived_at) >= threshold:
                result["contexts"].append(meta)

    # Check archived insights
    insights_path = archive_dir / "insights.json"
    archived_insights = locked_read_json(insights_path) or []
    for ins in archived_insights:
        archived_at = ins.get("archived_at")
        if _days_since(archived_at) >= threshold:
            result["insights"].append(ins)

    result["total"] = len(result["contexts"]) + len(result["insights"])
    return result


def archive_context(name: str) -> dict[str, Any]:
    """Archive a context: compress to .gz, move to archive."""
    safe_name(name)
    config = get_config()

    ctx_dir = config.contexts_dir / name
    meta_path = ctx_dir / "meta.json"
    content_path = ctx_dir / "content.md"

    meta = locked_read_json(meta_path)
    if meta is None:
        raise InsightNotFoundError(f"Context {name!r} not found")

    if not content_path.exists():
        raise InsightNotFoundError(f"Context content for {name!r} missing")

    # Create archive directory
    archive_ctx_dir = config.archive_dir / "contexts" / name
    archive_ctx_dir.mkdir(parents=True, exist_ok=True)

    # Compress content
    content = content_path.read_text(encoding="utf-8")
    gz_path = archive_ctx_dir / "content.md.gz"
    with gzip.open(gz_path, "wt", encoding="utf-8") as f:
        f.write(content)

    # Save meta with archived_at
    meta["archived_at"] = datetime.now(timezone.utc).isoformat()
    atomic_write_json(archive_ctx_dir / "meta.json", meta)

    # Remove active context + chunks
    shutil.rmtree(ctx_dir)
    chunks_dir = config.chunks_dir / name
    if chunks_dir.exists():
        shutil.rmtree(chunks_dir)

    return meta


def archive_insight(insight_id: str) -> dict[str, Any]:
    """Archive an insight: move from graph to archive/insights.json."""
    config = get_config()

    if not config.graph_db_path.exists():
        return _archive_insight_json(insight_id)

    from memcp.core.graph import GraphMemory

    graph = GraphMemory()
    try:
        node = graph.get_node(insight_id)
        if node is None:
            raise InsightNotFoundError(f"Insight {insight_id!r} not found")

        node["archived_at"] = datetime.now(timezone.utc).isoformat()

        # Append to archive
        insights_path = config.archive_dir / "insights.json"
        archived = locked_read_json(insights_path) or []
        archived.append(node)
        atomic_write_json(insights_path, archived)

        # Remove from graph
        graph.delete_node(insight_id)

        return node
    finally:
        graph.close()


def _archive_insight_json(insight_id: str) -> dict[str, Any]:
    """Archive insight from JSON backend."""
    config = get_config()
    data = locked_read_json(config.memory_path)
    if data is None:
        raise InsightNotFoundError(f"Insight {insight_id!r} not found")

    found = None
    remaining = []
    for ins in data.get("insights", []):
        if ins.get("id") == insight_id:
            found = ins
        else:
            remaining.append(ins)

    if found is None:
        raise InsightNotFoundError(f"Insight {insight_id!r} not found")

    found["archived_at"] = datetime.now(timezone.utc).isoformat()

    # Append to archive
    insights_path = config.archive_dir / "insights.json"
    archived = locked_read_json(insights_path) or []
    archived.append(found)
    atomic_write_json(insights_path, archived)

    # Remove from active
    data["insights"] = remaining
    from memcp.core.fileutil import atomic_write_json as _write

    _write(config.memory_path, data)

    return found


def restore_context(name: str) -> dict[str, Any]:
    """Restore an archived context back to active."""
    safe_name(name)
    config = get_config()

    archive_ctx_dir = config.archive_dir / "contexts" / name
    meta_path = archive_ctx_dir / "meta.json"
    gz_path = archive_ctx_dir / "content.md.gz"

    meta = locked_read_json(meta_path)
    if meta is None:
        raise InsightNotFoundError(f"Archived context {name!r} not found")

    if not gz_path.exists():
        raise InsightNotFoundError(f"Archived content for {name!r} missing")

    # Decompress
    with gzip.open(gz_path, "rt", encoding="utf-8") as f:
        content = f.read()

    # Restore via context_store.load
    from memcp.core.context_store import load

    result = load(name=name, content=content, project=meta.get("project", "default"))

    # Remove archive
    shutil.rmtree(archive_ctx_dir)

    return result


def restore_insight(insight_id: str) -> dict[str, Any]:
    """Restore an archived insight back to active memory."""
    config = get_config()

    insights_path = config.archive_dir / "insights.json"
    archived = locked_read_json(insights_path) or []

    found = None
    remaining = []
    for ins in archived:
        if ins.get("id") == insight_id:
            found = ins
        else:
            remaining.append(ins)

    if found is None:
        raise InsightNotFoundError(f"Archived insight {insight_id!r} not found")

    # Remove archive metadata
    found.pop("archived_at", None)

    # Re-insert into graph (or JSON)
    if config.graph_db_path.exists():
        from memcp.core.graph import GraphMemory

        graph = GraphMemory()
        try:
            result = graph.store(found)
        finally:
            graph.close()
    else:
        from memcp.core.memory import _load_memory, _save_memory

        memory = _load_memory()
        memory["insights"].append(found)
        _save_memory(memory)
        result = found

    # Update archive file
    atomic_write_json(insights_path, remaining)

    return result


def purge_archived(name_or_id: str, item_type: str = "auto") -> dict[str, Any]:
    """Permanently delete an archived item. Logs to purge_log.json."""
    config = get_config()

    if item_type == "auto":
        # Try context first, then insight
        ctx_dir = config.archive_dir / "contexts" / name_or_id
        item_type = "context" if ctx_dir.exists() else "insight"

    if item_type == "context":
        return _purge_context(name_or_id)
    elif item_type == "insight":
        return _purge_insight(name_or_id)
    else:
        raise ValidationError(f"Invalid item_type {item_type!r}. Must be: auto, context, insight")


def _purge_context(name: str) -> dict[str, Any]:
    """Permanently delete an archived context."""
    config = get_config()
    archive_ctx_dir = config.archive_dir / "contexts" / name

    meta = locked_read_json(archive_ctx_dir / "meta.json")
    if meta is None:
        raise InsightNotFoundError(f"Archived context {name!r} not found")

    # Log to purge log
    _log_purge(
        {
            "id": name,
            "type": "context",
            "content_preview": meta.get("name", name),
            "original_created_at": meta.get("created_at"),
            "archived_at": meta.get("archived_at"),
        }
    )

    # Delete
    shutil.rmtree(archive_ctx_dir)

    return {"status": "purged", "type": "context", "name": name}


def _purge_insight(insight_id: str) -> dict[str, Any]:
    """Permanently delete an archived insight."""
    config = get_config()
    insights_path = config.archive_dir / "insights.json"
    archived = locked_read_json(insights_path) or []

    found = None
    remaining = []
    for ins in archived:
        if ins.get("id") == insight_id:
            found = ins
        else:
            remaining.append(ins)

    if found is None:
        raise InsightNotFoundError(f"Archived insight {insight_id!r} not found")

    # Log to purge log
    _log_purge(
        {
            "id": insight_id,
            "type": "insight",
            "content_preview": found.get("content", "")[:100],
            "original_created_at": found.get("created_at"),
            "archived_at": found.get("archived_at"),
        }
    )

    # Update archive file
    atomic_write_json(insights_path, remaining)

    return {"status": "purged", "type": "insight", "id": insight_id}


def _log_purge(entry: dict[str, Any]) -> None:
    """Append a purge entry to purge_log.json."""
    config = get_config()
    log_path = config.archive_dir / "purge_log.json"

    log = locked_read_json(log_path) or []
    entry["purged_at"] = datetime.now(timezone.utc).isoformat()
    log.append(entry)
    atomic_write_json(log_path, log)


def retention_preview(
    archive_days: int = 0,
    purge_days: int = 0,
) -> dict[str, Any]:
    """Dry-run: show what would be archived/purged without acting."""
    archive_candidates = get_archive_candidates(days=archive_days)
    purge_candidates = get_purge_candidates(days=purge_days)

    config = get_config()
    return {
        "archive_threshold_days": archive_days or config.retention_archive_days,
        "purge_threshold_days": purge_days or config.retention_purge_days,
        "archive_candidates": {
            "contexts": [
                {"name": c["name"], "created_at": c.get("created_at")}
                for c in archive_candidates["contexts"]
            ],
            "insights": [
                {
                    "id": i["id"],
                    "content_preview": i.get("content", "")[:80],
                    "created_at": i.get("created_at"),
                }
                for i in archive_candidates["insights"]
            ],
            "total": archive_candidates["total"],
        },
        "purge_candidates": {
            "contexts": [
                {"name": c["name"], "archived_at": c.get("archived_at")}
                for c in purge_candidates["contexts"]
            ],
            "insights": [
                {
                    "id": i["id"],
                    "content_preview": i.get("content", "")[:80],
                    "archived_at": i.get("archived_at"),
                }
                for i in purge_candidates["insights"]
            ],
            "total": purge_candidates["total"],
        },
    }


def retention_run(
    archive: bool = True,
    purge: bool = False,
) -> dict[str, Any]:
    """Execute retention actions.

    Args:
        archive: Archive eligible items (default True)
        purge: Purge archived items past retention period (default False)

    Returns summary with counts of archived and purged items.
    """
    summary: dict[str, Any] = {
        "archived_contexts": 0,
        "archived_insights": 0,
        "purged_contexts": 0,
        "purged_insights": 0,
    }

    if archive:
        candidates = get_archive_candidates()
        for ctx in candidates["contexts"]:
            try:
                archive_context(ctx["name"])
                summary["archived_contexts"] += 1
            except Exception:
                pass
        for ins in candidates["insights"]:
            try:
                archive_insight(ins["id"])
                summary["archived_insights"] += 1
            except Exception:
                pass

    if purge:
        candidates = get_purge_candidates()
        for ctx in candidates["contexts"]:
            try:
                purge_archived(ctx["name"], item_type="context")
                summary["purged_contexts"] += 1
            except Exception:
                pass
        for ins in candidates["insights"]:
            try:
                purge_archived(ins["id"], item_type="insight")
                summary["purged_insights"] += 1
            except Exception:
                pass

    summary["total_archived"] = summary["archived_contexts"] + summary["archived_insights"]
    summary["total_purged"] = summary["purged_contexts"] + summary["purged_insights"]
    return summary
