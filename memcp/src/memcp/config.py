"""MemCP configuration — env vars + directory management."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from memcp.core.errors import ValidationError


def _parse_int_env(name: str, default: int) -> int:
    """Parse an integer from an environment variable with a clear error."""
    raw = os.getenv(name, "")
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        raise ValidationError(
            f"Environment variable {name} must be an integer, got {raw!r}"
        ) from None


@dataclass
class MemCPConfig:
    """Configuration loaded from environment variables with sensible defaults."""

    data_dir: Path = field(default_factory=lambda: Path(os.getenv("MEMCP_DATA_DIR", "~/.memcp")))
    max_memory_mb: int = field(default_factory=lambda: _parse_int_env("MEMCP_MAX_MEMORY_MB", 2048))
    max_insights: int = field(default_factory=lambda: _parse_int_env("MEMCP_MAX_INSIGHTS", 10000))
    max_context_size_mb: int = field(
        default_factory=lambda: _parse_int_env("MEMCP_MAX_CONTEXT_SIZE_MB", 10)
    )
    importance_decay_days: int = field(
        default_factory=lambda: _parse_int_env("MEMCP_IMPORTANCE_DECAY_DAYS", 30)
    )
    retention_archive_days: int = field(
        default_factory=lambda: _parse_int_env("MEMCP_RETENTION_ARCHIVE_DAYS", 30)
    )
    retention_purge_days: int = field(
        default_factory=lambda: _parse_int_env("MEMCP_RETENTION_PURGE_DAYS", 180)
    )
    # Hebbian learning
    hebbian_enabled: bool = field(
        default_factory=lambda: os.getenv("MEMCP_HEBBIAN_ENABLED", "true").lower() == "true"
    )
    hebbian_boost: float = field(
        default_factory=lambda: float(os.getenv("MEMCP_HEBBIAN_BOOST", "0.05"))
    )
    # Edge decay
    edge_decay_half_life: int = field(
        default_factory=lambda: _parse_int_env("MEMCP_EDGE_DECAY_HALF_LIFE", 30)
    )
    edge_min_weight: float = field(
        default_factory=lambda: float(os.getenv("MEMCP_EDGE_MIN_WEIGHT", "0.05"))
    )
    # RRF search
    rrf_k: int = field(default_factory=lambda: _parse_int_env("MEMCP_RRF_K", 60))
    # Consolidation
    consolidation_threshold: float = field(
        default_factory=lambda: float(os.getenv("MEMCP_CONSOLIDATION_THRESHOLD", "0.85"))
    )

    def __post_init__(self) -> None:
        self.data_dir = self.data_dir.expanduser().resolve()
        self._validate()

    def _validate(self) -> None:
        """Validate configuration values."""
        if self.max_insights <= 0:
            raise ValidationError(f"max_insights must be > 0, got {self.max_insights}")
        if self.importance_decay_days < 0:
            raise ValidationError(
                f"importance_decay_days must be >= 0, got {self.importance_decay_days}"
            )
        if self.max_memory_mb <= 0:
            raise ValidationError(f"max_memory_mb must be > 0, got {self.max_memory_mb}")
        if self.max_context_size_mb <= 0:
            raise ValidationError(
                f"max_context_size_mb must be > 0, got {self.max_context_size_mb}"
            )
        if self.retention_purge_days < self.retention_archive_days:
            raise ValidationError(
                f"retention_purge_days ({self.retention_purge_days}) must be >= "
                f"retention_archive_days ({self.retention_archive_days})"
            )

    @property
    def memory_path(self) -> Path:
        return self.data_dir / "memory.json"

    @property
    def contexts_dir(self) -> Path:
        return self.data_dir / "contexts"

    @property
    def chunks_dir(self) -> Path:
        return self.data_dir / "chunks"

    @property
    def state_path(self) -> Path:
        return self.data_dir / "state.json"

    @property
    def graph_db_path(self) -> Path:
        return self.data_dir / "graph.db"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def archive_dir(self) -> Path:
        return self.data_dir / "archive"

    @property
    def sessions_path(self) -> Path:
        return self.data_dir / "sessions.json"

    def ensure_dirs(self) -> None:
        """Create all required directories if they don't exist."""
        dirs = [self.data_dir, self.contexts_dir, self.chunks_dir, self.cache_dir, self.archive_dir]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)


# Singleton — created once, reused everywhere.
_config: MemCPConfig | None = None


def get_config() -> MemCPConfig:
    """Get or create the global config singleton."""
    global _config
    if _config is None:
        _config = MemCPConfig()
        _config.ensure_dirs()
    return _config
