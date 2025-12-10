"""Minimal REST client for RTZR STT endpoints."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
import inspect
from typing import Any, Dict, Optional
from urllib.parse import urlencode, urlparse

import httpx
import websockets
from websockets.client import WebSocketClientProtocol
import grpc
from google.protobuf import json_format

from .config import Settings
from .protos import vito_stt_client_pb2 as stt_pb2
from .protos import vito_stt_client_pb2_grpc as stt_pb2_grpc

logger = logging.getLogger(__name__)

_CONNECT_SUPPORTS_ADDITIONAL_HEADERS = (
    "additional_headers" in inspect.signature(websockets.connect).parameters
)

# Mirrors python_api/api_server/example.py defaults so the upstream accepts the stream.
DEFAULT_STREAMING_CONFIG: Dict[str, str] = {
    "sample_rate": "16000",
    "encoding": "LINEAR16",
    "use_itn": "true",
    "use_disfluency_filter": "false",
    "use_profanity_filter": "false",
}


class GrpcStreamingSession:
    """Lightweight async adapter around the gRPC bidirectional stream."""

    def __init__(
        self,
        target: str,
        use_tls: bool,
        verify_ssl: bool,
        metadata: Optional[Dict[str, str]] = None,
    ):
        self._target = target
        self._use_tls = use_tls
        self._verify_ssl = verify_ssl
        self._metadata = metadata or {}
        self._channel: Optional[grpc.aio.Channel] = None
        self._call: Optional[grpc.aio.StreamStreamCall] = None
        self._recv_queue: asyncio.Queue[Optional[stt_pb2.DecoderResponse]] = asyncio.Queue()
        self._recv_task: Optional[asyncio.Task[None]] = None
        self._last_error: Optional[BaseException] = None
        self._closed = False
        self._send_lock = asyncio.Lock()

    async def start(self, decoder_config: stt_pb2.DecoderConfig) -> None:
        """Open the bidirectional stream and push the initial config."""
        if self._channel:
            return
        if self._use_tls:
            credentials = grpc.ssl_channel_credentials()
            options = None
            if not self._verify_ssl:
                host_override = self._target.split(":", 1)[0]
                options = (("grpc.ssl_target_name_override", host_override),)
            self._channel = grpc.aio.secure_channel(
                self._target,
                credentials,
                options=options,
            )
        else:
            self._channel = grpc.aio.insecure_channel(self._target)

        stub = stt_pb2_grpc.OnlineDecoderStub(self._channel)
        metadata = list((str(k), str(v)) for k, v in self._metadata.items())
        self._call = stub.Decode(metadata=metadata or None)
        await self._call.write(
            stt_pb2.DecoderRequest(streaming_config=decoder_config)
        )
        self._recv_task = asyncio.create_task(self._recv_loop())

    async def _recv_loop(self) -> None:
        try:
            assert self._call is not None
            async for resp in self._call:
                await self._recv_queue.put(resp)
        except Exception as exc:  # pragma: no cover - network failures
            self._last_error = exc
        finally:
            await self._recv_queue.put(None)

    async def send_audio(self, data: bytes) -> None:
        """Send a raw audio chunk upstream."""
        if not self._call:
            raise RuntimeError("gRPC stream is not started.")
        async with self._send_lock:
            await self._call.write(stt_pb2.DecoderRequest(audio_content=data))

    async def finish(self) -> None:
        """Half-close the client stream and wait for remaining responses."""
        if self._call:
            with contextlib.suppress(Exception):
                await self._call.done_writing()

    async def recv(self) -> Optional[stt_pb2.DecoderResponse]:
        """Pop the next upstream response or None if the stream ended."""
        message = await self._recv_queue.get()
        if message is None:
            self._closed = True
        return message

    async def close(self) -> None:
        """Terminate the stream and channel."""
        if self._closed:
            return
        self._closed = True
        if self._recv_task:
            self._recv_task.cancel()
        if self._call:
            with contextlib.suppress(Exception):
                await self._call.aclose()
        if self._channel:
            with contextlib.suppress(Exception):
                await self._channel.close()

    @property
    def last_error(self) -> Optional[BaseException]:
        return self._last_error


class RTZRClient:
    """Thin wrapper for RTZR STT REST endpoints with token caching."""

    def __init__(self, settings: Settings):
        self._session = httpx.AsyncClient(verify=settings.verify_ssl, http2=True)
        self._client_id = settings.pronaia_client_id or ""
        self._client_secret = settings.pronaia_client_secret or ""
        self._api_base = settings.pronaia_api_base.rstrip("/")
        self._manual_token = (settings.pronaia_access_token or "").strip()
        self._deployment = settings.deployment
        self._transcribe_path = settings.transcribe_path
        self._transcribe_status_path = settings.transcribe_status_path
        self._streaming_path = settings.streaming_path
        self._auth_enabled = settings.auth_enabled
        self._verify_ssl = settings.verify_ssl
        self._token_lock = asyncio.Lock()

        self._access_token: Optional[str] = None
        self._token_expiry: float = 0.0

    async def _refresh_token(self) -> None:
        """Obtain a fresh access token from the authentication endpoint."""
        if not self._auth_enabled:
            raise RuntimeError(
                "Attempted to refresh token while authentication is disabled."
            )
        logger.debug("Refreshing RTZR access token.")
        resp = await self._session.post(
            f"{self._api_base}/v1/authenticate",
            data={"client_id": self._client_id, "client_secret": self._client_secret},
            timeout=30,
        )
        resp.raise_for_status()
        payload = resp.json()
        access_token = payload.get("access_token")
        if not access_token:
            raise RuntimeError("Authentication response missing 'access_token'.")

        now = time.time()
        expire_at = payload.get("expire_at")
        expires_in = payload.get("expires_in")
        expiry = None

        for candidate in (expire_at, expires_in):
            if candidate is None:
                continue
            try:
                candidate_float = float(candidate)
            except (TypeError, ValueError):
                continue
            if candidate is expire_at:
                expiry = candidate_float
                break
            expiry = now + candidate_float
            break

        if expiry is None or expiry <= now:
            expiry = now + 300  # default to 5 minutes if response lacks info

        self._access_token = access_token
        self._token_expiry = expiry

    async def _ensure_token(self) -> str:
        """Return a valid access token, refreshing if needed."""
        if self._manual_token:
            return self._manual_token
        if not self._auth_enabled:
            raise RuntimeError(
                "Authentication requested but credentials are not configured."
            )
        now = time.time()
        if self._access_token and now < self._token_expiry - 5:
            return self._access_token

        async with self._token_lock:
            now = time.time()
            if self._access_token and now < self._token_expiry - 5:
                return self._access_token
            await self._refresh_token()
            if not self._access_token:
                raise RuntimeError("Unable to obtain RTZR access token.")
            return self._access_token

    async def _resolve_access_token(self) -> Optional[str]:
        """Return a usable access token if credentials or manual token are configured."""
        if self._deployment == "onprem":
            return self._manual_token or None
        if self._manual_token:
            return self._manual_token
        if not self._auth_enabled:
            return None
        return await self._ensure_token()

    def _grpc_target(self) -> tuple[str, bool]:
        """Return target host:port and whether TLS should be used."""
        parsed = urlparse(self._api_base)
        if parsed.scheme:
            host = parsed.hostname
            port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
            if not host:
                raise RuntimeError("Invalid API base URL for gRPC streaming.")
            return f"{host}:{port}", parsed.scheme.lower().startswith("https")
        return self._api_base, False

    @staticmethod
    def _coerce_int(value: Any, default: Optional[int] = None) -> Optional[int]:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _coerce_float(value: Any, default: Optional[float] = None) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _coerce_bool(value: Any, default: Optional[bool] = None) -> Optional[bool]:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"1", "true", "yes", "y"}:
                return True
            if lowered in {"0", "false", "no", "n"}:
                return False
        if isinstance(value, (int, float)):
            if value == 1:
                return True
            if value == 0:
                return False
        return default

    @staticmethod
    def _coerce_keywords(value: Any) -> Optional[list[str]]:
        if value is None:
            return None
        if isinstance(value, str):
            parts = [part.strip() for part in value.split(",") if part.strip()]
            return parts or None
        if isinstance(value, (list, tuple)):
            cleaned = []
            for entry in value:
                if isinstance(entry, str):
                    trimmed = entry.strip()
                    if trimmed:
                        cleaned.append(trimmed)
            return cleaned or None
        return None

    @staticmethod
    def _has_field(message: Any, field_name: str) -> bool:
        descriptor = getattr(message, "DESCRIPTOR", None)
        if descriptor is None:
            return False
        return field_name in descriptor.fields_by_name

    @staticmethod
    def _set_field_if_supported(message: Any, field_name: str, value: Any) -> None:
        if value is None:
            return
        if RTZRClient._has_field(message, field_name):
            setattr(message, field_name, value)

    def _build_decoder_config(
        self, config: Optional[Dict[str, Any]] = None
    ) -> stt_pb2.DecoderConfig:
        merged: Dict[str, Any] = dict(DEFAULT_STREAMING_CONFIG)
        if config:
            merged.update(config)

        sample_rate = self._coerce_int(merged.get("sample_rate"), 16000) or 16000
        encoding_str = str(merged.get("encoding") or "LINEAR16").strip().upper()
        encoding_value = getattr(
            stt_pb2.DecoderConfig.AudioEncoding, encoding_str, None
        )
        if not isinstance(encoding_value, int):
            encoding_value = stt_pb2.DecoderConfig.AudioEncoding.LINEAR16

        decoder_config = stt_pb2.DecoderConfig(
            sample_rate=sample_rate,
            encoding=encoding_value,
        )

        model_name = (merged.get("model_name") or merged.get("model") or "").strip()
        self._set_field_if_supported(decoder_config, "model_name", model_name or None)

        language = (merged.get("language") or merged.get("lang") or "").strip()
        self._set_field_if_supported(decoder_config, "language", language or None)

        domain = (merged.get("domain") or "").strip()
        self._set_field_if_supported(decoder_config, "domain", domain or None)

        use_itn = self._coerce_bool(merged.get("use_itn"))
        self._set_field_if_supported(decoder_config, "use_itn", use_itn)

        use_disfluency = self._coerce_bool(merged.get("use_disfluency_filter"))
        self._set_field_if_supported(
            decoder_config, "use_disfluency_filter", use_disfluency
        )

        use_profanity = self._coerce_bool(merged.get("use_profanity_filter"))
        self._set_field_if_supported(
            decoder_config, "use_profanity_filter", use_profanity
        )

        use_punctuation = self._coerce_bool(merged.get("use_punctuation"))
        self._set_field_if_supported(decoder_config, "use_punctuation", use_punctuation)

        keywords = self._coerce_keywords(merged.get("keywords"))
        if keywords and self._has_field(decoder_config, "keywords"):
            decoder_config.keywords.extend(keywords)

        stream_config_payload = merged.get("stream_config")
        stream_config = stt_pb2.RuntimeStreamConfig()
        epd_time = None
        max_utter_duration = None
        if isinstance(stream_config_payload, dict):
            epd_time = self._coerce_float(
                stream_config_payload.get("epd_time"), epd_time
            )
            max_utter_duration = self._coerce_int(
                stream_config_payload.get("max_utter_duration"), max_utter_duration
            )
        epd_time = self._coerce_float(merged.get("epd_time"), epd_time)
        max_utter_duration = self._coerce_int(
            merged.get("max_utter_duration"), max_utter_duration
        )
        self._set_field_if_supported(stream_config, "max_utter_duration", max_utter_duration)
        self._set_field_if_supported(stream_config, "epd_time", epd_time)
        if stream_config.ListFields() and self._has_field(decoder_config, "stream_config"):
            decoder_config.stream_config.CopyFrom(stream_config)

        return decoder_config

    async def connect_grpc_streaming(
        self,
        config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> GrpcStreamingSession:
        """Establish an upstream gRPC streaming session."""
        target, use_tls = self._grpc_target()
        token = await self._resolve_access_token()
        meta: Dict[str, str] = dict(metadata or {})
        if token:
            meta.setdefault("authorization", f"bearer {token}")

        decoder_config = self._build_decoder_config(config)
        session = GrpcStreamingSession(
            target=target,
            use_tls=use_tls,
            verify_ssl=self._verify_ssl,
            metadata=meta,
        )
        await session.start(decoder_config)
        return session

    async def submit_transcription(
        self,
        audio_bytes: bytes,
        config: Optional[Dict[str, Any]] = None,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit an audio file for transcription and return the raw response payload."""
        headers: Dict[str, str] = {}
        token = await self._resolve_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        data: Dict[str, Any] = {"config": json.dumps(config or {})}
        if title:
            data["title"] = title
        files = {"file": ("audio.wav", audio_bytes)}
        resp = await self._session.post(
            self._build_url(self._transcribe_path),
            headers=headers,
            data=data,
            files=files,
            timeout=60,
        )
        resp.raise_for_status()
        payload = resp.json()
        job_id = payload.get("id") or payload.get("tid") or payload.get("transcribe_id")
        if not job_id:
            raise RuntimeError("Transcribe response missing 'id'.")
        if "transcribe_id" not in payload:
            payload["transcribe_id"] = job_id
        return payload

    async def get_transcription(self, job_id: str) -> Dict[str, Any]:
        """Fetch the current status for a transcription job."""
        headers: Dict[str, str] = {}
        token = await self._resolve_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        resp = await self._session.get(
            self._build_url(self._transcribe_status_path.format(transcribe_id=job_id)),
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def _build_url(self, path: str) -> str:
        """Join the API base with a relative path."""
        if path.startswith("http://") or path.startswith("https://"):
            return path
        return f"{self._api_base}{path}"

    @staticmethod
    def _normalize_streaming_value(value: Any) -> Optional[str]:
        """Convert arbitrary values into the string representation RTZR expects."""
        if value is None:
            return None
        if isinstance(value, bool):
            return "true" if value else "false"
        return str(value)

    def _build_streaming_url(
        self, config: Optional[Dict[str, Any]] = None
    ) -> str:
        """Construct the streaming URL with query parameters mirroring the SDK example."""
        if "://" not in self._api_base:
            raise RuntimeError("Invalid API base URL for streaming")

        host_and_path = self._api_base.split("://", 1)[1].rstrip("/")
        streaming_path = self._streaming_path.lstrip("/")
        scheme = "wss" if self._api_base.lower().startswith("https://") else "ws"
        base_url = f"{scheme}://{host_and_path}/{streaming_path}"

        merged_config: Dict[str, str] = DEFAULT_STREAMING_CONFIG.copy()
        if config:
            for key, value in config.items():
                normalized = self._normalize_streaming_value(value)
                if normalized is None:
                    continue
                merged_config[str(key)] = normalized

        query = urlencode(merged_config)
        return f"{base_url}?{query}" if query else base_url

    def get_streaming_url(self, config: Optional[Dict[str, Any]] = None) -> str:
        """Expose the websocket URL used for upstream streaming connections."""
        return self._build_streaming_url(config=config)

    async def connect_streaming(
        self, config: Optional[Dict[str, Any]] = None
    ) -> WebSocketClientProtocol:
        """Establish an upstream streaming WebSocket connection."""
        url = self.get_streaming_url(config=config)
        token = await self._resolve_access_token()
        headers: Dict[str, str] = {}
        if token:
            headers["Authorization"] = f"bearer {token}"

        connect_kwargs: Dict[str, Any] = {
            "ping_interval": None,
            "max_size": None,
        }
        if headers:
            header_key = (
                "additional_headers"
                if _CONNECT_SUPPORTS_ADDITIONAL_HEADERS
                else "extra_headers"
            )
            connect_kwargs[header_key] = headers

        return await websockets.connect(
            url,
            **connect_kwargs,
        )

    async def aclose(self) -> None:
        """Close the underlying HTTP client."""
        await self._session.aclose()
