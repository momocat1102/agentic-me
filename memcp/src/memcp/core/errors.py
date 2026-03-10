"""MemCP error hierarchy — consistent exceptions across all modules."""

from __future__ import annotations


class MemCPError(Exception):
    """Base exception for all MemCP errors."""


class InsightNotFoundError(MemCPError):
    """Raised when an insight/node ID does not exist."""


class ValidationError(MemCPError):
    """Raised for invalid input: bad category, empty content, bad names, etc."""


class StorageError(MemCPError):
    """Raised for storage failures: SQLite errors, file I/O errors, corruption."""


class SecretDetectedError(ValidationError):
    """Raised when content contains secrets (API keys, tokens, passwords)."""
