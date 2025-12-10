"""FastAPI application exposing a synchronous wrapper over the RTZR STT API."""

from __future__ import annotations

import base64
import binascii
import asyncio
import contextlib
import json
import logging
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Literal, Optional

from copy import deepcopy

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
import requests
from websockets.exceptions import (
    ConnectionClosedError,
    ConnectionClosedOK,
)
from google.protobuf import json_format

from .config import (
    Settings,
    apply_backend_override,
    clear_backend_override,
    get_backend_override,
    get_settings,
)
from .models import (
    BackendEndpointState,
    BackendEndpointUpdateRequest,
    STTRequest,
    STTResponse,
    STTReturnObject,
)
from .stt_client import RTZRClient
from .protos import vito_stt_client_pb2 as stt_pb2


def _env_flag(name: str) -> bool:
    value = os.environ.get(name)
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_log_level(value: str) -> Optional[int]:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    try:
        return int(normalized)
    except ValueError:
        pass
    level = getattr(logging, normalized.upper(), None)
    return level if isinstance(level, int) else None


def _cli_log_level() -> Optional[int]:
    argv = sys.argv[1:]
    for index, token in enumerate(argv):
        if token in {"--debug", "-d"}:
            return logging.DEBUG
        if token.startswith("--log-level="):
            _, value = token.split("=", 1)
            parsed = _parse_log_level(value)
            if parsed is not None:
                return parsed
        if token == "--log-level" and index + 1 < len(argv):
            parsed = _parse_log_level(argv[index + 1])
            if parsed is not None:
                return parsed
    return None


def _determine_log_level() -> int:
    cli_level = _cli_log_level()
    if cli_level is not None:
        return cli_level
    for env_name in ("MALSORI_LOG_LEVEL", "LOG_LEVEL"):
        candidate = os.environ.get(env_name)
        if candidate:
            parsed = _parse_log_level(candidate)
            if parsed is not None:
                return parsed
    if _env_flag("MALSORI_DEBUG") or _env_flag("DEBUG"):
        return logging.DEBUG
    return logging.INFO


logging.basicConfig(
    level=_determine_log_level(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def _log_json_debug(context: str, payload: Any) -> None:
    if not logger.isEnabledFor(logging.DEBUG):
        return
    try:
        serialized = json.dumps(payload, ensure_ascii=False)
    except (TypeError, ValueError):
        serialized = repr(payload)
    logger.debug("%s: %s", context, serialized)


def _log_streaming_message(direction: str, message: Any) -> None:
    if not logger.isEnabledFor(logging.DEBUG):
        return
    if isinstance(message, (bytes, bytearray)):
        logger.debug(
            "Streaming %s binary chunk (%d bytes)", direction, len(message)
        )
        return
    try:
        payload = json.loads(str(message))
    except (TypeError, ValueError):
        logger.debug("Streaming %s text: %s", direction, message)
        return

    recognized = None
    alternatives = payload.get("alternatives")
    if isinstance(alternatives, list) and alternatives:
        first = alternatives[0]
        if isinstance(first, dict):
            recognized = first.get("text")

    logger.debug(
        "Streaming %s payload final=%s stable=%s text=%s payload=%s",
        direction,
        payload.get("final"),
        payload.get("stable"),
        recognized,
        payload,
    )


class _SuppressDocsAccessFilter(logging.Filter):
    """Filter out access logs for documentation endpoints used by health probes."""

    _SUPPRESSED_FRAGMENTS = ("/docs", "/openapi.json", "/redoc")

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(fragment in message for fragment in self._SUPPRESSED_FRAGMENTS)


logging.getLogger("uvicorn.access").addFilter(_SuppressDocsAccessFilter())


app = FastAPI(title="RTZR STT Delegation API", version="0.1.0")

_client: Optional[RTZRClient] = None
_client_lock = Lock()

_config_cache: Optional[Dict[str, Any]] = None
_config_cache_path: Optional[Path] = None
_config_lock = Lock()

SUCCESS_CODE = 0
FAILURE_CODE = -1
_FILE_TRANSCRIBE_DIRNAME = "file_transcriptions"


@app.get("/v1/backend/endpoint", response_model=BackendEndpointState)
async def get_backend_endpoint() -> BackendEndpointState:
    """Return the current upstream endpoint configuration."""
    try:
        settings = get_settings()
        override_payload = get_backend_override()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    source: Literal["default", "override"] = (
        "override" if override_payload else "default"
    )
    return _build_backend_state(settings, source)


@app.post("/v1/backend/endpoint", response_model=BackendEndpointState)
async def set_backend_endpoint(
    payload: BackendEndpointUpdateRequest,
) -> BackendEndpointState:
    """Persist a new upstream endpoint configuration."""
    base_url = payload.api_base_url.strip()
    if not base_url:
        raise HTTPException(status_code=400, detail="api_base_url is required.")
    updates: Dict[str, Any] = {
        "pronaia_api_base": base_url,
        "deployment": payload.deployment,
        "verify_ssl": payload.verify_ssl,
    }
    if payload.client_id is not None:
        client_id = payload.client_id.strip()
        updates["pronaia_client_id"] = client_id or None
    if payload.client_secret is not None:
        client_secret = payload.client_secret.strip()
        updates["pronaia_client_secret"] = client_secret or None
    try:
        settings = apply_backend_override(updates)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    _reset_client()
    try:
        override_payload = get_backend_override()
    except RuntimeError as exc:  # pragma: no cover - defensive
        logger.warning("Failed to read override payload after update: %s", exc)
        override_payload = updates
    source: Literal["default", "override"] = (
        "override" if override_payload else "default"
    )
    return _build_backend_state(settings, source)


@app.delete("/v1/backend/endpoint", response_model=BackendEndpointState)
async def reset_backend_endpoint() -> BackendEndpointState:
    """Remove the override file and revert to server defaults."""
    try:
        settings = clear_backend_override()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    _reset_client()
    return _build_backend_state(settings, "default")


def _get_client(settings: Settings) -> RTZRClient:
    """Singleton accessor for the RTZR client."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                logger.info("Initializing RTZR REST client.")
                _client = RTZRClient(settings)
    return _client


def _reset_client() -> None:
    """Reset the cached RTZR client to apply new settings."""
    global _client
    with _client_lock:
        _client = None


def _build_backend_state(
    settings: Settings, source: Literal["default", "override"]
) -> BackendEndpointState:
    """Create a response payload describing the current upstream endpoint."""
    return BackendEndpointState(
        deployment=settings.deployment,
        api_base_url=settings.pronaia_api_base,
        transcribe_path=settings.transcribe_path,
        streaming_path=settings.streaming_path,
        auth_enabled=settings.auth_enabled,
        has_client_id=bool(settings.pronaia_client_id),
        has_client_secret=bool(settings.pronaia_client_secret),
        verify_ssl=settings.verify_ssl,
        source=source,
    )


def _append_text_candidate(texts: List[str], candidate: Any) -> None:
    """Normalize a text candidate and append when non-empty."""
    if not isinstance(candidate, str):
        return
    stripped = candidate.strip()
    if stripped:
        texts.append(stripped)


def _collect_from_result_entry(texts: List[str], entry: Any) -> None:
    """Extract recognized text fragments from diverse result shapes."""
    if isinstance(entry, list):
        for item in entry:
            _collect_from_result_entry(texts, item)
        return

    if not isinstance(entry, dict):
        return

    # Common RTZR batch result shape.
    _append_text_candidate(texts, entry.get("msg"))
    _append_text_candidate(texts, entry.get("text"))

    # StreamingRecognitionResult-style payloads include alternatives[].
    alternatives = entry.get("alternatives")
    if isinstance(alternatives, list):
        for alternative in alternatives:
            if isinstance(alternative, dict):
                _append_text_candidate(texts, alternative.get("text"))

    # Nested utterances field (batch responses).
    utterances = entry.get("utterances")
    if isinstance(utterances, list):
        for utterance in utterances:
            _collect_from_result_entry(texts, utterance)

    # Some responses embed results recursively.
    nested_results = entry.get("results")
    if nested_results is not None:
        _collect_from_result_entry(texts, nested_results)


def _collect_text_candidates(result: Dict[str, Any]) -> List[str]:
    """Aggregate textual fragments from the upstream response."""
    texts: List[str] = []
    _collect_from_result_entry(texts, result.get("results"))
    if not texts:
        _collect_from_result_entry(texts, result)
    return texts


def _coerce_millis(value: Any) -> Optional[int]:
    """Best-effort conversion of timestamps to integers in milliseconds."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _extract_segments_from_entry(
    segments: List[Dict[str, Any]], entry: Any
) -> None:
    """Populate normalized segments from upstream response fragments."""
    if isinstance(entry, list):
        for item in entry:
            _extract_segments_from_entry(segments, item)
        return

    if not isinstance(entry, dict):
        return

    nested_candidates = [
        entry.get("utterances"),
        entry.get("results"),
    ]

    text = entry.get("msg") or entry.get("text")
    if not text:
        alternatives = entry.get("alternatives")
        if isinstance(alternatives, list):
            for alternative in alternatives:
                if isinstance(alternative, dict):
                    alt_text = alternative.get("text")
                    if alt_text:
                        text = alt_text
                        break

    start_ms = (
        _coerce_millis(entry.get("start_at"))
        or _coerce_millis(entry.get("start_ms"))
        or _coerce_millis(entry.get("start"))
    )
    end_ms = (
        _coerce_millis(entry.get("end_at"))
        or _coerce_millis(entry.get("end_ms"))
        or _coerce_millis(entry.get("end"))
    )
    duration_ms = _coerce_millis(entry.get("duration"))
    if end_ms is None and start_ms is not None and duration_ms is not None:
        end_ms = start_ms + duration_ms

    if text:
        segments.append(
            {
                "speaker": (
                    entry.get("spk")
                    or entry.get("speaker")
                    or entry.get("speaker_label")
                ),
                "startMs": start_ms or 0,
                "endMs": end_ms or (start_ms or 0),
                "text": text.strip(),
            }
        )

    for candidate in nested_candidates:
        if candidate is not None:
            _extract_segments_from_entry(segments, candidate)


def _extract_segments(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Normalize upstream payload segments for frontend consumption."""
    segments: List[Dict[str, Any]] = []
    _extract_segments_from_entry(segments, result.get("results"))
    if not segments:
        _extract_segments_from_entry(segments, result)
    return segments


def _file_transcription_dir(settings: Settings) -> Path:
    target = settings.storage_base_dir / _FILE_TRANSCRIBE_DIRNAME
    target.mkdir(parents=True, exist_ok=True)
    return target


def _audio_artifacts(settings: Settings, transcribe_id: str) -> Dict[str, Path]:
    base_dir = _file_transcription_dir(settings)
    data_path = base_dir / f"{transcribe_id}.bin"
    meta_path = base_dir / f"{transcribe_id}.json"
    return {"data": data_path, "meta": meta_path}


def _persist_uploaded_audio(
    settings: Settings, transcribe_id: str, upload: UploadFile, data: bytes
) -> Optional[Path]:
    if not data:
        return None
    artifacts = _audio_artifacts(settings, transcribe_id)
    try:
        artifacts["data"].write_bytes(data)
        metadata = {
            "content_type": (upload.content_type or "application/octet-stream"),
            "original_filename": upload.filename or f"{transcribe_id}.wav",
        }
        artifacts["meta"].write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
    except OSError as exc:  # pragma: no cover - storage failure
        logger.error("Failed to persist uploaded audio for %s: %s", transcribe_id, exc)
        return None
    return artifacts["data"]


def _load_audio_metadata(meta_path: Path) -> Dict[str, str]:
    default = {
        "content_type": "application/octet-stream",
        "original_filename": meta_path.stem or "audio.wav",
    }
    if not meta_path.exists():
        return default
    try:
        payload = json.loads(meta_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return default
        return {
            "content_type": str(payload.get("content_type") or default["content_type"]),
            "original_filename": str(
                payload.get("original_filename") or f"{meta_path.stem}.wav"
            ),
        }
    except (OSError, json.JSONDecodeError):
        return default


def _build_audio_url(transcribe_id: str) -> str:
    return f"/v1/transcribe/{transcribe_id}/audio"


def _available_audio_url(settings: Settings, transcribe_id: str) -> Optional[str]:
    artifacts = _audio_artifacts(settings, transcribe_id)
    if artifacts["data"].exists():
        return _build_audio_url(transcribe_id)
    return None


def _build_failure_response(message: str) -> STTResponse:
    """Construct a standardized failure response."""
    logger.error("Delegation API failure: %s", message)
    return STTResponse(
        result=FAILURE_CODE, return_object=STTReturnObject(recognized=message)
    )


async def _poll_until_complete(
    client: RTZRClient, transcribe_id: str, settings: Settings
) -> Optional[Dict[str, Any]]:
    """Poll the RTZR API until completion, failure, or timeout."""
    deadline = asyncio.get_running_loop().time() + settings.poll_timeout_seconds

    while True:
        result: Dict[str, Any] = await client.get_transcription(transcribe_id)
        status = result.get("status")
        if status in {"completed", "failed"}:
            return result
        if asyncio.get_running_loop().time() > deadline:
            return None
        await asyncio.sleep(settings.poll_interval_seconds)


def _write_json_dump(target: Path, data: Dict[str, Any]) -> None:
    """Persist JSON response data."""
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _ensure_storage_dirs(base_dir: Path, timestamp: datetime) -> Dict[str, Path]:
    """Prepare dated storage directories for audio and transcription logs."""
    date_path = timestamp.strftime("%Y/%m/%d")
    audio_dir = base_dir / date_path / "audio_raw"
    transcript_dir = base_dir / date_path / "txt_stt"
    audio_dir.mkdir(parents=True, exist_ok=True)
    transcript_dir.mkdir(parents=True, exist_ok=True)
    return {"audio": audio_dir, "transcript": transcript_dir}


def _get_base_config(settings: Settings) -> Dict[str, Any]:
    """Load and cache the STT configuration if a JSON file is provided."""
    if not settings.has_stt_config:
        return {}

    global _config_cache, _config_cache_path
    assert settings.stt_config_path is not None
    config_path = settings.stt_config_path

    if _config_cache is None or _config_cache_path != config_path:
        with _config_lock:
            if _config_cache is None or _config_cache_path != config_path:
                try:
                    with config_path.open("r", encoding="utf-8") as fp:
                        data = json.load(fp)
                except FileNotFoundError as exc:  # pragma: no cover - defensive guard
                    raise RuntimeError(
                        f"STT config file not found: {config_path}"
                    ) from exc
                except json.JSONDecodeError as exc:
                    raise RuntimeError(
                        f"Invalid JSON in STT config file ({config_path}): {exc}"
                    ) from exc

                if not isinstance(data, dict):
                    raise RuntimeError(
                        "STT config file must contain a JSON object at the top level."
                    )

                _config_cache = data
                _config_cache_path = config_path

    assert _config_cache is not None
    return deepcopy(_config_cache)


def _post_to_collector(settings: Settings, log_id: str, data_json: str) -> bool:
    """Send transcription payload to the configured collector endpoint."""
    if not settings.collector_enabled:
        return True

    collector_url = f"{settings.collector_url}/collector/v1/stt-result"
    headers = {"Content-Type": "application/json"}
    payload = {"id": log_id, "data": data_json}

    try:
        response = requests.post(
            collector_url,
            json=payload,
            headers=headers,
            timeout=settings.collector_timeout_seconds,
            verify=settings.verify_ssl,
        )
    except requests.RequestException as exc:
        logger.error("Collector request failed: %s", exc)
        return False

    if response.status_code != 200:
        logger.error("Collector responded with HTTP %s", response.status_code)
        return False

    try:
        body = response.json()
    except ValueError:
        logger.error("Collector response is not valid JSON: %s", response.text)
        return False

    if body.get("code") != 0:
        logger.error("Collector returned error: %s", body)
        return False

    return True


def _ensure_settings() -> Settings:
    try:
        return get_settings()
    except RuntimeError as exc:
        logger.error("Configuration error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/v1/transcribe")
async def proxy_transcribe(
    file: UploadFile = File(...),
    config: str = Form("{}"),
    title: Optional[str] = Form(None),
):
    settings = _ensure_settings()
    client = _get_client(settings)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")

    config_text = (config or "").strip()
    if config_text:
        try:
            config_payload = json.loads(config_text)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail=f"config JSON 파싱 오류: {exc}") from exc
        if not isinstance(config_payload, dict):
            raise HTTPException(status_code=400, detail="config 값은 JSON 객체여야 합니다.")
    else:
        config_payload = {}

    try:
        upstream_response = await client.submit_transcription(
            file_bytes,
            config_payload,
            title,
        )
    except Exception as exc:  # pragma: no cover - upstream failure
        logger.exception("파일 전사 프록시 중 오류", exc_info=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Upstream transcription request failed: {exc}",
        ) from exc

    upstream_response.setdefault("created_at", datetime.utcnow().isoformat())
    transcribe_id = upstream_response.get("transcribe_id") or upstream_response.get("id")
    if transcribe_id:
        audio_path = _persist_uploaded_audio(settings, transcribe_id, file, file_bytes)
        if audio_path:
            upstream_response.setdefault("audio_url", _build_audio_url(transcribe_id))

    return upstream_response


@app.get("/v1/transcribe/{transcribe_id}")
async def proxy_transcription_status(transcribe_id: str):
    settings = _ensure_settings()
    client = _get_client(settings)

    try:
        status_payload = await client.get_transcription(transcribe_id)
    except Exception as exc:  # pragma: no cover - upstream failure
        logger.exception("전사 상태 조회 프록시 오류 (%s)", transcribe_id, exc_info=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Upstream transcription status request failed: {exc}",
        ) from exc

    status_payload.setdefault("id", transcribe_id)
    status_payload.setdefault("transcribe_id", transcribe_id)
    segments = _extract_segments(status_payload)
    if segments:
        status_payload["segments"] = segments
        if not status_payload.get("text"):
            status_payload["text"] = " ".join(segment["text"] for segment in segments if segment.get("text"))
    audio_url = _available_audio_url(settings, transcribe_id)
    if audio_url:
        status_payload.setdefault("audio_url", audio_url)
    _log_json_debug(
        f"GET /v1/transcribe/{transcribe_id} upstream response",
        status_payload,
    )
    return status_payload


@app.get("/v1/transcribe/{transcribe_id}/audio")
async def download_transcription_audio(transcribe_id: str):
    settings = _ensure_settings()
    artifacts = _audio_artifacts(settings, transcribe_id)
    if not artifacts["data"].exists():
        raise HTTPException(status_code=404, detail="Audio not available.")
    metadata = _load_audio_metadata(artifacts["meta"])
    return FileResponse(
        path=artifacts["data"],
        media_type=metadata["content_type"],
        filename=metadata["original_filename"],
    )


def _normalize_message_type(payload: Dict[str, Any]) -> str:
    for key in ("type", "event", "state", "event_type"):
        value = payload.get(key)
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped.lower()
    return ""


def _extract_decoder_config_from_start(
    payload: Dict[str, Any]
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    config = data.get("decoder_config") or payload.get("decoder_config") or {}
    if not isinstance(config, dict):
        config = {}
    metadata = data.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}
    return config, metadata


def _speech_event_name(event_value: int) -> str:
    try:
        return stt_pb2.DecoderResponse.SpeechEventType.Name(event_value)
    except ValueError:
        logger.debug("Unknown gRPC speech event type: %s", event_value)
        return f"UNKNOWN_{event_value}"


def _infer_result_flags(payload: Dict[str, Any]) -> tuple[Optional[bool], Optional[str]]:
    results = payload.get("results")
    is_final_flag = None
    first_text = None
    if isinstance(results, list) and results:
        first_result = results[0]
        if isinstance(first_result, dict):
            is_final_flag = first_result.get("is_final")
            alternatives = first_result.get("alternatives")
            if isinstance(alternatives, list) and alternatives:
                first_alt = alternatives[0]
                if isinstance(first_alt, dict):
                    text_candidate = first_alt.get("text")
                    if isinstance(text_candidate, str):
                        first_text = text_candidate
    return is_final_flag, first_text


def _apply_result_annotations(
    payload: Dict[str, Any],
    is_final_flag: Optional[bool],
    event_name: str,
    first_text: Optional[str],
) -> None:
    result_type = None
    if is_final_flag is True:
        result_type = "final"
    elif is_final_flag is False:
        result_type = "partial"

    if result_type:
        payload["type"] = result_type
        payload["is_final"] = is_final_flag
        payload.setdefault("partial", not is_final_flag)
    else:
        payload.setdefault("type", str(event_name).lower())

    if first_text and "text" not in payload:
        payload["text"] = first_text


def _grpc_response_payload(message: stt_pb2.DecoderResponse) -> Dict[str, Any]:
    payload = json_format.MessageToDict(
        message, preserving_proto_field_name=True
    )
    event_name = _speech_event_name(message.speech_event_type)
    payload.setdefault("event_type", event_name)

    is_final_flag, first_text = _infer_result_flags(payload)
    _apply_result_annotations(payload, is_final_flag, event_name, first_text)

    results = payload.get("results")
    # Preserve a raw word-level concatenation so downstream can show both ITN text and
    # timing-aligned tokens (which may be non-ITN).
    if isinstance(results, list) and results:
        words_text_fragments: list[str] = []
        first_result = results[0]
        if isinstance(first_result, dict):
            alternatives = first_result.get("alternatives")
            if isinstance(alternatives, list):
                for alt in alternatives:
                    if not isinstance(alt, dict):
                        continue
                    words = alt.get("words")
                    if not isinstance(words, list):
                        continue
                    for word in words:
                        if isinstance(word, dict):
                            text_val = word.get("text")
                            if isinstance(text_val, str) and text_val.strip():
                                words_text_fragments.append(text_val.strip())
        if words_text_fragments:
            joined = " ".join(words_text_fragments)
            payload.setdefault("raw_text", joined)
    return payload


async def _handle_onprem_streaming(
    websocket: WebSocket, client: RTZRClient, settings: Settings
) -> None:
    """Bridge client websocket messages to the on-prem gRPC streaming API."""
    try:
        first = await websocket.receive()
    except WebSocketDisconnect:
        return
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("온프렘 스트리밍 start 수신 실패", exc_info=exc)
        await websocket.close(code=1011, reason="Invalid start message")
        return

    start_text = first.get("text")
    if not start_text:
        await websocket.send_text(json.dumps({"type": "error", "message": "Missing start message."}))
        await websocket.close(code=1007, reason="Missing start message")
        return

    try:
        start_payload = json.loads(start_text)
    except json.JSONDecodeError:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid start payload."}))
        await websocket.close(code=1007, reason="Invalid start payload")
        return

    if not isinstance(start_payload, dict):
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid start payload."}))
        await websocket.close(code=1007, reason="Invalid start payload")
        return

    msg_type = _normalize_message_type(start_payload)
    if msg_type and msg_type not in {"start", "session", "start_request"}:
        await websocket.send_text(json.dumps({"type": "error", "message": "Start message is required first."}))
        await websocket.close(code=1007, reason="Start message required")
        return

    decoder_config, metadata = _extract_decoder_config_from_start(start_payload)

    try:
        grpc_session = await client.connect_grpc_streaming(
            config=decoder_config,
            metadata=metadata,
        )
    except Exception as exc:  # pragma: no cover - upstream failures
        logger.exception(
            "온프렘 gRPC 스트리밍 연결 실패 (api_base=%s)",
            settings.pronaia_api_base,
            exc_info=exc,
        )
        await websocket.send_text(
            json.dumps({"type": "error", "message": "Failed to connect upstream gRPC streaming session."})
        )
        await websocket.close(code=1011, reason="Upstream gRPC connection failed")
        return

    # Signal handshake ready to the browser client.
    await websocket.send_text(json.dumps({"type": "ready"}))

    async def relay_client_to_grpc():
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                binary = message.get("bytes")
                if binary is not None:
                    await grpc_session.send_audio(bytes(binary))
                    continue
                text = message.get("text")
                if text is None:
                    continue
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    continue
                if not isinstance(parsed, dict):
                    continue
                parsed_type = _normalize_message_type(parsed)
                if parsed_type in {"final", "stop", "eos"}:
                    await grpc_session.finish()
                    break
        except WebSocketDisconnect:
            logger.info("온프렘 스트리밍: 브라우저 연결 종료 (client->grpc)")
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("온프렘 스트리밍 client->grpc 오류", exc_info=exc)
            raise

    async def relay_grpc_to_client():
        try:
            while True:
                response = await grpc_session.recv()
                if response is None:
                    break
                await websocket.send_text(
                    json.dumps(_grpc_response_payload(response), ensure_ascii=False)
                )
        except WebSocketDisconnect:
            logger.info("온프렘 스트리밍: 브라우저 연결 종료 (grpc->client)")
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("온프렘 스트리밍 grpc->client 오류", exc_info=exc)
            raise

    tasks = [
        asyncio.create_task(relay_client_to_grpc()),
        asyncio.create_task(relay_grpc_to_client()),
    ]

    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in done:
            with contextlib.suppress(asyncio.CancelledError):
                task.result()
    finally:
        with contextlib.suppress(Exception):
            await grpc_session.close()
        with contextlib.suppress(Exception):
            await websocket.close()


@app.websocket("/v1/streaming")
async def streaming_proxy(websocket: WebSocket):
    try:
        settings = get_settings()
    except RuntimeError as exc:
        await websocket.accept()
        await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))
        await websocket.close(code=1011, reason="Configuration error")
        return

    client = _get_client(settings)

    await websocket.accept()

    if settings.deployment == "onprem":
        await _handle_onprem_streaming(websocket, client, settings)
        return

    streaming_url = None
    try:
        streaming_url = client.get_streaming_url()
        upstream = await client.connect_streaming()
    except Exception as exc:  # pragma: no cover - upstream connection failure
        logger.exception(
            "실시간 스트리밍 upstream 연결 실패 (deployment=%s, api_base=%s, streaming_url=%s)",
            settings.deployment,
            settings.pronaia_api_base,
            streaming_url or "unknown",
            exc_info=exc,
        )
        await websocket.send_text(
            json.dumps({"type": "error", "message": "Failed to connect upstream streaming session."})
        )
        await websocket.close(code=1011, reason="Upstream connection failed")
        return

    async def relay_client_to_upstream():
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                binary = message.get("bytes")
                if binary is not None:
                    await upstream.send(bytes(binary))
                    continue
                text = message.get("text")
                if text is not None:
                    await upstream.send(text)
        except WebSocketDisconnect:
            pass
        except (ConnectionClosedError, ConnectionClosedOK):
            pass
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("스트리밍 프록시 client->upstream 오류", exc_info=exc)
            raise

    async def relay_upstream_to_client():
        try:
            while True:
                data = await upstream.recv()
                _log_streaming_message("upstream->client", data)
                if isinstance(data, (bytes, bytearray)):
                    await websocket.send_bytes(bytes(data))
                else:
                    await websocket.send_text(data)
        except (ConnectionClosedOK, ConnectionClosedError):
            pass
        except WebSocketDisconnect:
            pass
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("스트리밍 프록시 upstream->client 오류", exc_info=exc)
            raise

    forward_tasks = [
        asyncio.create_task(relay_client_to_upstream()),
        asyncio.create_task(relay_upstream_to_client()),
    ]

    try:
        done, pending = await asyncio.wait(
            forward_tasks,
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        for task in done:
            try:
                task.result()
            except asyncio.CancelledError:
                pass
            except Exception:
                # 이미 로그 기록
                pass
    finally:
        for task in forward_tasks:
            task.cancel()
        with contextlib.suppress(Exception):
            await upstream.close()
        with contextlib.suppress(Exception):
            await websocket.close()


@app.post("/stt_api", response_model=STTResponse)
async def stt_api(payload: STTRequest) -> STTResponse:
    """Synchronous-style STT delegation endpoint."""
    try:
        settings = get_settings()
    except RuntimeError as exc:
        return _build_failure_response(str(exc))

    if payload.argument.language_code.lower() != "korean":
        return _build_failure_response("Unsupported language_code. Expected 'korean'.")

    try:
        audio_bytes = base64.b64decode(payload.argument.audio)
    except (binascii.Error, ValueError):
        return _build_failure_response("Invalid base64-encoded audio payload.")

    timestamp = datetime.now()
    directories = _ensure_storage_dirs(settings.storage_base_dir, timestamp)
    request_identifier = uuid.uuid4().hex[:8]

    audio_filename = f"{timestamp.strftime('%H%M%S_%f')}_{request_identifier}.wav"
    audio_path = directories["audio"] / audio_filename
    audio_path.write_bytes(audio_bytes)

    client = _get_client(settings)

    try:
        config = _get_base_config(settings)
    except RuntimeError as exc:
        return _build_failure_response(str(exc))

    if not config:
        config = {}

    config["language"] = payload.argument.language_code

    try:
        submission = await client.submit_transcription(audio_bytes, config, None)
    except Exception as exc:  # pragma: no cover - network/SDK failure paths
        return _build_failure_response(f"Failed to submit transcription job: {exc}")

    transcribe_id = (
        submission.get("transcribe_id")
        or submission.get("id")
        or submission.get("tid")
    )
    if not transcribe_id:
        return _build_failure_response("Upstream response did not include transcribe_id.")

    now_kst = datetime.now()

    # log_id = transcribe_id or request_identifier
    base_timestamp = now_kst.strftime("%Y%m%d%H%M%S")
    micro_4digits = now_kst.strftime("%f")[:4]
    file_timestamp = f"{base_timestamp}{micro_4digits}"

    # Rename the audio file to include the transcribe ID for traceability.
    # new_audio_name = f"{timestamp.strftime('%H%M%S_%f')}_{transcribe_id}.wav"
    new_audio_name = f"{file_timestamp}.wav"
    new_audio_path = audio_path.with_name(new_audio_name)
    audio_path.rename(new_audio_path)
    audio_path = new_audio_path

    poll_result = await _poll_until_complete(client, transcribe_id, settings)

    if poll_result is None:
        return _build_failure_response("Transcription job timed out before completion.")

    text_fragments = _collect_text_candidates(poll_result)
    full_msg = " ".join(text_fragments)
    results_container = poll_result.get("results")
    if isinstance(results_container, dict):
        results_container["full_msg"] = full_msg
    else:
        poll_result["full_msg"] = full_msg
    poll_result_json = json.dumps(poll_result, ensure_ascii=False)

    # transcript_filename = f"{timestamp.strftime('%H%M%S_%f')}_{transcribe_id}.json"
    transcript_filename = f"{file_timestamp}.json"
    transcript_path = directories["transcript"] / transcript_filename
    _write_json_dump(transcript_path, poll_result)

    collector_ok = await asyncio.to_thread(
        _post_to_collector, settings, file_timestamp, poll_result_json
    )
    if not collector_ok:
        logger.warning(
            "Collector notification failed for %s; returning STT result anyway.",
            file_timestamp,
        )

    status = poll_result.get("status")
    if status != "completed":
        fallback_msg = (
            poll_result.get("message")
            or poll_result.get("error")
            or "Transcription failed."
        )
        recognized = full_msg or fallback_msg
        return STTResponse(
            result=FAILURE_CODE,
            return_object=STTReturnObject(recognized=recognized),
        )

    recognized = full_msg or ""
    logger.info(
        "Transcription %s succeeded. Audio stored at %s", transcribe_id, audio_path
    )
    return STTResponse(
        result=SUCCESS_CODE,
        return_object=STTReturnObject(recognized=recognized),
    )
