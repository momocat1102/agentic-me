"""Context tool implementations for MCP server."""

from __future__ import annotations

import json

from memcp.core import chunker, context_store
from memcp.core.errors import MemCPError
from memcp.core.project import get_current_project


def load_context(
    name: str,
    content: str = "",
    file_path: str = "",
    project: str = "",
) -> str:
    """Store content as a named context variable."""
    try:
        result = context_store.load(
            name=name, content=content, file_path=file_path, project=project
        )

        if result.get("_duplicate"):
            return json.dumps(
                {
                    "status": "duplicate",
                    "message": f"Context {name!r} already has identical content.",
                    "name": result["name"],
                },
                indent=2,
                default=str,
            )

        return json.dumps(
            {
                "status": "stored",
                "name": result["name"],
                "type": result["type"],
                "size_bytes": result["size_bytes"],
                "line_count": result["line_count"],
                "token_estimate": result["token_estimate"],
            },
            indent=2,
            default=str,
        )
    except (ValueError, FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def inspect_context(name: str) -> str:
    """Get metadata and preview without loading full content."""
    try:
        result = context_store.inspect(name)
        return json.dumps(
            {
                "status": "ok",
                "name": result["name"],
                "type": result.get("type", "text"),
                "size_bytes": result.get("size_bytes", 0),
                "line_count": result.get("line_count", 0),
                "token_estimate": result.get("token_estimate", 0),
                "access_count": result.get("access_count", 0),
                "created_at": result.get("created_at", ""),
                "preview": result.get("preview", ""),
            },
            indent=2,
            default=str,
        )
    except (FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def get_context(name: str, start: int = 0, end: int = 0) -> str:
    """Read context content or a line slice."""
    try:
        result = context_store.get(name, start=start, end=end)
        return json.dumps(
            {
                "status": "ok",
                "name": result["name"],
                "content": result["content"],
                "lines_returned": result["lines_returned"],
                "total_lines": result["total_lines"],
                "token_estimate": result["token_estimate"],
            },
            indent=2,
            default=str,
        )
    except (FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_chunk_context(
    name: str,
    strategy: str = "auto",
    chunk_size: int = 0,
    overlap: int = 0,
) -> str:
    """Split a stored context into navigable chunks."""
    try:
        result = chunker.chunk_context(
            name=name,
            strategy=strategy,
            chunk_size=chunk_size,
            overlap=overlap,
        )
        return json.dumps(
            {
                "status": "chunked",
                "context_name": result["context_name"],
                "strategy": result["strategy"],
                "count": result["count"],
                "total_tokens": result["total_tokens"],
                "chunks": [
                    {
                        "index": c["index"],
                        "tokens": c["tokens"],
                        "lines": f"{c['start_line']}-{c['end_line']}",
                    }
                    for c in result["chunks"]
                ],
            },
            indent=2,
            default=str,
        )
    except (ValueError, FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_peek_chunk(
    context_name: str,
    chunk_index: int,
    start: int = 0,
    end: int = 0,
) -> str:
    """Read a specific chunk or a slice of it."""
    try:
        result = chunker.peek_chunk(
            context_name=context_name,
            chunk_index=chunk_index,
            start=start,
            end=end,
        )
        return json.dumps(
            {
                "status": "ok",
                "context_name": result["context_name"],
                "chunk_index": result["chunk_index"],
                "total_chunks": result["total_chunks"],
                "content": result["content"],
                "tokens": result["tokens"],
            },
            indent=2,
            default=str,
        )
    except (ValueError, FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_filter_context(name: str, pattern: str, invert: bool = False) -> str:
    """Regex filter within a context."""
    try:
        result = context_store.filter_context(name=name, pattern=pattern, invert=invert)
        return json.dumps(
            {
                "status": "ok",
                "name": result["name"],
                "pattern": result["pattern"],
                "invert": result["invert"],
                "content": result["content"],
                "lines_matched": result["lines_matched"],
                "total_lines": result["total_lines"],
                "token_estimate": result["token_estimate"],
            },
            indent=2,
            default=str,
        )
    except (ValueError, FileNotFoundError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)


def do_list_contexts(project: str = "") -> str:
    """List all stored contexts."""
    if not project:
        project = get_current_project()
    results = context_store.list_contexts(project=project)
    contexts = [
        {
            "name": r["name"],
            "type": r.get("type", "text"),
            "size_bytes": r.get("size_bytes", 0),
            "token_estimate": r.get("token_estimate", 0),
            "project": r.get("project", "default"),
            "created_at": r.get("created_at", ""),
        }
        for r in results
    ]
    return json.dumps(
        {
            "status": "ok",
            "count": len(contexts),
            "contexts": contexts,
        },
        indent=2,
        default=str,
    )


def do_clear_context(name: str) -> str:
    """Delete a context and its chunks."""
    try:
        removed = context_store.delete(name)
        if removed:
            return json.dumps({"status": "removed", "name": name}, indent=2)
        return json.dumps(
            {
                "status": "not_found",
                "message": f"Context {name!r} not found",
            },
            indent=2,
        )
    except (ValueError, MemCPError) as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)
