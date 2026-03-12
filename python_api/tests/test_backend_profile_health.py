from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api_server.config import Settings
from api_server.main import (
    _normalize_backend_profile_record,
    _probe_backend_profile_health,
)
from api_server.models import (
    BackendAuthStrategyModel,
    BackendCredentialRef,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
)


def create_settings() -> Settings:
    return Settings.model_validate(
        {
            "STT_STORAGE_BASE_DIR": tempfile.mkdtemp(),
            "BACKEND_ADMIN_ENABLED": True,
        }
    )


def create_profile(**overrides: object) -> BackendProfileRecord:
    payload = {
        "id": "summary-primary",
        "label": "Summary primary",
        "kind": "llm",
        "base_url": "https://summary.example.com",
        "transport": "http",
        "auth_strategy": BackendAuthStrategyModel(type="none"),
        "capabilities": ["artifact.summary"],
        "enabled": True,
        "metadata": {},
        "health": BackendHealthSnapshotModel(status="unknown"),
    }
    payload.update(overrides)
    return BackendProfileRecord.model_validate(payload)


class BackendProfileHealthProbeTest(unittest.TestCase):
    def test_marks_missing_credential_ref_as_misconfigured(self) -> None:
        settings = create_settings()
        profile = create_profile(
            auth_strategy=BackendAuthStrategyModel(type="bearer_secret_ref")
        )

        health = _probe_backend_profile_health(settings, profile)

        self.assertEqual(health.status, "misconfigured")
        self.assertIn("credential reference", health.message or "")
        self.assertTrue(health.checked_at)

    @patch("api_server.main.requests.head")
    def test_marks_successful_http_probe_as_healthy(self, mock_head: MagicMock) -> None:
        settings = create_settings()
        profile = create_profile(
            auth_strategy=BackendAuthStrategyModel(
                type="header_token",
                credential_ref=BackendCredentialRef(
                    kind="server_env",
                    id="SUMMARY_AUTH_TOKEN",
                ),
            )
        )
        with patch.dict("os.environ", {"SUMMARY_AUTH_TOKEN": "test-token"}):
            mock_head.return_value = MagicMock(status_code=200, reason="OK")
            health = _probe_backend_profile_health(settings, profile)

        self.assertEqual(health.status, "healthy")
        self.assertIn("HTTP 200", health.message or "")
        mock_head.assert_called_once()

    @patch("api_server.main.requests.head")
    def test_marks_http_401_probe_as_misconfigured(self, mock_head: MagicMock) -> None:
        settings = create_settings()
        profile = create_profile()
        mock_head.return_value = MagicMock(status_code=401, reason="Unauthorized")

        health = _probe_backend_profile_health(settings, profile)

        self.assertEqual(health.status, "misconfigured")
        self.assertIn("HTTP 401", health.message or "")

    def test_rejects_unsupported_provider_auth_contract_during_normalization(self) -> None:
        profile = create_profile(
            auth_strategy=BackendAuthStrategyModel(type="oauth_broker")
        )

        with self.assertRaisesRegex(
            ValueError, "currently support only `none`, `bearer_secret_ref`, or `header_token`"
        ):
            _normalize_backend_profile_record(profile)


if __name__ == "__main__":
    unittest.main()
