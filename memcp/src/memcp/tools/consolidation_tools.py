"""Consolidation tools — preview and merge similar insights."""

from __future__ import annotations

import json
from typing import Any

from memcp.core.consolidation import find_similar_groups, merge_group
from memcp.core.errors import MemCPError


def do_consolidation_preview(
    threshold: float = 0.0,
    limit: int = 20,
    project: str = "",
) -> str:
    """Preview groups of similar insights that could be merged. Dry-run."""
    try:
        groups = find_similar_groups(threshold=threshold, project=project, limit=limit)
        result: dict[str, Any] = {
            "status": "ok",
            "groups_found": len(groups),
            "groups": [],
        }
        for group in groups:
            group_info = {
                "count": len(group),
                "insights": [
                    {
                        "id": n["id"],
                        "content": n["content"][:100],
                        "importance": n.get("importance", "medium"),
                        "access_count": n.get("access_count", 0),
                    }
                    for n in group
                ],
            }
            result["groups"].append(group_info)
        return json.dumps(result, indent=2, default=str)
    except MemCPError as exc:
        return json.dumps({"status": "error", "message": str(exc)}, indent=2)


def do_consolidate(
    group_ids: str,
    keep_id: str = "",
    merged_content: str = "",
) -> str:
    """Merge a group of similar insights into one."""
    try:
        ids = [s.strip() for s in group_ids.split(",") if s.strip()]
        if len(ids) < 2:
            return json.dumps(
                {"status": "error", "message": "Need at least 2 comma-separated insight IDs"},
                indent=2,
            )
        result = merge_group(ids, keep_id=keep_id, merged_content=merged_content)
        return json.dumps(result, indent=2, default=str)
    except MemCPError as exc:
        return json.dumps({"status": "error", "message": str(exc)}, indent=2)
