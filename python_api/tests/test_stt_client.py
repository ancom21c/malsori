import asyncio
import json
from pathlib import Path
from typing import Any

from api_server.config import Settings
from api_server.stt_client import (
    CloudApiAdapter,
    RTZRClient,
    _ManualTokenAsyncRtzr,
    _normalize_grpc_metadata,
    _resolve_cloud_sdk_target,
)


class FakeResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, Any]:
        return dict(self._payload)

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeAsyncClient:
    def __init__(
        self,
        payload: dict[str, Any],
        *,
        auth_payload: dict[str, Any] | None = None,
        get_payload: dict[str, Any] | None = None,
    ):
        self.payload = payload
        self.auth_payload = auth_payload or {
            "access_token": "minted-token",
            "expire_at": 4102444800,
        }
        self.get_payload = get_payload or payload
        self.calls: list[tuple[str, str, dict[str, Any]]] = []

    async def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append(("post", url, kwargs))
        if url.endswith("/v1/authenticate"):
            return FakeResponse(self.auth_payload)
        return FakeResponse(self.payload)

    async def get(self, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append(("get", url, kwargs))
        return FakeResponse(self.get_payload)

    async def aclose(self) -> None:
        return None


def make_settings(
    tmp_path: Path,
    *,
    api_base: str = "https://openapi.vito.ai",
    deployment: str = "cloud",
) -> Settings:
    return Settings(
        storage_base_dir=tmp_path,
        pronaia_api_base=api_base,
        deployment=deployment,
    )


def test_resolve_cloud_sdk_target_prefers_internal_for_dev_and_sandbox() -> None:
    public_target = _resolve_cloud_sdk_target("https://openapi.vito.ai")
    assert public_target.package == "public"
    assert public_target.phase is None

    dev_target = _resolve_cloud_sdk_target("https://dev-openapi.vito.ai")
    assert dev_target.package == "internal"
    assert dev_target.phase == "dev"

    sandbox_target = _resolve_cloud_sdk_target("https://sandbox-openapi.vito.ai")
    assert sandbox_target.package == "internal"
    assert sandbox_target.phase == "sandbox"


def test_manual_token_sdk_headers_are_supported() -> None:
    sdk = _ManualTokenAsyncRtzr(
        client_id=None,
        client_secret=None,
        manual_token="sdk-token",
        api_base="https://openapi.vito.ai",
    )
    try:
        headers = asyncio.run(sdk._build_auth_headers())
    finally:
        asyncio.run(sdk.aclose())

    assert headers == {"Authorization": "bearer sdk-token"}


def test_internal_adapter_normalizes_internal_flags(tmp_path: Path) -> None:
    adapter = CloudApiAdapter(
        make_settings(tmp_path, api_base="https://dev-openapi.vito.ai")
    )
    try:
        normalized = adapter._normalize_batch_config(
            {
                "language": "ko",
                "debug": "1",
            }
        )
    finally:
        asyncio.run(adapter.aclose())

    assert normalized["language"] == "ko"
    assert normalized["debug"] is True


def test_grpc_metadata_values_are_ascii_safe() -> None:
    metadata = _normalize_grpc_metadata(
        {
            "filename": "한국어 음성.wav",
            "file_size": 123,
            "simulation": True,
            "bad\nkey": "line\nbreak",
            "payload-bin": "not-bytes",
            "empty": None,
        }
    )

    assert metadata["filename"] == "%ED%95%9C%EA%B5%AD%EC%96%B4%20%EC%9D%8C%EC%84%B1.wav"
    assert metadata["file_size"] == "123"
    assert metadata["simulation"] == "true"
    assert metadata["bad-key"] == "line break"
    assert "payload-bin" not in metadata
    assert "empty" not in metadata
    assert all(
        0x20 <= ord(char) <= 0x7E
        for value in metadata.values()
        for char in value
    )


def test_cloud_submit_transcription_posts_via_sdk_session(tmp_path: Path) -> None:
    client = RTZRClient(make_settings(tmp_path))
    assert client._cloud_api is not None

    replacement_session = client._cloud_api._sdk._sess
    fake_session = FakeAsyncClient({"id": "job-123"})
    client._cloud_api._sdk._sess = fake_session

    async def fake_build_auth_headers() -> dict[str, str]:
        return {"Authorization": "bearer test-token"}

    client._cloud_api._sdk._build_auth_headers = fake_build_auth_headers  # type: ignore[method-assign]
    asyncio.run(replacement_session.aclose())
    try:
        payload = asyncio.run(
            client.submit_transcription(
                b"audio-bytes",
                {"language": "ko"},
                "hello",
            )
        )
    finally:
        asyncio.run(client.aclose())

    assert payload["transcribe_id"] == "job-123"
    assert len(fake_session.calls) == 1
    method, url, kwargs = fake_session.calls[0]
    assert method == "post"
    assert url == "https://openapi.vito.ai/v1/transcribe"
    assert kwargs["data"]["title"] == "hello"
    config_payload = json.loads(kwargs["data"]["config"])
    assert config_payload["language"] == "ko"


def test_cloud_streaming_url_uses_sdk_websocket_base(tmp_path: Path) -> None:
    client = RTZRClient(
        make_settings(tmp_path, api_base="https://sandbox-openapi.vito.ai")
    )
    try:
        url = client.get_streaming_url(
            {
                "sample_rate": 8000,
                "stream_config": {
                    "epd_time": 0.8,
                    "max_utter_duration": 12,
                },
            }
        )
    finally:
        asyncio.run(client.aclose())

    assert url.startswith("wss://sandbox-openapi.vito.ai/v1/transcribe:streaming?")
    assert "sample_rate=8000" in url
    assert "epd_time=0.8" in url
    assert "max_utter_duration=12" in url


def test_cloud_adapter_bootstraps_without_installed_sdk_packages(tmp_path: Path) -> None:
    settings = Settings(
        storage_base_dir=tmp_path,
        pronaia_api_base="https://openapi.vito.ai",
        deployment="cloud",
        pronaia_access_token="manual-token",
    )
    adapter = CloudApiAdapter(settings)
    try:
        headers = asyncio.run(adapter.build_auth_headers())
        websocket_base = adapter.websocket_base
    finally:
        asyncio.run(adapter.aclose())

    assert headers == {"Authorization": "bearer manual-token"}
    assert websocket_base == "wss://openapi.vito.ai"


def test_cloud_fallback_mints_and_reuses_auth_token_for_submit_and_status(
    tmp_path: Path,
) -> None:
    settings = Settings(
        storage_base_dir=tmp_path,
        pronaia_api_base="https://openapi.vito.ai",
        deployment="cloud",
        pronaia_client_id="client-id",
        pronaia_client_secret="client-secret",
    )
    client = RTZRClient(settings)
    assert client._cloud_api is not None

    replacement_session = client._cloud_api._sdk._sess
    fake_session = FakeAsyncClient(
        {"id": "job-123"},
        get_payload={"id": "job-123", "status": "completed"},
    )
    client._cloud_api._sdk._sess = fake_session
    asyncio.run(replacement_session.aclose())
    try:
        submit_payload = asyncio.run(client.submit_transcription(b"audio-bytes"))
        status_payload = asyncio.run(client.get_transcription("job-123"))
        headers = asyncio.run(client._cloud_api.build_auth_headers())
    finally:
        asyncio.run(client.aclose())

    assert submit_payload["transcribe_id"] == "job-123"
    assert status_payload["status"] == "completed"
    assert headers == {"Authorization": "bearer minted-token"}

    auth_calls = [call for call in fake_session.calls if call[1].endswith("/v1/authenticate")]
    assert len(auth_calls) == 1

    submit_call = next(
        call for call in fake_session.calls if call[1] == "https://openapi.vito.ai/v1/transcribe"
    )
    assert submit_call[0] == "post"
    assert submit_call[2]["headers"]["Authorization"] == "bearer minted-token"

    status_call = next(
        call
        for call in fake_session.calls
        if call[1] == "https://openapi.vito.ai/v1/transcribe/job-123"
    )
    assert status_call[0] == "get"
    assert status_call[2]["headers"]["Authorization"] == "bearer minted-token"
