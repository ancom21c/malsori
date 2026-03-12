from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api_server.backend_bindings_store import (
    upsert_backend_profile,
    upsert_feature_binding,
)
from api_server.config import get_settings
from api_server.main import (
    _resolve_translate_binding_target,
    request_final_turn_translation,
)
from api_server.models import (
    BackendAuthStrategyModel,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
    FeatureBindingRecord,
    FinalTurnTranslationRequest,
)


def create_profile(**overrides: object) -> BackendProfileRecord:
    payload = {
        "id": "translate-primary",
        "label": "Translate primary",
        "kind": "translate",
        "base_url": "https://translate.example.com",
        "transport": "http",
        "auth_strategy": BackendAuthStrategyModel(type="none"),
        "capabilities": ["translate.turn_final"],
        "default_model": "gpt-4.1-mini",
        "enabled": True,
        "metadata": {},
        "health": BackendHealthSnapshotModel(status="healthy"),
    }
    payload.update(overrides)
    return BackendProfileRecord.model_validate(payload)


def create_request() -> FinalTurnTranslationRequest:
    return FinalTurnTranslationRequest.model_validate(
        {
            "session_id": "rt-1",
            "turn_id": "turn-1",
            "source_revision": "rev-1",
            "speaker_label": "Alice",
            "source_language": "ko",
            "target_language": "en",
            "start_ms": 0,
            "end_ms": 1300,
            "text": "다음 주 화요일에 출시합시다.",
        }
    )


class FinalTurnTranslationExecutionTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.original_storage_base_dir = os.environ.get("STT_STORAGE_BASE_DIR")
        os.environ["STT_STORAGE_BASE_DIR"] = self.tempdir.name
        get_settings.cache_clear()

    def tearDown(self) -> None:
        if self.original_storage_base_dir is None:
            os.environ.pop("STT_STORAGE_BASE_DIR", None)
        else:
            os.environ["STT_STORAGE_BASE_DIR"] = self.original_storage_base_dir
        get_settings.cache_clear()
        self.tempdir.cleanup()

    def test_resolves_healthy_fallback_profile_for_translate(self) -> None:
        settings = get_settings()
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(
                id="translate-primary",
                health=BackendHealthSnapshotModel(status="unreachable"),
            ),
        )
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(
                id="translate-fallback",
                label="Translate fallback",
                health=BackendHealthSnapshotModel(status="healthy"),
            ),
        )
        upsert_feature_binding(
            settings.storage_base_dir,
            FeatureBindingRecord(
                feature_key="translate.turn_final",
                primary_backend_profile_id="translate-primary",
                fallback_backend_profile_id="translate-fallback",
                enabled=True,
                model_override="gpt-4.1-mini",
            ),
        )

        binding, profile, used_fallback = _resolve_translate_binding_target(settings)

        self.assertEqual(binding.feature_key, "translate.turn_final")
        self.assertEqual(profile.id, "translate-fallback")
        self.assertTrue(used_fallback)

    @patch(
        "api_server.main._request_translate_provider_payload",
        new_callable=AsyncMock,
    )
    async def test_request_final_turn_translation_returns_translated_text(
        self, mock_request_provider: AsyncMock
    ) -> None:
        settings = get_settings()
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(),
        )
        upsert_feature_binding(
            settings.storage_base_dir,
            FeatureBindingRecord(
                feature_key="translate.turn_final",
                primary_backend_profile_id="translate-primary",
                enabled=True,
                model_override="gpt-4.1-mini",
                timeout_ms=20000,
            ),
        )
        mock_request_provider.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            "{\"translation\":\"Let's launch next Tuesday.\","
                            "\"source_language\":\"ko\",\"target_language\":\"en\"}"
                        )
                    }
                }
            ]
        }

        response = await request_final_turn_translation(create_request())

        self.assertEqual(response.session_id, "rt-1")
        self.assertEqual(response.turn_id, "turn-1")
        self.assertEqual(
            response.binding.resolved_backend_profile_id, "translate-primary"
        )
        self.assertEqual(response.binding.model, "gpt-4.1-mini")
        self.assertEqual(response.source_language, "ko")
        self.assertEqual(response.target_language, "en")
        self.assertEqual(response.text, "Let's launch next Tuesday.")
        mock_request_provider.assert_awaited_once()

    @patch(
        "api_server.main._request_translate_provider_payload",
        new_callable=AsyncMock,
    )
    async def test_request_final_turn_translation_retries_with_fallback_on_provider_failure(
        self, mock_request_provider: AsyncMock
    ) -> None:
        settings = get_settings()
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(id="translate-primary"),
        )
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(id="translate-fallback", label="Translate fallback"),
        )
        upsert_feature_binding(
            settings.storage_base_dir,
            FeatureBindingRecord(
                feature_key="translate.turn_final",
                primary_backend_profile_id="translate-primary",
                fallback_backend_profile_id="translate-fallback",
                enabled=True,
                model_override="gpt-4.1-mini",
            ),
        )
        mock_request_provider.side_effect = [
            HTTPException(
                status_code=502,
                detail={
                    "error": {
                        "code": "TRANSLATE_PROVIDER_REQUEST_FAILED",
                        "message": "primary failed",
                    }
                },
            ),
            {
                "choices": [
                    {
                        "message": {
                            "content": (
                                "{\"translation\":\"Fallback translation.\","
                                "\"source_language\":\"ko\",\"target_language\":\"en\"}"
                            )
                        }
                    }
                ]
            },
        ]

        response = await request_final_turn_translation(create_request())

        self.assertEqual(response.binding.resolved_backend_profile_id, "translate-fallback")
        self.assertTrue(response.binding.used_fallback)
        self.assertEqual(response.text, "Fallback translation.")
        self.assertEqual(mock_request_provider.await_count, 2)


if __name__ == "__main__":
    unittest.main()
