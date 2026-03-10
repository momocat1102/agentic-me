"""Graph tool implementations for MCP server."""

from __future__ import annotations

import json

from memcp.core.graph import GraphMemory
from memcp.core.project import get_current_project


def _get_graph() -> GraphMemory:
    """Get a GraphMemory instance."""
    return GraphMemory()


def do_related(
    insight_id: str,
    edge_type: str = "",
    depth: int = 1,
) -> str:
    """Traverse graph from an insight — find connected knowledge."""
    try:
        graph = _get_graph()
        try:
            result = graph.get_related(
                insight_id=insight_id,
                edge_type=edge_type,
                depth=depth,
            )
        finally:
            graph.close()

        # Format center node
        center = result["center"]
        center_summary = {
            "id": center["id"],
            "content": center["content"],
            "category": center.get("category", "general"),
            "importance": center.get("importance", "medium"),
            "tags": center.get("tags", []),
        }

        # Format related nodes
        related = [
            {
                "id": n["id"],
                "content": n["content"],
                "category": n.get("category", "general"),
                "importance": n.get("importance", "medium"),
                "tags": n.get("tags", []),
            }
            for n in result["related"]
        ]

        # Format edges
        edges = [
            {
                "source_id": e["source_id"],
                "target_id": e["target_id"],
                "edge_type": e["edge_type"],
                "weight": round(e["weight"], 3),
            }
            for e in result["edges"]
        ]

        return json.dumps(
            {
                "status": "ok",
                "center": center_summary,
                "related_count": len(related),
                "related": related,
                "edges": edges,
                "depth": result["depth"],
                "edge_type_filter": result["edge_type_filter"],
            },
            indent=2,
            default=str,
        )
    except (FileNotFoundError, ValueError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)
    except Exception as e:
        from memcp.core.errors import MemCPError

        if isinstance(e, MemCPError):
            return json.dumps({"status": "error", "message": str(e)}, indent=2)
        raise


def do_graph_stats(project: str = "") -> str:
    """Graph statistics: nodes, edges by type, top entities."""
    if not project:
        project = get_current_project()
    graph = _get_graph()
    try:
        result = graph.stats(project=project)
    finally:
        graph.close()

    return json.dumps(
        {
            "status": "ok",
            "node_count": result["node_count"],
            "edge_counts": result["edge_counts"],
            "total_edges": result["total_edges"],
            "top_entities": result["top_entities"],
        },
        indent=2,
        default=str,
    )
