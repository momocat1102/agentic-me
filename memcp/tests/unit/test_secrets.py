"""Tests for memcp.core.secrets."""

from __future__ import annotations

from pathlib import Path

import pytest

from memcp.core.errors import SecretDetectedError
from memcp.core.secrets import SecretDetector

# Build fake secret strings dynamically to avoid triggering GitHub push protection.
# None of these are real credentials.
_AWS_KEY = "AKIA" + "IOSFODNN7EXAMPLE"
_OPENAI_KEY = "sk-" + "abcdefghijklmnopqrstuvwxyz1234567890"
_ANTHROPIC_KEY = "sk-ant-" + "api03-abcdefghijklmnopqrstuvwxyz"
_GITHUB_TOKEN = "ghp_" + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn"
_STRIPE_KEY = "rk_" + "live_ABCDEFGHIJKLMNOPQRSTUVWXYZabcde"
_BEARER_TOKEN = "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
_PRIVATE_KEY_HEADER = "-----BEGIN RSA " + "PRIVATE KEY-----\nMIIEpA..."


class TestSecretDetector:
    def test_aws_key(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="AWS Access Key"):
            detector.check(f"my key is {_AWS_KEY}")

    def test_openai_key(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="OpenAI API Key"):
            detector.check(f"key={_OPENAI_KEY}")

    def test_anthropic_key(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="Anthropic API Key"):
            detector.check(_ANTHROPIC_KEY)

    def test_github_token(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="GitHub Token"):
            detector.check(_GITHUB_TOKEN)

    def test_stripe_key(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="Stripe Key"):
            detector.check(_STRIPE_KEY)

    def test_bearer_token(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="Bearer Token"):
            detector.check(f"Authorization: {_BEARER_TOKEN}")

    def test_private_key(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="Private Key"):
            detector.check(_PRIVATE_KEY_HEADER)

    def test_password_assignment(self) -> None:
        detector = SecretDetector(enabled=True)
        with pytest.raises(SecretDetectedError, match="Password Assignment"):
            detector.check("password = 'my-super-secret-password123'")

    def test_clean_content_passes(self) -> None:
        detector = SecretDetector(enabled=True)
        detector.check("This is normal content about API design patterns")

    def test_disabled_allows_secrets(self) -> None:
        detector = SecretDetector(enabled=False)
        # Should not raise even with a secret
        detector.check(_AWS_KEY)

    def test_scan_returns_matches(self) -> None:
        detector = SecretDetector(enabled=True)
        content = f"key={_AWS_KEY} and {_ANTHROPIC_KEY}"
        matches = detector.scan(content)
        assert len(matches) == 2
        names = {m.pattern_name for m in matches}
        assert "AWS Access Key" in names
        assert "Anthropic API Key" in names

    def test_scan_returns_empty_for_clean(self) -> None:
        detector = SecretDetector(enabled=True)
        matches = detector.scan("No secrets here")
        assert matches == []

    def test_scan_disabled_returns_empty(self) -> None:
        detector = SecretDetector(enabled=False)
        matches = detector.scan(_AWS_KEY)
        assert matches == []

    def test_preview_truncated(self) -> None:
        detector = SecretDetector(enabled=True)
        matches = detector.scan(_AWS_KEY)
        assert len(matches) == 1
        assert len(matches[0].preview) <= 14  # 10 chars + "..."


class TestSecretDetectorIntegration:
    def test_remember_blocks_secret(
        self, isolated_data_dir: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import memcp.core.secrets as sec

        sec._detector = None
        monkeypatch.setenv("MEMCP_SECRET_DETECTION", "true")

        from memcp.core.memory import remember

        with pytest.raises(SecretDetectedError):
            remember(f"my key is {_AWS_KEY}")

    def test_remember_allows_when_disabled(
        self, isolated_data_dir: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import memcp.core.secrets as sec

        sec._detector = None
        monkeypatch.setenv("MEMCP_SECRET_DETECTION", "false")

        from memcp.core.memory import remember

        result = remember(f"my key is {_AWS_KEY}")
        assert result["id"]
