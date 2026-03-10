"""Project and session tool implementations for MCP server."""

from __future__ import annotations

import json

from memcp.core.project import list_projects, list_sessions


def do_projects() -> str:
    """List all projects with stats."""
    try:
        projects = list_projects()
        return json.dumps(
            {
                "status": "ok",
                "count": len(projects),
                "projects": projects,
            },
            indent=2,
            default=str,
        )
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_sessions(project: str = "", limit: int = 20) -> str:
    """List sessions, optionally filtered by project."""
    try:
        sessions = list_sessions(project=project, limit=limit)
        return json.dumps(
            {
                "status": "ok",
                "count": len(sessions),
                "sessions": sessions,
            },
            indent=2,
            default=str,
        )
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)
