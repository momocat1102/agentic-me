"""GraphTraversal — query, intent detection, and graph traversal.

Handles query routing, intent-aware ranking, and related-node traversal.
Extracted from GraphMemory.
"""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Any

from memcp.core.errors import InsightNotFoundError

if TYPE_CHECKING:
    from memcp.core.edge_manager import EdgeManager
    from memcp.core.node_store import NodeStore


class GraphTraversal:
    """Query routing, intent detection, and graph traversal."""

    def __init__(self, node_store: NodeStore, edge_manager: EdgeManager) -> None:
        self._node_store = node_store
        self._edge_manager = edge_manager

    def query(
        self,
        query: str = "",
        category: str = "",
        importance: str = "",
        limit: int = 10,
        max_tokens: int = 0,
        project: str = "",
        session: str = "",
        scope: str = "project",
    ) -> list[dict[str, Any]]:
        """Query nodes with intent-aware graph traversal."""
        conn = self._node_store._get_conn()

        conditions = []
        params: list[Any] = []

        if scope == "session" and session:
            conditions.append("session = ?")
            params.append(session)
        elif scope == "project" and project:
            conditions.append("(project = ? OR project = '_global')")
            params.append(project)

        if category:
            conditions.append("category = ?")
            params.append(category)

        if importance:
            conditions.append("importance = ?")
            params.append(importance)

        where = " AND ".join(conditions) if conditions else "1=1"
        rows = conn.execute(
            f"SELECT * FROM nodes WHERE {where} ORDER BY created_at DESC",  # noqa: S608
            params,
        ).fetchall()

        nodes = [self._node_store._row_to_dict(r) for r in rows]

        if query.strip():
            intent = self._detect_intent(query)
            nodes = self._rank_by_intent(query, nodes, intent, limit)
        else:
            nodes = nodes[:limit]

        # Hebbian: strengthen edges between co-retrieved nodes
        if len(nodes) >= 2:
            from memcp.config import get_config

            config = get_config()
            if config.hebbian_enabled:
                result_ids = [n["id"] for n in nodes[:10]]
                self._edge_manager.strengthen_co_retrieved(result_ids, config.hebbian_boost)
                # Lazy edge decay (rate-limited to once per hour)
                self._edge_manager.decay_stale_edges(
                    config.edge_decay_half_life, config.edge_min_weight
                )

        if max_tokens > 0:
            budgeted: list[dict[str, Any]] = []
            tokens_used = 0
            for node in nodes:
                n_tokens = node.get("token_count", 0)
                if tokens_used + n_tokens > max_tokens and budgeted:
                    break
                budgeted.append(node)
                tokens_used += n_tokens
            nodes = budgeted

        return nodes

    def get_related(
        self,
        insight_id: str,
        edge_type: str = "",
        depth: int = 1,
    ) -> dict[str, Any]:
        """Traverse graph from a node, optionally filtering by edge type."""
        center = self._node_store.get_node(insight_id)
        if center is None:
            raise InsightNotFoundError(f"Insight {insight_id!r} not found")

        visited: set[str] = {insight_id}
        related_nodes: list[dict[str, Any]] = []
        related_edges: list[dict[str, Any]] = []

        frontier = [insight_id]
        for _d in range(depth):
            next_frontier: list[str] = []
            for node_id in frontier:
                edges = self._edge_manager.get_edges(node_id, edge_type)
                for edge in edges:
                    other_id = (
                        edge["target_id"] if edge["source_id"] == node_id else edge["source_id"]
                    )
                    if other_id not in visited:
                        visited.add(other_id)
                        node = self._node_store.get_node(other_id)
                        if node:
                            related_nodes.append(node)
                            next_frontier.append(other_id)
                    related_edges.append(edge)
            frontier = next_frontier

        return {
            "center": center,
            "related": related_nodes,
            "edges": related_edges,
            "depth": depth,
            "edge_type_filter": edge_type or "all",
        }

    def stats(self, project: str = "") -> dict[str, Any]:
        """Graph statistics: node/edge counts, top entities."""
        conn = self._node_store._get_conn()

        if project:
            node_count = conn.execute(
                "SELECT COUNT(*) FROM nodes WHERE project = ?", (project,)
            ).fetchone()[0]
        else:
            node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]

        edge_counts: dict[str, int] = {}
        for etype in ("semantic", "temporal", "causal", "entity"):
            if project:
                count = conn.execute(
                    """SELECT COUNT(*) FROM edges e
                       JOIN nodes n ON e.source_id = n.id
                       WHERE e.edge_type = ? AND n.project = ?""",
                    (etype, project),
                ).fetchone()[0]
            else:
                count = conn.execute(
                    "SELECT COUNT(*) FROM edges WHERE edge_type = ?", (etype,)
                ).fetchone()[0]
            edge_counts[etype] = count

        entity_freq: dict[str, int] = {}
        if project:
            rows = conn.execute(
                "SELECT entities FROM nodes WHERE project = ?", (project,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT entities FROM nodes").fetchall()

        for row in rows:
            try:
                entities = json.loads(row["entities"])
                for e in entities:
                    entity_freq[e] = entity_freq.get(e, 0) + 1
            except (json.JSONDecodeError, TypeError):
                continue

        top_entities = sorted(entity_freq.items(), key=lambda x: -x[1])[:10]

        return {
            "node_count": node_count,
            "edge_counts": edge_counts,
            "total_edges": sum(edge_counts.values()),
            "top_entities": [{"entity": e, "count": c} for e, c in top_entities],
        }

    # ── Internal helpers ──────────────────────────────────────────

    def _detect_intent(self, query: str) -> str:
        """Detect query intent from keywords."""
        q = query.lower().strip()
        if q.startswith("why") or "reason" in q or "cause" in q:
            return "why"
        if q.startswith("when") or "timeline" in q or "chronolog" in q:
            return "when"
        if q.startswith("who") or q.startswith("which") or "entity" in q:
            return "who"
        return "what"

    def _rank_by_intent(
        self,
        query: str,
        nodes: list[dict[str, Any]],
        intent: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        """Rank nodes by combining keyword match with intent-weighted edge scores."""
        query_tokens = set(re.findall(r"\w+", query.lower()))
        if not query_tokens:
            return nodes[:limit]

        scored: list[tuple[float, dict[str, Any]]] = []
        for node in nodes:
            text = " ".join(
                [
                    node.get("content", ""),
                    node.get("summary", ""),
                    " ".join(node.get("tags", [])),
                ]
            ).lower()
            doc_tokens = set(re.findall(r"\w+", text))
            overlap = query_tokens & doc_tokens
            if not overlap:
                continue

            keyword_score = len(overlap) / len(query_tokens)
            edge_boost = self._compute_edge_boost(node["id"], intent)
            total_score = keyword_score * 0.7 + edge_boost * 0.3

            # Apply feedback score boost/penalty
            feedback_score = node.get("feedback_score", 0.0) or 0.0
            total_score *= 1 + feedback_score * 0.3

            scored.append((total_score, node))

        scored.sort(key=lambda x: -x[0])
        return [node for _, node in scored[:limit]]

    def _compute_edge_boost(self, node_id: str, intent: str) -> float:
        """Compute edge-based boost for a given intent."""
        intent_to_type = {
            "what": "semantic",
            "when": "temporal",
            "why": "causal",
            "who": "entity",
        }
        primary_type = intent_to_type.get(intent, "semantic")

        conn = self._node_store._get_conn()
        primary_count = conn.execute(
            """SELECT COUNT(*) FROM edges
               WHERE (source_id = ? OR target_id = ?) AND edge_type = ?""",
            (node_id, node_id, primary_type),
        ).fetchone()[0]

        total_count = conn.execute(
            "SELECT COUNT(*) FROM edges WHERE source_id = ? OR target_id = ?",
            (node_id, node_id),
        ).fetchone()[0]

        if total_count == 0:
            return 0.0

        return min(1.0, primary_count / max(1, total_count) + 0.1 * primary_count)
