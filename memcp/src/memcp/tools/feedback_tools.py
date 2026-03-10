"""Feedback tools — reinforce or penalize insights based on user feedback."""

from __future__ import annotations

import json
from typing import Any

from memcp.core.errors import InsightNotFoundError, MemCPError


def do_reinforce(
    insight_id: str,
    helpful: bool = True,
    note: str = "",
) -> str:
    """Mark an insight as helpful or misleading.

    helpful=True: feedback_score += 0.1, boost connected edges by 0.02
    helpful=False: feedback_score -= 0.2, weaken connected edges by 0.05
    """
    from memcp.core.memory import _ensure_graph_migrated

    graph = _ensure_graph_migrated()
    try:
        node = graph.get_node(insight_id)
        if node is None:
            raise InsightNotFoundError(f"Insight {insight_id!r} not found")

        current_score = node.get("feedback_score", 0.0) or 0.0
        if helpful:
            new_score = min(current_score + 0.1, 1.0)
            edge_boost = 0.02
        else:
            new_score = max(current_score - 0.2, -1.0)
            edge_boost = -0.05

        graph.update_node(insight_id, {"feedback_score": new_score})
        edges_affected = graph._edge_manager.reinforce_edges(insight_id, edge_boost)

        result: dict[str, Any] = {
            "status": "ok",
            "insight_id": insight_id,
            "helpful": helpful,
            "feedback_score": round(new_score, 3),
            "edges_affected": edges_affected,
        }
        if note:
            result["note"] = note

        return json.dumps(result, indent=2, default=str)
    except InsightNotFoundError:
        return json.dumps(
            {"status": "error", "message": f"Insight {insight_id!r} not found"},
            indent=2,
        )
    except MemCPError as exc:
        return json.dumps({"status": "error", "message": str(exc)}, indent=2)
    finally:
        graph.close()
