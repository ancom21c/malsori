import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.dependencies import utils as fastapi_dependency_utils

fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None

from api_server import main


class FakeTranscribeClient:
    def __init__(self, delay: float = 0.01):
        self.delay = delay
        self.running = 0
        self.max_running = 0

    async def submit_transcription(
        self,
        audio_bytes: bytes,
        config: dict[str, Any],
        title: str | None = None,
    ) -> dict[str, Any]:
        self.running += 1
        self.max_running = max(self.max_running, self.running)
        try:
            await asyncio.sleep(self.delay)
            return {
                "transcribe_id": title or "job",
                "size": len(audio_bytes),
                "config": config,
            }
        finally:
            self.running -= 1


def reset_queue_state() -> None:
    main._transcribe_queue_semaphore = None
    main._transcribe_queue_concurrency = None


def make_settings(
    *,
    concurrency: int = 1,
    timeout_seconds: float = 1.0,
) -> SimpleNamespace:
    return SimpleNamespace(
        transcribe_queue_concurrency=concurrency,
        transcribe_queue_timeout_seconds=timeout_seconds,
    )


class FakeUploadFile:
    filename = "sample.wav"
    content_type = "audio/wav"

    async def read(self) -> bytes:
        return b"audio"


def test_transcribe_queue_limits_concurrent_upstream_submissions() -> None:
    reset_queue_state()
    client = FakeTranscribeClient()
    settings = make_settings(concurrency=1)

    async def run() -> list[dict[str, Any]]:
        return await asyncio.gather(
            main._submit_transcription_queued(client, settings, b"a", {}, "job-a"),
            main._submit_transcription_queued(client, settings, b"b", {}, "job-b"),
        )

    results = asyncio.run(run())

    assert {result["transcribe_id"] for result in results} == {"job-a", "job-b"}
    assert client.max_running == 1


def test_transcribe_queue_timeout_returns_api_error() -> None:
    reset_queue_state()
    client = FakeTranscribeClient()
    settings = make_settings(concurrency=1, timeout_seconds=0.001)

    async def run() -> None:
        semaphore = main._get_transcribe_queue_semaphore(settings)
        await semaphore.acquire()
        try:
            await main._submit_transcription_queued(client, settings, b"a", {}, "job-a")
        finally:
            semaphore.release()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(run())

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["error"]["code"] == "TRANSCRIBE_QUEUE_TIMEOUT"


def test_proxy_transcribe_preserves_queue_timeout_api_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    reset_queue_state()
    client = FakeTranscribeClient()
    settings = make_settings(concurrency=1, timeout_seconds=0.001)
    monkeypatch.setattr(main, "_ensure_settings", lambda: settings)
    monkeypatch.setattr(main, "_get_client", lambda _settings: client)

    async def run() -> None:
        semaphore = main._get_transcribe_queue_semaphore(settings)
        await semaphore.acquire()
        try:
            await main.proxy_transcribe(FakeUploadFile(), "{}", "job-a")
        finally:
            semaphore.release()

    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(run())
    finally:
        reset_queue_state()

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["error"]["code"] == "TRANSCRIBE_QUEUE_TIMEOUT"
