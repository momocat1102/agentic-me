"""File safety utilities — atomic writes, locking, validation, hashing."""

from __future__ import annotations

import fcntl
import hashlib
import json
import re
import tempfile
from pathlib import Path
from typing import Any

from memcp.core.errors import ValidationError

_SAFE_NAME_RE = re.compile(r"^[\w.\-]+$")


def safe_name(name: str) -> str:
    """Validate a name for use as a filename. Raises ValidationError if invalid."""
    if not name or not _SAFE_NAME_RE.match(name):
        raise ValidationError(
            f"Invalid name {name!r}: must match ^[\\w.\\-]+$"
            " (alphanumeric, dots, hyphens, underscores)"
        )
    if ".." in name:
        raise ValidationError(f"Invalid name {name!r}: path traversal not allowed")
    return name


def content_hash(text: str) -> str:
    """SHA-256 hash of normalized text (stripped, lowered)."""
    normalized = text.strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def atomic_write_json(path: Path, data: Any) -> None:
    """Write JSON atomically with file locking.

    1. Acquire exclusive lock on a .lock file
    2. Write to a temp file in the same directory
    3. os.replace() the temp file over the target (atomic on POSIX)
    4. Release lock
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")

    with open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
            try:
                with open(fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2, default=str)
                Path(tmp_path).replace(path)
            except BaseException:
                Path(tmp_path).unlink(missing_ok=True)
                raise
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def atomic_write_text(path: Path, content: str) -> None:
    """Write text atomically with file locking."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")

    with open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
            try:
                with open(fd, "w", encoding="utf-8") as f:
                    f.write(content)
                Path(tmp_path).replace(path)
            except BaseException:
                Path(tmp_path).unlink(missing_ok=True)
                raise
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def locked_read_json(path: Path) -> Any:
    """Read JSON with shared lock for safe concurrent reads."""
    path = Path(path)
    if not path.exists():
        return None

    lock_path = path.with_suffix(path.suffix + ".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    with open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_SH)
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def estimate_tokens(text: str) -> int:
    """Estimate token count using the ~4 chars per token heuristic."""
    return max(1, len(text) // 4)
