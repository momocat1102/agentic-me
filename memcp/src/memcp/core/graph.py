"""MAGMA-inspired 4-graph memory — SQLite-backed with auto-edges.

Four edge types on the same node set (insights):
  - semantic: similar content (keyword overlap)
  - temporal: created close in time (same session, <30 min gap)
  - causal: cause→effect (detected by keyword patterns)
  - entity: shared extracted entities (files, modules, URLs, etc.)

Storage: SQLite at ~/.memcp/graph.db with WAL mode for concurrent reads.

This module is a thin facade delegating to:
  - NodeStore (node_store.py): connection mgmt, node CRUD
  - EdgeManager (edge_manager.py): edge generation and queries
  - GraphTraversal (graph_traversal.py): query routing, intent detection, traversal
"""

from __future__ import annotations

from typing import Any

from memcp.core.edge_manager import _CAUSAL_PATTERNS, EdgeManager
from memcp.core.graph_traversal import GraphTraversal
from memcp.core.node_store import (
    _SCHEMA,
    CombinedEntityExtractor,
    EntityExtractor,
    NodeStore,
    RegexEntityExtractor,
    SpacyEntityExtractor,
)

# Re-export for backward compatibility
__all__ = [
    "CombinedEntityExtractor",
    "EntityExtractor",
    "GraphMemory",
    "RegexEntityExtractor",
    "SpacyEntityExtractor",
    "_CAUSAL_PATTERNS",
    "_SCHEMA",
]


class GraphMemory:
    """SQLite-backed 4-graph memory inspired by MAGMA.

    Nodes are insights; edges encode semantic, temporal, causal, and entity
    relationships.  Auto-generates edges on insert.
    """

    def __init__(self, db_path: str | None = None) -> None:
        self._node_store = NodeStore(db_path)
        self._edge_manager = EdgeManager(self._node_store)
        self._traversal = GraphTraversal(self._node_store, self._edge_manager)

    # ── Connection management (pass-through) ──────────────────────

    def _get_conn(self):  # noqa: ANN201
        """Expose connection for backward compatibility (memory.py uses this)."""
        return self._node_store._get_conn()

    def close(self) -> None:
        self._node_store.close()

    # ── Node operations (delegate to NodeStore) ───────────────────

    def store(self, insight: dict[str, Any]) -> dict[str, Any]:
        """Insert a node and auto-generate edges."""
        result = self._node_store.store(insight)
        self._edge_manager.generate_edges(insight)
        return result

    def get_node(self, node_id: str) -> dict[str, Any] | None:
        return self._node_store.get_node(node_id)

    def delete_node(self, node_id: str) -> bool:
        return self._node_store.delete_node(node_id)

    def update_node(self, node_id: str, updates: dict[str, Any]) -> bool:
        return self._node_store.update_node(node_id, updates)

    # ── Query / Traversal (delegate to GraphTraversal) ────────────

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
        return self._traversal.query(
            query=query,
            category=category,
            importance=importance,
            limit=limit,
            max_tokens=max_tokens,
            project=project,
            session=session,
            scope=scope,
        )

    def get_related(
        self,
        insight_id: str,
        edge_type: str = "",
        depth: int = 1,
    ) -> dict[str, Any]:
        return self._traversal.get_related(
            insight_id=insight_id,
            edge_type=edge_type,
            depth=depth,
        )

    def stats(self, project: str = "") -> dict[str, Any]:
        return self._traversal.stats(project=project)

    # ── Migration ─────────────────────────────────────────────────

    def migrate_from_json(self, memory: dict[str, Any]) -> int:
        """Import insights from a Phase 1 memory.json into the graph."""
        imported = 0
        for ins in memory.get("insights", []):
            if self.get_node(ins["id"]) is None:
                self.store(ins)
                imported += 1
        return imported

    # ── Backward-compat helpers ───────────────────────────────────

    def _row_to_dict(self, row: Any) -> dict[str, Any]:
        """Expose _row_to_dict for backward compatibility (memory.py uses this)."""
        return self._node_store._row_to_dict(row)

    def _get_edges(self, node_id: str, edge_type: str = "") -> list[dict[str, Any]]:
        """Expose _get_edges for backward compatibility (tests use this)."""
        return self._edge_manager.get_edges(node_id, edge_type)

    def _detect_intent(self, query: str) -> str:
        """Expose _detect_intent for backward compatibility (tests use this)."""
        return self._traversal._detect_intent(query)

    def _compute_edge_boost(self, node_id: str, intent: str) -> float:
        """Expose _compute_edge_boost for backward compatibility (tests use this)."""
        return self._traversal._compute_edge_boost(node_id, intent)
