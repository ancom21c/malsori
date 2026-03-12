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
from api_server.main import _resolve_summary_binding_target, request_full_summary
from api_server.models import (
    BackendAuthStrategyModel,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
    FeatureBindingRecord,
    FullSummaryRequest,
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
        "default_model": "gpt-5-mini",
        "enabled": True,
        "metadata": {},
        "health": BackendHealthSnapshotModel(status="healthy"),
    }
    payload.update(overrides)
    return BackendProfileRecord.model_validate(payload)


def create_request() -> FullSummaryRequest:
    return FullSummaryRequest.model_validate(
        {
            "session_id": "tx-1",
            "title": "Launch review",
            "source_revision": "rev-1",
            "selection_source": "auto",
            "trigger": "session_ready",
            "preset": {
                "id": "meeting",
                "version": "2026-03-11",
                "label": "Meeting",
                "description": "Highlights overview, decisions, owners, and open questions.",
                "language": "auto",
                "output_schema": [
                    {
                        "id": "overview",
                        "label": "Overview",
                        "kind": "narrative",
                        "required": True,
                    },
                    {
                        "id": "decisions",
                        "label": "Decisions",
                        "kind": "bullet_list",
                        "required": True,
                    },
                ],
            },
            "turns": [
                {
                    "id": "turn-1",
                    "speaker_label": "Alice",
                    "language": "ko",
                    "start_ms": 0,
                    "end_ms": 1200,
                    "text": "Let's confirm the launch checklist today.",
                },
                {
                    "id": "turn-2",
                    "speaker_label": "Bob",
                    "language": "ko",
                    "start_ms": 1200,
                    "end_ms": 2400,
                    "text": "We can launch next Tuesday.",
                },
            ],
        }
    )


class FullSummaryExecutionTest(unittest.IsolatedAsyncioTestCase):
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

    def test_resolves_healthy_fallback_profile_for_summary(self) -> None:
        settings = get_settings()
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(
                id="summary-primary",
                health=BackendHealthSnapshotModel(status="unreachable"),
            ),
        )
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(
                id="summary-fallback",
                label="Summary fallback",
                health=BackendHealthSnapshotModel(status="healthy"),
            ),
        )
        upsert_feature_binding(
            settings.storage_base_dir,
            FeatureBindingRecord(
                feature_key="artifact.summary",
                primary_backend_profile_id="summary-primary",
                fallback_backend_profile_id="summary-fallback",
                enabled=True,
                model_override="gpt-5-mini",
            ),
        )

        binding, profile, used_fallback = _resolve_summary_binding_target(settings)

        self.assertEqual(binding.feature_key, "artifact.summary")
        self.assertEqual(profile.id, "summary-fallback")
        self.assertTrue(used_fallback)

    @patch(
        "api_server.main._request_summary_provider_payload",
        new_callable=AsyncMock,
    )
    async def test_request_full_summary_returns_structured_blocks(
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
                feature_key="artifact.summary",
                primary_backend_profile_id="summary-primary",
                enabled=True,
                model_override="gpt-5-mini",
                timeout_ms=30000,
            ),
        )
        mock_request_provider.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"title":"Meeting summary","blocks":['
                            '{"id":"overview","content":"Launch checklist confirmed.","source_turn_ids":["turn-1"]},'
                            '{"id":"decisions","items":["Launch next Tuesday."],"source_turn_ids":["turn-2"]}'
                            "]}"
                        )
                    }
                }
            ]
        }

        response = await request_full_summary(create_request())

        self.assertEqual(response.session_id, "tx-1")
        self.assertEqual(response.binding.resolved_backend_profile_id, "summary-primary")
        self.assertEqual(response.binding.model, "gpt-5-mini")
        self.assertEqual(response.source_language, "ko")
        self.assertEqual(response.output_language, "ko")
        self.assertEqual(response.blocks[0].id, "overview")
        self.assertEqual(
            response.blocks[0].supporting_snippets[0].turn_id, "turn-1"
        )
        self.assertIn("Launch next Tuesday.", response.blocks[1].content)
        self.assertEqual(response.supporting_snippets[0].speaker_label, "Alice")
        mock_request_provider.assert_awaited_once()

    @patch(
        "api_server.main._request_summary_provider_payload",
        new_callable=AsyncMock,
    )
    async def test_request_full_summary_retries_with_fallback_on_provider_failure(
        self, mock_request_provider: AsyncMock
    ) -> None:
        settings = get_settings()
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(id="summary-primary"),
        )
        upsert_backend_profile(
            settings.storage_base_dir,
            create_profile(id="summary-fallback", label="Summary fallback"),
        )
        upsert_feature_binding(
            settings.storage_base_dir,
            FeatureBindingRecord(
                feature_key="artifact.summary",
                primary_backend_profile_id="summary-primary",
                fallback_backend_profile_id="summary-fallback",
                enabled=True,
                model_override="gpt-5-mini",
            ),
        )
        mock_request_provider.side_effect = [
            HTTPException(
                status_code=502,
                detail={
                    "error": {
                        "code": "SUMMARY_PROVIDER_REQUEST_FAILED",
                        "message": "primary failed",
                    }
                },
            ),
            {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"title":"Fallback summary","blocks":['
                                '{"id":"overview","content":"Fallback content.","source_turn_ids":["turn-1"]}'
                                "]}"
                            )
                        }
                    }
                ]
            },
        ]

        response = await request_full_summary(create_request())

        self.assertEqual(response.binding.resolved_backend_profile_id, "summary-fallback")
        self.assertTrue(response.binding.used_fallback)
        self.assertEqual(mock_request_provider.await_count, 2)


if __name__ == "__main__":
    unittest.main()
