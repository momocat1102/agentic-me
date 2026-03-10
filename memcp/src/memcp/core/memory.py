"""Memory system — remember, recall, forget with token counting and importance decay.

Phase 1: Flat JSON backend at ~/.memcp/memory.json.
Phase 3: Delegates to GraphMemory (SQLite + edges), same interface.

The public API (remember, recall, forget, memory_status) auto-detects which
backend to use. Once GraphMemory is available (graph.db exists or first write),
all operations go through the graph. Legacy JSON data is auto-migrated.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from memcp import __version__
from memcp.config import get_config
from memcp.core.errors import ValidationError
from memcp.core.fileutil import (
    atomic_write_json,
    content_hash,
    estimate_tokens,
    locked_read_json,
)
from memcp.core.graph import GraphMemory
from memcp.core.project import get_current_project, get_current_session

VALID_CATEGORIES = {"decision", "fact", "preference", "finding", "todo", "general"}
VALID_IMPORTANCES = {"low", "medium", "high", "critical"}
IMPORTANCE_WEIGHTS = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}


def _use_graph() -> bool:
    """Check whether to use the graph backend.

    Returns True if graph.db exists (meaning Phase 3 is active).
    On first write, the graph is created and JSON data auto-migrated.
    """
    config = get_config()
    return config.graph_db_path.exists()


def _get_graph() -> GraphMemory:
    """Get a GraphMemory instance."""
    return GraphMemory()


def _ensure_graph_migrated() -> GraphMemory:
    """Get a graph, auto-migrating from JSON if needed."""
    graph = _get_graph()
    config = get_config()

    # If JSON memory exists and graph is empty, migrate
    if config.memory_path.exists():
        json_data = locked_read_json(config.memory_path)
        if json_data and json_data.get("insights"):
            stats = graph.stats()
            if stats["node_count"] == 0:
                graph.migrate_from_json(json_data)

    return graph


def _default_memory() -> dict[str, Any]:
    """Default empty memory structure."""
    return {
        "version": __version__,
        "insights": [],
        "metadata": {"created_at": datetime.now(timezone.utc).isoformat()},
    }


def _load_memory() -> dict[str, Any]:
    """Load memory from disk, returning default structure if missing."""
    config = get_config()
    data = locked_read_json(config.memory_path)
    if data is None:
        return _default_memory()
    return data


def _save_memory(memory: dict[str, Any]) -> None:
    """Save memory to disk atomically."""
    config = get_config()
    memory["metadata"]["updated_at"] = datetime.now(timezone.utc).isoformat()
    memory["metadata"]["count"] = len(memory["insights"])
    atomic_write_json(config.memory_path, memory)


def _compute_effective_importance(insight: dict[str, Any]) -> float:
    """Compute effective importance with access boost and time decay.

    Formula: base_weight * (1 + log(1 + access_count)) * time_decay
    Time decay: halves every `importance_decay_days` days of non-access.
    Critical insights never decay below 0.5.
    """
    config = get_config()
    base = IMPORTANCE_WEIGHTS.get(insight.get("importance", "medium"), 0.5)
    access_count = insight.get("access_count", 0)
    access_boost = 1.0 + math.log(1 + access_count)

    # Time decay based on last access (or creation if never accessed)
    last_access = insight.get("last_accessed_at") or insight.get("created_at", "")
    if last_access:
        try:
            last_dt = datetime.fromisoformat(last_access)
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            days_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 86400
            half_life = config.importance_decay_days
            decay = 0.5 ** (days_since / half_life) if half_life > 0 else 1.0
        except (ValueError, TypeError):
            decay = 1.0
    else:
        decay = 1.0

    effective = base * access_boost * decay

    # Critical insights never decay below 0.5
    if insight.get("importance") == "critical":
        effective = max(effective, 0.5)

    return round(effective, 4)


def _auto_prune(memory: dict[str, Any]) -> int:
    """Remove lowest effective_importance insights when at capacity.

    Returns the number of pruned insights.
    """
    config = get_config()
    insights = memory["insights"]
    if len(insights) <= config.max_insights:
        return 0

    # Recalculate effective importance for all
    for ins in insights:
        ins["effective_importance"] = _compute_effective_importance(ins)

    # Sort by effective importance, prune lowest 10%
    insights.sort(key=lambda x: x.get("effective_importance", 0))
    prune_count = max(1, len(insights) - config.max_insights)
    # Never prune critical insights
    pruned = []
    kept = []
    for ins in insights:
        if len(pruned) < prune_count and ins.get("importance") != "critical":
            pruned.append(ins)
        else:
            kept.append(ins)

    memory["insights"] = kept
    return len(pruned)


def remember(
    content: str,
    category: str = "general",
    importance: str = "medium",
    tags: str = "",
    summary: str = "",
    entities: str = "",
    project: str = "",
    session: str = "",
) -> dict[str, Any]:
    """Save an insight to persistent memory.

    Returns the created insight dict.
    Uses GraphMemory backend when available, falls back to JSON.
    """
    if category not in VALID_CATEGORIES:
        raise ValidationError(f"Invalid category {category!r}. Must be one of {VALID_CATEGORIES}")
    if importance not in VALID_IMPORTANCES:
        raise ValidationError(
            f"Invalid importance {importance!r}. Must be one of {VALID_IMPORTANCES}"
        )
    if not content.strip():
        raise ValidationError("Content cannot be empty")

    # Secret detection — block storage of credentials
    from memcp.core.secrets import get_secret_detector

    get_secret_detector().check(content)

    now = datetime.now(timezone.utc)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    entity_list = [e.strip() for e in entities.split(",") if e.strip()] if entities else []

    insight_id = content_hash(content + now.isoformat())

    insight = {
        "id": insight_id,
        "content": content.strip(),
        "summary": summary.strip(),
        "category": category,
        "importance": importance,
        "effective_importance": IMPORTANCE_WEIGHTS.get(importance, 0.5),
        "tags": tag_list,
        "entities": entity_list,
        "project": project or get_current_project(),
        "session": session or get_current_session(),
        "token_count": estimate_tokens(content),
        "access_count": 0,
        "last_accessed_at": None,
        "created_at": now.isoformat(),
    }

    # Try graph backend first, fall back to JSON
    if _use_graph():  # noqa: SIM108
        result = _remember_graph(insight, content)
    else:
        result = _remember_json(insight, content)

    # Invalidate BM25 cache so next search rebuilds
    from memcp.core.search import invalidate_bm25_cache

    invalidate_bm25_cache()
    return result


def _try_semantic_dedup(content: str, graph: GraphMemory) -> dict[str, Any] | None:
    """Check for semantic duplicates using embeddings. Returns dict if dup found, else None.

    Only active when MEMCP_SEMANTIC_DEDUP=true and an embedding provider is available.
    """
    import os

    if os.getenv("MEMCP_SEMANTIC_DEDUP", "false").lower() != "true":
        return None

    try:
        from memcp.core.embeddings import get_provider
        from memcp.core.vecstore import VectorStore

        provider = get_provider()
        if provider is None:
            return None

        config = get_config()
        store = VectorStore(config.cache_dir / "insight_embeddings.npz")
        store.load()

        if store.count() == 0:
            return None

        vec = provider.embed(content)
        threshold = float(os.getenv("MEMCP_DEDUP_THRESHOLD", "0.95"))
        results = store.search(vec, top_k=1)
        if results and results[0][1] >= threshold:
            existing_node = graph.get_node(results[0][0])
            if existing_node:
                return {**existing_node, "_duplicate": True, "_similarity": results[0][1]}
    except Exception:
        pass

    return None


def _remember_graph(insight: dict[str, Any], content: str) -> dict[str, Any]:
    """Save insight via GraphMemory."""
    graph = _get_graph()
    try:
        # Check for duplicate content (exact hash match)
        existing_hash = content_hash(content)
        conn = graph._get_conn()
        rows = conn.execute("SELECT * FROM nodes").fetchall()
        for row in rows:
            if content_hash(row["content"]) == existing_hash:
                return {**graph._row_to_dict(row), "_duplicate": True}

        # Optional: semantic deduplication via embeddings
        dedup_result = _try_semantic_dedup(content, graph)
        if dedup_result is not None:
            return dedup_result

        # Store with auto-edge generation
        result = graph.store(insight)

        # Auto-prune if at capacity
        config = get_config()
        node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        pruned = 0
        if node_count > config.max_insights:
            pruned = _auto_prune_graph(graph, config.max_insights)

        if pruned > 0:
            result["_pruned"] = pruned
        return result
    finally:
        graph.close()


def _remember_json(insight: dict[str, Any], content: str) -> dict[str, Any]:
    """Save insight via JSON backend (Phase 1 fallback)."""
    memory = _load_memory()

    # Check for duplicate content
    existing_hash = content_hash(content)
    for existing in memory["insights"]:
        if content_hash(existing["content"]) == existing_hash:
            return {**existing, "_duplicate": True}

    memory["insights"].append(insight)

    # Auto-prune if at capacity
    pruned = _auto_prune(memory)

    _save_memory(memory)

    result = {**insight}
    if pruned > 0:
        result["_pruned"] = pruned
    return result


def _auto_prune_graph(graph: GraphMemory, max_insights: int) -> int:
    """Prune lowest effective_importance nodes from graph when over capacity."""
    conn = graph._get_conn()
    rows = conn.execute(
        "SELECT id, importance, effective_importance FROM nodes ORDER BY effective_importance ASC"
    ).fetchall()

    over = len(rows) - max_insights
    if over <= 0:
        return 0

    pruned = 0
    for row in rows:
        if pruned >= over:
            break
        if row["importance"] != "critical":
            graph.delete_node(row["id"])
            pruned += 1

    return pruned


def recall(
    query: str = "",
    category: str = "",
    importance: str = "",
    limit: int = 10,
    max_tokens: int = 0,
    project: str = "",
    session: str = "",
    scope: str = "project",
) -> list[dict[str, Any]]:
    """Retrieve insights from memory.

    Searches content, tags, and summary. Filters by category/importance.
    If max_tokens > 0, returns results until the token budget is exhausted.
    Increments access_count on returned insights.

    Uses GraphMemory (intent-aware traversal) when available, JSON fallback.
    """
    if category and category not in VALID_CATEGORIES:
        raise ValidationError(f"Invalid category {category!r}")
    if importance and importance not in VALID_IMPORTANCES:
        raise ValidationError(f"Invalid importance {importance!r}")

    # Auto-populate project/session from active state
    if scope == "project" and not project:
        project = get_current_project()
    if scope == "session" and not session:
        session = get_current_session()

    if _use_graph():
        return _recall_graph(
            query=query,
            category=category,
            importance=importance,
            limit=limit,
            max_tokens=max_tokens,
            project=project,
            session=session,
            scope=scope,
        )

    return _recall_json(
        query=query,
        category=category,
        importance=importance,
        limit=limit,
        max_tokens=max_tokens,
        project=project,
        session=session,
        scope=scope,
    )


def _recall_graph(
    query: str = "",
    category: str = "",
    importance: str = "",
    limit: int = 10,
    max_tokens: int = 0,
    project: str = "",
    session: str = "",
    scope: str = "project",
) -> list[dict[str, Any]]:
    """Recall via GraphMemory with intent-aware traversal."""
    graph = _get_graph()
    try:
        results = graph.query(
            query=query,
            category=category,
            importance=importance,
            limit=limit,
            max_tokens=max_tokens,
            project=project,
            session=session,
            scope=scope,
        )

        # Update access metrics
        if results:
            now = datetime.now(timezone.utc).isoformat()
            for node in results:
                graph.update_node(
                    node["id"],
                    {
                        "access_count": node.get("access_count", 0) + 1,
                        "last_accessed_at": now,
                        "effective_importance": _compute_effective_importance(node),
                    },
                )

        return results
    finally:
        graph.close()


def _recall_json(
    query: str = "",
    category: str = "",
    importance: str = "",
    limit: int = 10,
    max_tokens: int = 0,
    project: str = "",
    session: str = "",
    scope: str = "project",
) -> list[dict[str, Any]]:
    """Recall via JSON backend (Phase 1 fallback)."""
    memory = _load_memory()
    insights = memory["insights"]

    # Filter by project/session/scope
    if scope == "session" and session:
        insights = [i for i in insights if i.get("session") == session]
    elif scope == "project" and project:
        insights = [i for i in insights if i.get("project") in (project, "_global")]

    # Filter by category
    if category:
        insights = [i for i in insights if i.get("category") == category]

    # Filter by importance
    if importance:
        insights = [i for i in insights if i.get("importance") == importance]

    # Search by query (keyword match in content + tags + summary)
    if query:
        query_lower = query.lower()
        query_tokens = query_lower.split()

        scored = []
        for ins in insights:
            text = " ".join(
                [
                    ins.get("content", ""),
                    ins.get("summary", ""),
                    " ".join(ins.get("tags", [])),
                ]
            ).lower()

            score = sum(1 for token in query_tokens if token in text)
            if score > 0:
                scored.append((score, ins))

        scored.sort(key=lambda x: (-x[0], x[1].get("created_at", "")))
        insights = [ins for _, ins in scored]
    else:
        insights.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    insights = insights[:limit]

    # Apply token budget
    if max_tokens > 0:
        budgeted: list[dict[str, Any]] = []
        tokens_used = 0
        for ins in insights:
            ins_tokens = ins.get("token_count", estimate_tokens(ins.get("content", "")))
            if tokens_used + ins_tokens > max_tokens and budgeted:
                break
            budgeted.append(ins)
            tokens_used += ins_tokens
        insights = budgeted

    # Update access metrics on returned insights
    if insights:
        now = datetime.now(timezone.utc).isoformat()
        returned_ids = {ins["id"] for ins in insights}
        modified = False
        for ins in memory["insights"]:
            if ins["id"] in returned_ids:
                ins["access_count"] = ins.get("access_count", 0) + 1
                ins["last_accessed_at"] = now
                ins["effective_importance"] = _compute_effective_importance(ins)
                modified = True
        if modified:
            _save_memory(memory)

    return insights


def forget(insight_id: str) -> bool:
    """Remove an insight by ID. Returns True if found and removed.

    Uses GraphMemory when available (removes node + all edges).
    """
    if _use_graph():
        graph = _get_graph()
        try:
            removed = graph.delete_node(insight_id)
        finally:
            graph.close()
    else:
        # JSON fallback
        memory = _load_memory()
        original_count = len(memory["insights"])
        memory["insights"] = [i for i in memory["insights"] if i.get("id") != insight_id]

        if len(memory["insights"]) < original_count:
            _save_memory(memory)
            removed = True
        else:
            removed = False

    if removed:
        from memcp.core.search import invalidate_bm25_cache

        invalidate_bm25_cache()
    return removed


def memory_status(project: str = "", session: str = "") -> dict[str, Any]:
    """Return memory statistics.

    Includes graph stats (edge counts, top entities) when graph backend is active.
    """
    # Auto-populate project when neither project nor session is specified
    if not project and not session:
        project = get_current_project()

    if _use_graph():
        return _status_graph(project=project, session=session)
    return _status_json(project=project, session=session)


def _status_graph(project: str = "", session: str = "") -> dict[str, Any]:
    """Status via GraphMemory."""
    graph = _get_graph()
    try:
        conn = graph._get_conn()

        # Build conditions
        conditions = []
        params: list[Any] = []
        if project:
            conditions.append("project = ?")
            params.append(project)
        if session:
            conditions.append("session = ?")
            params.append(session)

        where = " AND ".join(conditions) if conditions else "1=1"
        rows = conn.execute(
            f"SELECT * FROM nodes WHERE {where}",  # noqa: S608
            params,
        ).fetchall()

        insights = [graph._row_to_dict(r) for r in rows]

        by_category: dict[str, int] = {}
        by_importance: dict[str, int] = {}
        total_tokens = 0
        effective_importances: list[float] = []

        for ins in insights:
            cat = ins.get("category", "general")
            by_category[cat] = by_category.get(cat, 0) + 1
            imp = ins.get("importance", "medium")
            by_importance[imp] = by_importance.get(imp, 0) + 1
            total_tokens += ins.get("token_count", 0)
            effective_importances.append(_compute_effective_importance(ins))

        avg_effective = (
            sum(effective_importances) / len(effective_importances) if effective_importances else 0
        )

        config = get_config()
        result: dict[str, Any] = {
            "total_insights": len(insights),
            "max_insights": config.max_insights,
            "capacity_pct": (
                round(len(insights) / config.max_insights * 100, 1) if insights else 0
            ),
            "total_tokens": total_tokens,
            "by_category": by_category,
            "by_importance": by_importance,
            "avg_effective_importance": round(avg_effective, 4),
            "oldest": min((i.get("created_at", "") for i in insights), default=None),
            "newest": max((i.get("created_at", "") for i in insights), default=None),
            "backend": "graph",
        }

        # Add graph-specific stats
        graph_stats = graph.stats(project=project)
        result["graph"] = {
            "edge_counts": graph_stats["edge_counts"],
            "total_edges": graph_stats["total_edges"],
            "top_entities": graph_stats["top_entities"],
        }

        return result
    finally:
        graph.close()


def _status_json(project: str = "", session: str = "") -> dict[str, Any]:
    """Status via JSON backend."""
    memory = _load_memory()
    insights = memory["insights"]

    if project:
        insights = [i for i in insights if i.get("project") == project]
    if session:
        insights = [i for i in insights if i.get("session") == session]

    by_category: dict[str, int] = {}
    for ins in insights:
        cat = ins.get("category", "general")
        by_category[cat] = by_category.get(cat, 0) + 1

    by_importance: dict[str, int] = {}
    for ins in insights:
        imp = ins.get("importance", "medium")
        by_importance[imp] = by_importance.get(imp, 0) + 1

    total_tokens = sum(
        ins.get("token_count", estimate_tokens(ins.get("content", ""))) for ins in insights
    )

    effective_importances = [_compute_effective_importance(ins) for ins in insights]
    avg_effective = (
        sum(effective_importances) / len(effective_importances) if effective_importances else 0
    )

    config = get_config()
    return {
        "total_insights": len(insights),
        "max_insights": config.max_insights,
        "capacity_pct": round(len(insights) / config.max_insights * 100, 1) if insights else 0,
        "total_tokens": total_tokens,
        "by_category": by_category,
        "by_importance": by_importance,
        "avg_effective_importance": round(avg_effective, 4),
        "oldest": min((i.get("created_at", "") for i in insights), default=None),
        "newest": max((i.get("created_at", "") for i in insights), default=None),
        "backend": "json",
    }
