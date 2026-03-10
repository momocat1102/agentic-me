"""Chunker — split content into navigable segments.

Supports multiple splitting strategies: by lines, paragraphs, headings,
characters, regex, or auto-detection based on content type.

Chunk sets are stored on disk:
    ~/.memcp/chunks/{context_name}/
        index.json     # {strategy, count, chunks: [{index, tokens, ...}]}
        0000.md
        0001.md
        ...
"""

from __future__ import annotations

import re
import shutil
from typing import Any

from memcp.config import get_config
from memcp.core.errors import InsightNotFoundError, ValidationError
from memcp.core.fileutil import (
    atomic_write_json,
    atomic_write_text,
    estimate_tokens,
    locked_read_json,
    safe_name,
)


def by_lines(content: str, size: int = 50, overlap: int = 5) -> list[dict[str, Any]]:
    """Split content into chunks of N lines with optional overlap."""
    lines = content.split("\n")
    chunks = []
    i = 0
    while i < len(lines):
        end = min(i + size, len(lines))
        chunk_lines = lines[i:end]
        chunk_text = "\n".join(chunk_lines)
        chunks.append(
            {
                "content": chunk_text,
                "start_line": i + 1,
                "end_line": end,
                "tokens": estimate_tokens(chunk_text),
            }
        )
        i += size - overlap if overlap < size else size
        if i >= len(lines):
            break
    return chunks


def by_paragraphs(content: str, max_tokens: int = 2000) -> list[dict[str, Any]]:
    """Split content by paragraphs, grouping until max_tokens is reached."""
    paragraphs = re.split(r"\n\s*\n", content)
    chunks = []
    current_parts: list[str] = []
    current_tokens = 0
    line_offset = 1

    for para in paragraphs:
        para_tokens = estimate_tokens(para)

        if current_tokens + para_tokens > max_tokens and current_parts:
            chunk_text = "\n\n".join(current_parts)
            end_line = line_offset + chunk_text.count("\n")
            chunks.append(
                {
                    "content": chunk_text,
                    "start_line": line_offset,
                    "end_line": end_line,
                    "tokens": estimate_tokens(chunk_text),
                }
            )
            line_offset = end_line + 2  # +2 for the paragraph break
            current_parts = []
            current_tokens = 0

        current_parts.append(para)
        current_tokens += para_tokens

    if current_parts:
        chunk_text = "\n\n".join(current_parts)
        end_line = line_offset + chunk_text.count("\n")
        chunks.append(
            {
                "content": chunk_text,
                "start_line": line_offset,
                "end_line": end_line,
                "tokens": estimate_tokens(chunk_text),
            }
        )

    return chunks


def by_headings(content: str) -> list[dict[str, Any]]:
    """Split markdown content on ## headings."""
    lines = content.split("\n")
    chunks = []
    current_lines: list[str] = []
    start_line = 1

    for i, line in enumerate(lines):
        if re.match(r"^#{1,3}\s", line) and current_lines:
            chunk_text = "\n".join(current_lines)
            chunks.append(
                {
                    "content": chunk_text,
                    "start_line": start_line,
                    "end_line": start_line + len(current_lines) - 1,
                    "tokens": estimate_tokens(chunk_text),
                }
            )
            current_lines = []
            start_line = i + 1

        current_lines.append(line)

    if current_lines:
        chunk_text = "\n".join(current_lines)
        chunks.append(
            {
                "content": chunk_text,
                "start_line": start_line,
                "end_line": start_line + len(current_lines) - 1,
                "tokens": estimate_tokens(chunk_text),
            }
        )

    return chunks


def by_chars(content: str, size: int = 4000, overlap: int = 200) -> list[dict[str, Any]]:
    """Split content into chunks of N characters with overlap."""
    chunks = []
    i = 0
    line_offset = 1

    while i < len(content):
        end = min(i + size, len(content))
        chunk_text = content[i:end]
        line_count = chunk_text.count("\n")
        chunks.append(
            {
                "content": chunk_text,
                "start_line": line_offset,
                "end_line": line_offset + line_count,
                "tokens": estimate_tokens(chunk_text),
            }
        )
        line_offset += content[i : i + (size - overlap)].count("\n")
        step = size - overlap if overlap < size else size
        i += step

    return chunks


def by_regex(content: str, pattern: str) -> list[dict[str, Any]]:
    """Split content on a regex pattern (pattern becomes separator)."""
    parts = re.split(pattern, content)
    chunks = []
    line_offset = 1

    for part in parts:
        part = part.strip()
        if not part:
            continue
        line_count = part.count("\n")
        chunks.append(
            {
                "content": part,
                "start_line": line_offset,
                "end_line": line_offset + line_count,
                "tokens": estimate_tokens(part),
            }
        )
        line_offset += line_count + 1

    return chunks


def auto(content: str, content_type: str = "text", target: int = 10) -> list[dict[str, Any]]:
    """Auto-select splitting strategy based on content type.

    Args:
        content: The content to split
        content_type: Detected type (markdown, python, json, text, etc.)
        target: Target number of chunks (approximate)
    """
    if content_type == "markdown":
        chunks = by_headings(content)
        if len(chunks) >= 2:
            return chunks

    total_lines = content.count("\n") + 1
    if content_type in ("python", "javascript", "typescript", "go", "rust", "java"):
        lines_per_chunk = max(10, total_lines // target)
        return by_lines(content, size=lines_per_chunk, overlap=3)

    # Prose / other — use paragraphs
    total_tokens = estimate_tokens(content)
    tokens_per_chunk = max(200, total_tokens // target)
    return by_paragraphs(content, max_tokens=tokens_per_chunk)


def chunk_context(
    name: str,
    strategy: str = "auto",
    chunk_size: int = 0,
    overlap: int = 0,
    pattern: str = "",
) -> dict[str, Any]:
    """Chunk a stored context and write chunks to disk.

    Args:
        name: Context name (must already be loaded)
        strategy: Splitting strategy (auto, lines, paragraphs, headings,
                  chars, regex)
        chunk_size: Size parameter (lines for 'lines', chars for 'chars',
                    tokens for 'paragraphs')
        overlap: Overlap parameter (lines or chars)
        pattern: Regex pattern (for 'regex' strategy)

    Returns summary dict with chunk count and index.
    """
    safe_name(name)
    config = get_config()

    # Read the context content
    ctx_dir = config.contexts_dir / name
    content_path = ctx_dir / "content.md"
    meta_path = ctx_dir / "meta.json"

    meta = locked_read_json(meta_path)
    if meta is None:
        raise InsightNotFoundError(f"Context {name!r} not found")

    if not content_path.exists():
        raise InsightNotFoundError(f"Context content for {name!r} missing")

    content = content_path.read_text(encoding="utf-8")
    content_type = meta.get("type", "text")

    # Apply strategy
    if strategy == "lines":
        sz = chunk_size or 50
        ov = overlap if overlap > 0 else (0 if chunk_size else 5)
        chunks = by_lines(content, size=sz, overlap=ov)
    elif strategy == "paragraphs":
        mt = chunk_size or 2000
        chunks = by_paragraphs(content, max_tokens=mt)
    elif strategy == "headings":
        chunks = by_headings(content)
    elif strategy == "chars":
        sz = chunk_size or 4000
        ov = overlap if overlap > 0 else (0 if chunk_size else 200)
        chunks = by_chars(content, size=sz, overlap=ov)
    elif strategy == "regex":
        if not pattern:
            raise ValidationError("Pattern required for regex strategy")
        chunks = by_regex(content, pattern)
    elif strategy == "auto":
        chunks = auto(content, content_type)
    else:
        raise ValidationError(
            f"Unknown strategy {strategy!r}. "
            "Must be: auto, lines, paragraphs, headings, chars, regex"
        )

    # Write chunks to disk
    chunks_dir = config.chunks_dir / name
    if chunks_dir.exists():
        shutil.rmtree(chunks_dir)
    chunks_dir.mkdir(parents=True, exist_ok=True)

    index_entries = []
    for i, chunk in enumerate(chunks):
        chunk_path = chunks_dir / f"{i:04d}.md"
        atomic_write_text(chunk_path, chunk["content"])
        index_entries.append(
            {
                "index": i,
                "tokens": chunk["tokens"],
                "start_line": chunk.get("start_line", 0),
                "end_line": chunk.get("end_line", 0),
            }
        )

    index = {
        "context_name": name,
        "strategy": strategy,
        "count": len(chunks),
        "total_tokens": sum(c["tokens"] for c in chunks),
        "chunks": index_entries,
    }
    atomic_write_json(chunks_dir / "index.json", index)

    # Auto-embed chunks if an embedding provider is available
    _embed_chunks(chunks_dir, chunks, name)

    return index


def peek_chunk(
    context_name: str,
    chunk_index: int,
    start: int = 0,
    end: int = 0,
) -> dict[str, Any]:
    """Read a specific chunk (or a line slice of it).

    Args:
        context_name: Context name
        chunk_index: Chunk number (0-indexed)
        start: Start line within chunk (1-indexed, 0 = from beginning)
        end: End line within chunk (1-indexed, inclusive, 0 = to end)

    Returns dict with chunk content and metadata.
    """
    safe_name(context_name)
    config = get_config()
    chunks_dir = config.chunks_dir / context_name

    index_path = chunks_dir / "index.json"
    index = locked_read_json(index_path)
    if index is None:
        raise InsightNotFoundError(
            f"No chunks found for context {context_name!r}. Run memcp_chunk_context first."
        )

    if chunk_index < 0 or chunk_index >= index["count"]:
        raise ValidationError(f"Chunk index {chunk_index} out of range (0-{index['count'] - 1})")

    chunk_path = chunks_dir / f"{chunk_index:04d}.md"
    if not chunk_path.exists():
        raise InsightNotFoundError(f"Chunk file {chunk_index:04d}.md missing")

    content = chunk_path.read_text(encoding="utf-8")

    if start > 0 or end > 0:
        lines = content.split("\n")
        s = max(0, start - 1) if start > 0 else 0
        e = end if end > 0 else len(lines)
        content = "\n".join(lines[s:e])

    chunk_meta = index["chunks"][chunk_index]
    return {
        "context_name": context_name,
        "chunk_index": chunk_index,
        "total_chunks": index["count"],
        "content": content,
        "tokens": estimate_tokens(content),
        "start_line": chunk_meta.get("start_line", 0),
        "end_line": chunk_meta.get("end_line", 0),
    }


def _embed_chunks(
    chunks_dir: Any,
    chunks: list[dict[str, Any]],
    context_name: str,
) -> None:
    """Auto-embed chunks if an embedding provider is available.

    Never raises — embedding failure must not break chunk creation.
    """
    try:
        from memcp.core.embeddings import get_provider
        from memcp.core.vecstore import VectorStore

        provider = get_provider()
        if provider is None:
            return

        texts = [c["content"] for c in chunks]
        vectors = provider.embed_batch(texts)

        store = VectorStore(chunks_dir / "embeddings.npz")
        ids = [f"{context_name}:{i}" for i in range(len(chunks))]
        store.add_batch(ids, vectors)
        store.save()
    except Exception:
        pass
