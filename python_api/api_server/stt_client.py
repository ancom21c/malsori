"""Minimal REST client for RTZR STT endpoints."""

from __future__ import annotations

import json
import logging
import time
from threading import Lock
import inspect
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import requests
import websockets
from websockets.client import WebSocketClientProtocol

from .config import Settings

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


class RTZRClient:
    """Thin wrapper for RTZR STT REST endpoints with token caching."""

    def __init__(self, settings: Settings):
        self._session = requests.Session()
        self._session.verify = settings.verify_ssl
        self._client_id = settings.pronaia_client_id or ""
        self._client_secret = settings.pronaia_client_secret or ""
        self._api_base = settings.pronaia_api_base.rstrip("/")
        self._manual_token = (settings.pronaia_access_token or "").strip()
        self._transcribe_path = settings.transcribe_path
        self._transcribe_status_path = settings.transcribe_status_path
        self._streaming_path = settings.streaming_path
        self._auth_enabled = settings.auth_enabled
        self._lock = Lock()

        self._access_token: Optional[str] = None
        self._token_expiry: float = 0.0

    def _refresh_token(self) -> None:
        """Obtain a fresh access token from the authentication endpoint."""
        if not self._auth_enabled:
            raise RuntimeError(
                "Attempted to refresh token while authentication is disabled."
            )
        logger.debug("Refreshing RTZR access token.")
        resp = self._session.post(
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

    def _ensure_token(self) -> str:
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

        with self._lock:
            now = time.time()
            if self._access_token and now < self._token_expiry - 5:
                return self._access_token
            self._refresh_token()
            if not self._access_token:
                raise RuntimeError("Unable to obtain RTZR access token.")
            return self._access_token

    def _resolve_access_token(self) -> Optional[str]:
        """Return a usable access token if credentials or manual token are configured."""
        if self._manual_token:
            return self._manual_token
        if not self._auth_enabled:
            return None
        return self._ensure_token()

    def submit_transcription(
        self,
        audio_bytes: bytes,
        config: Optional[Dict[str, Any]] = None,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit an audio file for transcription and return the raw response payload."""
        headers: Dict[str, str] = {}
        token = self._resolve_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        data: Dict[str, Any] = {"config": json.dumps(config or {})}
        if title:
            data["title"] = title
        files = {"file": ("audio.wav", audio_bytes)}
        resp = self._session.post(
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

    def get_transcription(self, job_id: str) -> Dict[str, Any]:
        """Fetch the current status for a transcription job."""
        headers: Dict[str, str] = {}
        token = self._resolve_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        resp = self._session.get(
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

    async def connect_streaming(
        self, config: Optional[Dict[str, Any]] = None
    ) -> WebSocketClientProtocol:
        """Establish an upstream streaming WebSocket connection."""
        url = self._build_streaming_url(config=config)
        token = self._resolve_access_token()
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
