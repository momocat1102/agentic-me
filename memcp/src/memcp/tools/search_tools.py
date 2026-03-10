"""Search tool implementation for MCP server."""

from __future__ import annotations

import json
from typing import Any

from memcp.core.errors import MemCPError
from memcp.core.project import get_current_project
from memcp.core.search import search_all


def do_search(
    query: str,
    limit: int = 10,
    source: str = "all",
    max_tokens: int = 0,
    project: str = "",
    scope: str = "project",
) -> str:
    """Search across memory insights and context chunks."""
    if scope == "project" and not project:
        project = get_current_project()

    try:
        result = search_all(
            query=query,
            limit=limit,
            source=source,
            max_tokens=max_tokens,
            project=project,
            scope=scope,
        )

        items = []
        for r in result["results"]:
            item: dict[str, Any] = {
                "id": r.get("id", ""),
                "content": r.get("content", "")[:500],
                "source": r.get("_source", "unknown"),
                "token_count": r.get("token_count", 0),
            }
            if r.get("_source") == "context":
                item["context_name"] = r.get("context_name", "")
                item["chunk_index"] = r.get("chunk_index", -1)
            else:
                item["category"] = r.get("category", "")
                item["importance"] = r.get("importance", "")
                item["tags"] = r.get("tags", [])

            if "_score" in r:
                item["score"] = round(r["_score"], 4)

            items.append(item)

        return json.dumps(
            {
                "status": "ok",
                "query": result["query"],
                "method": result["method"],
                "count": result["count"],
                "capabilities": result["capabilities"],
                "results": items,
            },
            indent=2,
            default=str,
        )
    except (ValueError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)
