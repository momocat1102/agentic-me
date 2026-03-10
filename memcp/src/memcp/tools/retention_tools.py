"""Retention tool implementations for MCP server."""

from __future__ import annotations

import json

from memcp.core import retention
from memcp.core.errors import MemCPError


def do_retention_preview(archive_days: int = 0, purge_days: int = 0) -> str:
    """Preview retention actions — dry-run, no changes made."""
    try:
        result = retention.retention_preview(
            archive_days=archive_days,
            purge_days=purge_days,
        )
        return json.dumps(
            {"status": "ok", **result},
            indent=2,
            default=str,
        )
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_retention_run(archive: bool = True, purge: bool = False) -> str:
    """Execute retention actions."""
    try:
        result = retention.retention_run(archive=archive, purge=purge)
        return json.dumps(
            {"status": "ok", **result},
            indent=2,
            default=str,
        )
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_restore(name: str, item_type: str = "auto") -> str:
    """Restore an archived context or insight."""
    try:
        if item_type == "context":
            result = retention.restore_context(name)
        elif item_type == "insight":
            result = retention.restore_insight(name)
        elif item_type == "auto":
            # Try context first, then insight
            try:
                result = retention.restore_context(name)
            except (FileNotFoundError, MemCPError):
                try:
                    result = retention.restore_insight(name)
                except (ValueError, FileNotFoundError, MemCPError):
                    return json.dumps(
                        {
                            "status": "not_found",
                            "message": f"No archived item found with name/ID {name!r}",
                        },
                        indent=2,
                    )
        else:
            return json.dumps(
                {
                    "status": "error",
                    "message": f"Invalid item_type {item_type!r}. Must be: auto, context, insight",
                },
                indent=2,
            )

        return json.dumps(
            {
                "status": "restored",
                "name": result.get("name", result.get("id", name)),
                "type": "context" if "name" in result else "insight",
            },
            indent=2,
            default=str,
        )
    except (FileNotFoundError, ValueError, MemCPError) as e:
        return json.dumps({"status": "not_found", "message": str(e)}, indent=2)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)
