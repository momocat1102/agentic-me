"""Secret detection — prevent accidental storage of credentials.

Scans content for common secret patterns (API keys, tokens, passwords)
and raises SecretDetectedError when found. Enabled by default,
disabled via MEMCP_SECRET_DETECTION=false.
"""

from __future__ import annotations

import os
import re
from typing import NamedTuple

from memcp.core.errors import SecretDetectedError

_SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("OpenAI API Key", re.compile(r"sk-[A-Za-z0-9]{20,}")),
    ("Anthropic API Key", re.compile(r"sk-ant-[A-Za-z0-9\-]{20,}")),
    ("GitHub Token", re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}")),
    ("Stripe Key", re.compile(r"[sr]k_live_[A-Za-z0-9]{20,}")),
    ("Bearer Token", re.compile(r"Bearer\s+[A-Za-z0-9\-_.~+/]{20,}")),
    ("Private Key Block", re.compile(r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----")),
    (
        "Password Assignment",
        re.compile(
            r"""(?:password|passwd|secret|token)\s*[=:]\s*['"][^'"]{8,}['"]""",
            re.IGNORECASE,
        ),
    ),
]


class SecretMatch(NamedTuple):
    """A detected secret match."""

    pattern_name: str
    preview: str  # first 10 chars only


class SecretDetector:
    """Detects secrets in content using regex patterns."""

    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled

    def check(self, content: str) -> None:
        """Check content for secrets. Raises SecretDetectedError if found."""
        if not self.enabled:
            return

        matches = self.scan(content)
        if matches:
            names = ", ".join(m.pattern_name for m in matches[:3])
            raise SecretDetectedError(
                f"Content contains potential secrets: {names}. "
                "Remove secrets before storing. "
                "Set MEMCP_SECRET_DETECTION=false to disable."
            )

    def scan(self, content: str) -> list[SecretMatch]:
        """Scan content and return all matches (without raising)."""
        if not self.enabled:
            return []

        matches: list[SecretMatch] = []
        for name, pattern in _SECRET_PATTERNS:
            m = pattern.search(content)
            if m:
                preview = m.group()[:10] + "..."
                matches.append(SecretMatch(pattern_name=name, preview=preview))
        return matches


_detector: SecretDetector | None = None


def get_secret_detector() -> SecretDetector:
    """Get or create the global SecretDetector singleton."""
    global _detector
    if _detector is None:
        enabled = os.getenv("MEMCP_SECRET_DETECTION", "true").lower() != "false"
        _detector = SecretDetector(enabled=enabled)
    return _detector
