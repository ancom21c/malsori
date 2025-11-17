"""Configuration handling for the STT delegation service."""

from __future__ import annotations

import contextlib
import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PrivateAttr,
    ValidationError,
    model_validator,
)

logger = logging.getLogger(__name__)

_OVERRIDE_FILENAME = "backend_endpoint.override.json"
_override_lock = Lock()
_OVERRIDE_KEYS = {
    "deployment",
    "pronaia_api_base",
    "pronaia_client_id",
    "pronaia_client_secret",
    "verify_ssl",
}


class Settings(BaseModel):
    """Runtime configuration loaded from environment variables."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    pronaia_client_id: Optional[str] = Field(default=None, alias="PRONAIA_CLIENT_ID")
    pronaia_client_secret: Optional[str] = Field(
        default=None, alias="PRONAIA_CLIENT_SECRET"
    )
    storage_base_dir: Path = Field(..., alias="STT_STORAGE_BASE_DIR")
    pronaia_api_base: str = Field(
        "https://dev-openapi.vito.ai", alias="PRONAIA_API_BASE"
    )
    pronaia_access_token: Optional[str] = Field(
        default=None, alias="PRONAIA_ACCESS_TOKEN"
    )
    poll_interval_seconds: float = Field(1.0, alias="STT_POLL_INTERVAL", gt=0.0)
    poll_timeout_seconds: float = Field(180.0, alias="STT_POLL_TIMEOUT", gt=0.0)
    verify_ssl: bool = Field(True, alias="STT_VERIFY_SSL")
    deployment: Literal["cloud", "onprem"] = Field("cloud", alias="STT_DEPLOYMENT")
    collector_url: Optional[str] = Field(default=None, alias="STT_COLLECTOR_URL")
    collector_timeout_seconds: float = Field(
        10.0, alias="STT_COLLECTOR_TIMEOUT", gt=0.0
    )
    stt_config_path: Optional[Path] = Field(default=None, alias="STT_CONFIG_PATH")

    _transcribe_path: str = PrivateAttr("/v1/transcribe")
    _transcribe_status_path: str = PrivateAttr("/v1/transcribe/{transcribe_id}")
    _streaming_path: str = PrivateAttr("/v1/transcribe:streaming")

    @model_validator(mode="after")
    def _prepare(self) -> "Settings":
        """Normalize paths and ensure directories exist."""
        base_dir = Path(self.storage_base_dir).expanduser()
        base_dir.mkdir(parents=True, exist_ok=True)
        self.storage_base_dir = base_dir
        self.pronaia_api_base = str(self.pronaia_api_base).rstrip("/")
        deployment = str(self.deployment).lower()
        if deployment not in {"cloud", "onprem"}:
            raise ValueError(f"Invalid STT deployment mode: {self.deployment}")
        self.deployment = deployment  # type: ignore[assignment]
        if self.deployment == "cloud":
            self._transcribe_path = "/v1/transcribe"
            self._transcribe_status_path = "/v1/transcribe/{transcribe_id}"
            self._streaming_path = "/v1/transcribe:streaming"
        else:
            self._transcribe_path = "/api/v2/batch"
            self._transcribe_status_path = "/api/v2/batch/{transcribe_id}"
            self._streaming_path = "/api/v1/transcribe:streaming"
        if self.collector_url:
            self.collector_url = str(self.collector_url).rstrip("/")
        if self.stt_config_path:
            config_path = Path(self.stt_config_path).expanduser()
            if not config_path.is_file():
                raise ValueError(f"STT config path does not exist: {config_path}")
            self.stt_config_path = config_path
        return self

    @property
    def auth_enabled(self) -> bool:
        """Return True when both client ID and secret are configured."""
        return bool(self.pronaia_client_id and self.pronaia_client_secret)

    @property
    def transcribe_path(self) -> str:
        return self._transcribe_path

    @property
    def transcribe_status_path(self) -> str:
        return self._transcribe_status_path

    @property
    def streaming_path(self) -> str:
        return self._streaming_path

    @property
    def collector_enabled(self) -> bool:
        """Return True when collector URL is configured."""
        return bool(self.collector_url)

    @property
    def has_stt_config(self) -> bool:
        """Return True when an external STT config was provided."""
        return self.stt_config_path is not None


def _resolve_storage_base_dir(value: Optional[str] = None) -> Path:
    base_value = value or os.environ.get("STT_STORAGE_BASE_DIR")
    if not base_value:
        raise RuntimeError("STT_STORAGE_BASE_DIR is not configured.")
    base_dir = Path(base_value).expanduser()
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def _runtime_override_path(base_dir: Path) -> Path:
    return base_dir / _OVERRIDE_FILENAME


def _normalize_override_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}
    for key, value in data.items():
        if key not in _OVERRIDE_KEYS:
            continue
        if value is None:
            continue
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                continue
            if key == "deployment":
                normalized[key] = trimmed.lower()
            else:
                normalized[key] = trimmed
            continue
        normalized[key] = value
    return normalized


def _load_override_payload(base_dir: Path) -> Dict[str, Any]:
    path = _runtime_override_path(base_dir)
    if not path.exists():
        return {}
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as exc:  # pragma: no cover - defensive
        logger.warning("Failed to read backend override config: %s", exc)
        return {}
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        logger.warning("Invalid backend override config JSON: %s", exc)
        return {}
    if not isinstance(data, dict):
        return {}
    return _normalize_override_payload(data)


def get_backend_override() -> Dict[str, Any]:
    """Return the current backend override payload, if any."""
    base_dir = _resolve_storage_base_dir()
    with _override_lock:
        return dict(_load_override_payload(base_dir))


def apply_backend_override(payload: Dict[str, Any]) -> Settings:
    """Persist an override payload and reload settings."""
    base_dir = _resolve_storage_base_dir()
    normalized = _normalize_override_payload(payload)
    with _override_lock:
        path = _runtime_override_path(base_dir)
        if normalized:
            path.write_text(
                json.dumps(normalized, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        else:
            with contextlib.suppress(FileNotFoundError):
                path.unlink()
    get_settings.cache_clear()
    return get_settings()


def clear_backend_override() -> Settings:
    """Remove the override payload and reload settings."""
    base_dir = _resolve_storage_base_dir()
    with _override_lock:
        path = _runtime_override_path(base_dir)
        with contextlib.suppress(FileNotFoundError):
            path.unlink()
    get_settings.cache_clear()
    return get_settings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load configuration from environment variables with caching."""
    env_data: Dict[str, str] = {}

    for field_name, field_info in Settings.model_fields.items():
        alias = field_info.alias or field_name
        value = os.environ.get(alias)
        if value is not None:
            env_data[field_name] = value

    base_dir_value = env_data.get("storage_base_dir") or os.environ.get(
        "STT_STORAGE_BASE_DIR"
    )
    if base_dir_value:
        try:
            base_dir = _resolve_storage_base_dir(str(base_dir_value))
        except RuntimeError:
            base_dir = None
        if base_dir is not None:
            with _override_lock:
                overrides = _load_override_payload(base_dir)
            if overrides:
                env_data.update(overrides)

    try:
        return Settings(**env_data)
    except ValidationError as exc:
        missing = []
        for name, field_info in Settings.model_fields.items():
            is_required_attr = getattr(field_info, "is_required")
            required = (
                is_required_attr()
                if callable(is_required_attr)
                else bool(is_required_attr)
            )
            if required and (name not in env_data):
                missing.append(field_info.alias or name)
        missing_msg = f" Missing variables: {', '.join(missing)}." if missing else ""
        raise RuntimeError(f"Invalid configuration: {exc}{missing_msg}") from exc
