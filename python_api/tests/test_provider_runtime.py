from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import httpx
import pytest

from api_server.models import (
    BackendAuthStrategyModel,
    BackendCredentialRef,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
    FeatureBindingRecord,
    FeatureBindingRetryPolicyModel,
)
from api_server.provider_runtime import (
    ProviderRuntimeError,
    ProviderRuntimeSpec,
    backend_profile_is_ready_for_feature,
    build_provider_auth_headers,
    provider_runtime_profile_readiness_error,
    request_chat_provider_payload,
)


SUMMARY_SPEC = ProviderRuntimeSpec(
    provider_name="summary",
    provider_title="Summary",
    error_prefix="SUMMARY_PROVIDER",
    default_timeout_ms=30000,
)


def create_profile(**overrides: object) -> BackendProfileRecord:
    payload = {
        "id": "provider-primary",
        "label": "Provider primary",
        "kind": "llm",
        "base_url": "https://provider.example.com",
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


def create_binding(**overrides: object) -> FeatureBindingRecord:
    payload = {
        "feature_key": "artifact.summary",
        "primary_backend_profile_id": "provider-primary",
        "enabled": True,
        "model_override": "gpt-5-mini",
    }
    payload.update(overrides)
    return FeatureBindingRecord.model_validate(payload)


def test_build_provider_auth_headers_uses_operator_header_token() -> None:
    settings = SimpleNamespace(backend_admin_token="operator-secret")
    profile = create_profile(
        auth_strategy=BackendAuthStrategyModel(
            type="header_token",
            credential_ref=BackendCredentialRef(
                kind="operator_token",
                id="backend-admin-token",
            ),
        ),
        metadata={
            "auth_header_name": "X-Provider-Token",
            "auth_header_prefix": "Token",
        },
    )

    headers = build_provider_auth_headers(settings, profile, spec=SUMMARY_SPEC)

    assert headers == {"X-Provider-Token": "Token operator-secret"}


def test_provider_readiness_reports_missing_server_env_credential(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("MISSING_PROVIDER_TOKEN", raising=False)
    settings = SimpleNamespace(backend_admin_token=None)
    profile = create_profile(
        auth_strategy=BackendAuthStrategyModel(
            type="bearer_secret_ref",
            credential_ref=BackendCredentialRef(
                kind="server_env",
                id="MISSING_PROVIDER_TOKEN",
            ),
        )
    )

    readiness_error = provider_runtime_profile_readiness_error(settings, profile)

    assert readiness_error == (
        "Server environment credential `MISSING_PROVIDER_TOKEN` is missing, "
        "so runtime cannot use this backend."
    )
    assert (
        backend_profile_is_ready_for_feature(
            settings,
            profile,
            {"artifact.summary"},
        )
        is False
    )


class FakeAsyncClient:
    def __init__(
        self,
        responses: list[httpx.Response],
        calls: list[dict[str, Any]],
        init_kwargs: dict[str, Any],
    ) -> None:
        self._responses = responses
        self._calls = calls
        self._init_kwargs = init_kwargs

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        self._calls.append(
            {"url": url, "init_kwargs": self._init_kwargs, **kwargs}
        )
        return self._responses.pop(0)


def test_request_chat_provider_payload_retries_transient_response() -> None:
    responses = [
        httpx.Response(500, text="temporary outage"),
        httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}]}),
    ]
    calls: list[dict[str, Any]] = []
    sleeps: list[float] = []

    def client_factory(**kwargs: Any) -> FakeAsyncClient:
        return FakeAsyncClient(responses, calls, kwargs)

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    payload = asyncio.run(
        request_chat_provider_payload(
            settings=SimpleNamespace(verify_ssl=False, backend_admin_token=None),
            profile=create_profile(metadata={"chat_path": "v1/chat"}),
            binding=create_binding(
                retry_policy=FeatureBindingRetryPolicyModel(
                    max_attempts=2,
                    backoff_ms=25,
                )
            ),
            model="gpt-5-mini",
            messages=[{"role": "user", "content": "summarize"}],
            spec=SUMMARY_SPEC,
            client_factory=client_factory,
            sleep=fake_sleep,
        )
    )

    assert payload == {"choices": [{"message": {"content": "{}"}}]}
    assert sleeps == [0.025]
    assert [call["url"] for call in calls] == [
        "https://provider.example.com/v1/chat",
        "https://provider.example.com/v1/chat",
    ]
    assert calls[0]["init_kwargs"]["verify"] is False
    assert calls[0]["timeout"] == 30.0
    assert calls[0]["json"] == {
        "model": "gpt-5-mini",
        "messages": [{"role": "user", "content": "summarize"}],
        "temperature": 0.2,
    }


def test_request_chat_provider_payload_maps_non_json_success_response() -> None:
    responses = [httpx.Response(200, text="not json")]
    calls: list[dict[str, Any]] = []

    def client_factory(**kwargs: Any) -> FakeAsyncClient:
        return FakeAsyncClient(responses, calls, kwargs)

    with pytest.raises(ProviderRuntimeError) as exc_info:
        asyncio.run(
            request_chat_provider_payload(
                settings=SimpleNamespace(verify_ssl=True, backend_admin_token=None),
                profile=create_profile(),
                binding=create_binding(),
                model="gpt-5-mini",
                messages=[],
                spec=SUMMARY_SPEC,
                client_factory=client_factory,
            )
        )

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "SUMMARY_PROVIDER_RESPONSE_INVALID"
    assert exc_info.value.message == (
        "The summary provider returned a non-JSON response."
    )
