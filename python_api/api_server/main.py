"""FastAPI application exposing a synchronous wrapper over the RTZR STT API."""

from __future__ import annotations

import base64
import binascii
import asyncio
import contextlib
import json
import logging
import os
import secrets
import sys
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Literal, Optional, get_args
from urllib.parse import urlparse

from copy import deepcopy

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
import grpc
import httpx
import requests
from websockets.exceptions import (
    ConnectionClosedError,
    ConnectionClosedOK,
)
from google.protobuf import json_format
from pydantic import ValidationError

from .config import (
    Settings,
    apply_backend_override,
    clear_backend_override,
    get_backend_override,
    get_settings,
)
from .backend_bindings_store import (
    delete_backend_profile,
    delete_feature_binding,
    get_backend_profile,
    get_feature_binding,
    list_backend_profiles,
    list_feature_bindings,
    upsert_backend_profile,
    upsert_feature_binding,
)
from .models import (
    BackendAuthStrategyModel,
    BackendCapability,
    BackendCapabilitiesResponse,
    BackendBindingCompatibilityState,
    BackendEndpointState,
    BackendEndpointUpdateRequest,
    BackendHealthSnapshotModel,
    BackendProfileHealthResponse,
    BackendProfileRecord,
    BackendProfilesResponse,
    FeatureBindingRecord,
    FeatureBindingsResponse,
    FeatureKey,
    FinalTurnTranslationRequest,
    FinalTurnTranslationResponse,
    FullSummaryRequest,
    FullSummaryResponse,
    FrontendRuntimeErrorAck,
    FrontendRuntimeErrorReport,
    HealthStatusResponse,
    STTRequest,
    STTResponse,
    STTReturnObject,
    SummaryBlockResultModel,
    SummarySupportingSnippetModel,
)
from .stt_client import RTZRClient

UPSTREAM_GRPC_TERMINAL_CLOSE_CODE = 4001
UPSTREAM_GRPC_TERMINAL_CLOSE_REASON = "UPSTREAM_GRPC_ERROR"
from .protos import vito_stt_client_pb2 as stt_pb2
from .google_drive_oauth import router as google_drive_oauth_router


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


def _truncate_log_text(value: Optional[str], max_length: int) -> Optional[str]:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    if len(text) <= max_length:
        return text
    return f"{text[:max_length]}...(truncated)"


def _normalize_backend_api_base_url(value: str) -> str:
    base_url = value.strip()
    if not base_url:
        _raise_api_error(400, "BACKEND_API_BASE_REQUIRED", "api_base_url is required.")

    parsed = urlparse(base_url)
    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"} or not parsed.hostname:
        _raise_api_error(
            400,
            "BACKEND_API_BASE_INVALID",
            "api_base_url must be an absolute http(s) URL including host.",
        )
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        _raise_api_error(
            400,
            "BACKEND_API_BASE_INVALID",
            "api_base_url must not include credentials, query, or fragment.",
        )
    return base_url.rstrip("/")


class _SuppressDocsAccessFilter(logging.Filter):
    """Filter out access logs for documentation endpoints used by health probes."""

    _SUPPRESSED_FRAGMENTS = (
        "/docs",
        "/openapi.json",
        "/redoc",
        "/v1/health",
        "/v1/backend/state",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(fragment in message for fragment in self._SUPPRESSED_FRAGMENTS)


logging.getLogger("uvicorn.access").addFilter(_SuppressDocsAccessFilter())


app = FastAPI(title="RTZR STT Delegation API", version="0.1.0")
app.include_router(google_drive_oauth_router)

_client: Optional[RTZRClient] = None
_client_lock = Lock()

_config_cache: Optional[Dict[str, Any]] = None
_config_cache_path: Optional[Path] = None
_config_lock = Lock()
_transcribe_queue_lock = Lock()
_transcribe_queue_semaphore: Optional[asyncio.Semaphore] = None
_transcribe_queue_concurrency: Optional[int] = None

SUCCESS_CODE = 0
FAILURE_CODE = -1
_FILE_TRANSCRIBE_DIRNAME = "file_transcriptions"
_BACKEND_CAPABILITY_KEYS = list(get_args(BackendCapability))
_FEATURE_KEYS = list(get_args(FeatureKey))
_LEGACY_CAPTURE_PROFILE_ID = "__legacy_stt_bridge__"
_SUMMARY_FEATURE_KEY = "artifact.summary"
_SUMMARY_REQUIRED_CAPABILITIES = {_SUMMARY_FEATURE_KEY}
_PROVIDER_RUNTIME_FEATURE_KEYS = {
    _SUMMARY_FEATURE_KEY,
    "translate.turn_final",
}
_PROVIDER_RUNTIME_SUPPORTED_AUTH_TYPES = {"none", "bearer_secret_ref", "header_token"}
_PROVIDER_RUNTIME_SUPPORTED_CREDENTIAL_KINDS = {"server_env", "operator_token"}
_PROVIDER_OPERATIONAL_HEALTH_STATUSES = {"unknown", "healthy"}
_SUMMARY_DEFAULT_TIMEOUT_MS = 30000
_SUMMARY_DEFAULT_CHAT_PATH = "/chat/completions"
_SUMMARY_PROMPT_VERSION = "2026-03-12"
_TRANSLATE_FEATURE_KEY = "translate.turn_final"
_TRANSLATE_REQUIRED_CAPABILITIES = {_TRANSLATE_FEATURE_KEY}
_TRANSLATE_DEFAULT_TIMEOUT_MS = 20000
_TRANSLATE_DEFAULT_CHAT_PATH = "/chat/completions"
_TRANSLATE_PROMPT_VERSION = "2026-03-12"


def _raise_api_error(
    status_code: int,
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    error: Dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    raise HTTPException(status_code=status_code, detail={"error": error})


def _resolve_backend_source() -> Literal["default", "override"]:
    """Resolve whether backend endpoint settings come from defaults or override file."""
    try:
        override_payload = get_backend_override()
    except RuntimeError as exc:
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")
    return "override" if override_payload else "default"


def _require_backend_admin(
    x_malsori_admin_token: Optional[str] = Header(
        default=None, alias="X-Malsori-Admin-Token"
    ),
) -> Settings:
    """Guard backend endpoint admin APIs behind explicit feature flag + optional token."""
    try:
        settings = get_settings()
    except RuntimeError as exc:
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")

    if not settings.backend_admin_enabled:
        _raise_api_error(404, "BACKEND_ADMIN_DISABLED", "Backend admin is disabled.")

    if not settings.backend_admin_token_required:
        return settings

    expected_token = (settings.backend_admin_token or "").strip()
    if not expected_token:
        logger.error(
            "BACKEND_ADMIN_ENABLED is true, BACKEND_ADMIN_TOKEN_REQUIRED is true, "
            "but BACKEND_ADMIN_TOKEN is not configured."
        )
        _raise_api_error(
            503,
            "BACKEND_ADMIN_MISCONFIGURED",
            "Backend admin endpoint is misconfigured.",
        )

    provided_token = (x_malsori_admin_token or "").strip()
    if not provided_token or not secrets.compare_digest(
        provided_token, expected_token
    ):
        _raise_api_error(
            401, "BACKEND_ADMIN_UNAUTHORIZED", "Invalid backend admin token."
        )

    return settings


@app.get("/v1/health", response_model=HealthStatusResponse)
async def health_status() -> HealthStatusResponse:
    """Operational health endpoint used by post-deploy smoke checks."""
    try:
        settings = get_settings()
    except RuntimeError as exc:
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")
    return HealthStatusResponse(
        status="ok",
        service="malsori-python-api",
        version=app.version,
        deployment=settings.deployment,
        auth_enabled=settings.auth_enabled,
        source=_resolve_backend_source(),
        backend_admin_enabled=settings.backend_admin_enabled,
        backend_admin_token_required=settings.backend_admin_token_required,
    )


@app.post("/v1/summary/full", response_model=FullSummaryResponse)
async def request_full_summary(payload: FullSummaryRequest) -> FullSummaryResponse:
    """Execute a provider-backed full-session summary using the current summary binding."""
    if not payload.turns:
        _raise_api_error(
            400,
            "SUMMARY_TRANSCRIPT_EMPTY",
            "At least one transcript turn is required to generate a full summary.",
        )

    try:
        settings = get_settings()
    except RuntimeError:
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")

    binding, resolved_profile, used_fallback = _resolve_summary_binding_target(settings)
    model = _resolve_summary_model(binding, resolved_profile)
    source_language = _detect_summary_source_language(payload)
    output_language = _resolve_summary_output_language(payload, source_language)
    requested_at = _summary_timestamp()
    summary_messages = _build_summary_provider_messages(
        payload,
        source_language=source_language,
        output_language=output_language,
    )
    fallback_profile = (
        None
        if used_fallback
        else _get_ready_fallback_profile(
            settings,
            binding.fallback_backend_profile_id,
            _SUMMARY_REQUIRED_CAPABILITIES,
            resolved_profile.id,
        )
    )
    try:
        provider_payload = await _request_summary_provider_payload(
            settings=settings,
            profile=resolved_profile,
            binding=binding,
            model=model,
            messages=summary_messages,
        )
    except HTTPException as exc:
        if fallback_profile is None or not _should_retry_provider_with_fallback(
            exc,
            {
                "SUMMARY_PROVIDER_AUTH_UNSUPPORTED",
                "SUMMARY_PROVIDER_MISCONFIGURED",
                "SUMMARY_PROVIDER_REQUEST_FAILED",
                "SUMMARY_PROVIDER_RESPONSE_INVALID",
            },
        ):
            raise
        resolved_profile = fallback_profile
        used_fallback = True
        model = _resolve_summary_model(binding, resolved_profile)
        provider_payload = await _request_summary_provider_payload(
            settings=settings,
            profile=resolved_profile,
            binding=binding,
            model=model,
            messages=summary_messages,
        )
    completion_text = _extract_summary_completion_text(provider_payload)
    title, content, blocks, supporting_snippets = _normalize_summary_provider_output(
        _parse_summary_json_payload(completion_text),
        payload,
    )
    completed_at = _summary_timestamp()

    return FullSummaryResponse(
        run_id=uuid.uuid4().hex,
        session_id=payload.session_id,
        mode="full",
        scope="session",
        trigger=payload.trigger,
        regeneration_scope=payload.regeneration_scope,
        preset_id=payload.preset.id,
        preset_version=payload.preset.version,
        selection_source=payload.selection_source,
        source_revision=payload.source_revision,
        source_language=source_language,
        output_language=output_language,
        requested_at=requested_at,
        completed_at=completed_at,
        title=title,
        content=content,
        partition_ids=[],
        supporting_snippets=supporting_snippets,
        blocks=blocks,
        binding={
            "feature_key": _SUMMARY_FEATURE_KEY,
            "resolved_backend_profile_id": resolved_profile.id,
            "fallback_backend_profile_id": binding.fallback_backend_profile_id,
            "used_fallback": used_fallback,
            "provider_label": resolved_profile.label,
            "model": model,
            "timeout_ms": _resolve_summary_timeout_ms(binding),
            "retry_policy": (
                {
                    "max_attempts": binding.retry_policy.max_attempts,
                    "backoff_ms": binding.retry_policy.backoff_ms,
                }
                if binding.retry_policy
                else None
            ),
        },
    )


@app.post(
    "/v1/translate/turn-final",
    response_model=FinalTurnTranslationResponse,
)
async def request_final_turn_translation(
    payload: FinalTurnTranslationRequest,
) -> FinalTurnTranslationResponse:
    """Execute a provider-backed final-turn translation using the current translate binding."""
    if not payload.text.strip():
        _raise_api_error(
            400,
            "TRANSLATE_TEXT_EMPTY",
            "A non-empty source turn is required to generate a translation.",
        )

    if not payload.target_language.strip():
        _raise_api_error(
            400,
            "TRANSLATE_TARGET_LANGUAGE_REQUIRED",
            "A target language is required to generate a translation.",
        )

    try:
        settings = get_settings()
    except RuntimeError:
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")

    binding, resolved_profile, used_fallback = _resolve_translate_binding_target(
        settings
    )
    model = _resolve_translate_model(binding, resolved_profile)
    source_language = _detect_translate_source_language(payload)
    target_language = _resolve_translate_target_language(payload)
    requested_at = _summary_timestamp()
    translate_messages = _build_translate_provider_messages(
        payload,
        source_language=source_language,
        target_language=target_language,
    )
    fallback_profile = (
        None
        if used_fallback
        else _get_ready_fallback_profile(
            settings,
            binding.fallback_backend_profile_id,
            _TRANSLATE_REQUIRED_CAPABILITIES,
            resolved_profile.id,
        )
    )
    try:
        provider_payload = await _request_translate_provider_payload(
            settings=settings,
            profile=resolved_profile,
            binding=binding,
            model=model,
            messages=translate_messages,
        )
    except HTTPException as exc:
        if fallback_profile is None or not _should_retry_provider_with_fallback(
            exc,
            {
                "TRANSLATE_PROVIDER_AUTH_UNSUPPORTED",
                "TRANSLATE_PROVIDER_MISCONFIGURED",
                "TRANSLATE_PROVIDER_REQUEST_FAILED",
                "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            },
        ):
            raise
        resolved_profile = fallback_profile
        used_fallback = True
        model = _resolve_translate_model(binding, resolved_profile)
        provider_payload = await _request_translate_provider_payload(
            settings=settings,
            profile=resolved_profile,
            binding=binding,
            model=model,
            messages=translate_messages,
        )
    translated_text, normalized_source_language = _normalize_translate_provider_output(
        _parse_translate_json_payload(
            _extract_translate_completion_text(provider_payload)
        ),
        payload,
        source_language=source_language,
        target_language=target_language,
    )
    completed_at = _summary_timestamp()

    return FinalTurnTranslationResponse(
        translation_id=uuid.uuid4().hex,
        session_id=payload.session_id,
        turn_id=payload.turn_id,
        scope="turn",
        source_revision=payload.source_revision,
        source_language=normalized_source_language,
        target_language=target_language,
        requested_at=requested_at,
        completed_at=completed_at,
        text=translated_text,
        binding={
            "feature_key": _TRANSLATE_FEATURE_KEY,
            "resolved_backend_profile_id": resolved_profile.id,
            "fallback_backend_profile_id": binding.fallback_backend_profile_id,
            "used_fallback": used_fallback,
            "provider_label": resolved_profile.label,
            "model": model,
            "timeout_ms": _resolve_translate_timeout_ms(binding),
            "retry_policy": (
                {
                    "max_attempts": binding.retry_policy.max_attempts,
                    "backoff_ms": binding.retry_policy.backoff_ms,
                }
                if binding.retry_policy
                else None
            ),
        },
    )


@app.post(
    "/v1/observability/runtime-error",
    response_model=FrontendRuntimeErrorAck,
    status_code=202,
)
async def ingest_frontend_runtime_error(
    payload: FrontendRuntimeErrorReport,
) -> FrontendRuntimeErrorAck:
    """Ingest a browser runtime error report for operational triage."""
    event_id = uuid.uuid4().hex[:12]

    logger.error(
        (
            "frontend-runtime-error event_id=%s kind=%s route=%s page_url=%s locale=%s "
            "app_version=%s message=%s stack=%s user_agent=%s"
        ),
        event_id,
        payload.kind,
        _truncate_log_text(payload.route, 300),
        _truncate_log_text(payload.page_url, 700),
        _truncate_log_text(payload.locale, 48),
        _truncate_log_text(payload.app_version, 96),
        _truncate_log_text(payload.message, 1000),
        _truncate_log_text(payload.stack, 2000),
        _truncate_log_text(payload.user_agent, 300),
    )

    return FrontendRuntimeErrorAck(event_id=event_id)


@app.get("/v1/backend/endpoint", response_model=BackendEndpointState)
async def get_backend_endpoint(
    settings: Settings = Depends(_require_backend_admin),
) -> BackendEndpointState:
    """Return the current upstream endpoint configuration."""
    source = _resolve_backend_source()
    return _build_backend_state(settings, source)


@app.get("/v1/backend/state", response_model=BackendEndpointState)
async def get_backend_state_legacy(
    settings: Settings = Depends(_require_backend_admin),
) -> BackendEndpointState:
    """Backward-compatible alias for backend endpoint state."""
    source = _resolve_backend_source()
    return _build_backend_state(settings, source)


@app.post("/v1/backend/endpoint", response_model=BackendEndpointState)
async def set_backend_endpoint(
    payload: BackendEndpointUpdateRequest,
    _: Settings = Depends(_require_backend_admin),
) -> BackendEndpointState:
    """Persist a new upstream endpoint configuration."""
    base_url = _normalize_backend_api_base_url(payload.api_base_url)
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
        _raise_api_error(
            500, "BACKEND_OVERRIDE_APPLY_FAILED", "Failed to apply backend override."
        )
    _reset_client()
    try:
        source = _resolve_backend_source()
    except HTTPException:  # pragma: no cover - defensive
        logger.warning("Failed to read override payload after update, fallback to override source.")
        source = "override"
    return _build_backend_state(settings, source)


@app.delete("/v1/backend/endpoint", response_model=BackendEndpointState)
async def reset_backend_endpoint(
    _: Settings = Depends(_require_backend_admin),
) -> BackendEndpointState:
    """Remove the override file and revert to server defaults."""
    try:
        settings = clear_backend_override()
    except RuntimeError as exc:
        _raise_api_error(
            500, "BACKEND_OVERRIDE_CLEAR_FAILED", "Failed to clear backend override."
        )
    _reset_client()
    return _build_backend_state(settings, "default")


def _normalize_backend_profile_record(
    payload: BackendProfileRecord,
) -> BackendProfileRecord:
    credential_ref = payload.auth_strategy.credential_ref
    metadata = {
        key.strip(): value.strip()
        for key, value in payload.metadata.items()
        if key.strip() and value.strip()
    }
    data: Dict[str, Any] = {
        "id": payload.id.strip(),
        "label": payload.label.strip(),
        "kind": payload.kind,
        "base_url": _normalize_backend_api_base_url(payload.base_url),
        "transport": payload.transport,
        "auth_strategy": {
            "type": payload.auth_strategy.type,
            "credential_ref": (
                {
                    "kind": credential_ref.kind,
                    "id": credential_ref.id.strip(),
                    "field": credential_ref.field.strip() if credential_ref.field else None,
                }
                if credential_ref
                else None
            ),
        },
        "capabilities": sorted(set(payload.capabilities)),
        "default_model": payload.default_model.strip() if payload.default_model else None,
        "enabled": payload.enabled,
        "metadata": metadata,
        "health": {
            "status": payload.health.status,
            "checked_at": payload.health.checked_at,
            "message": payload.health.message.strip() if payload.health.message else None,
        },
    }
    normalized = BackendProfileRecord.model_validate(data)
    provider_contract_error = _provider_runtime_profile_contract_error(normalized)
    if provider_contract_error:
        raise ValueError(provider_contract_error)
    return normalized


_PROFILE_HEALTH_TIMEOUT = (3.0, 5.0)
_PROFILE_HEALTH_HEADERS = {
    "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
    "User-Agent": "malsori-backend-health/1.0",
}


def _backend_health_checked_at() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _build_backend_profile_health_snapshot(
    *,
    status: Literal["unknown", "healthy", "degraded", "unreachable", "misconfigured"],
    checked_at: str,
    message: str,
) -> BackendHealthSnapshotModel:
    return BackendHealthSnapshotModel(
        status=status,
        checked_at=checked_at,
        message=message.strip() or None,
    )


def _profile_uses_provider_runtime(profile: BackendProfileRecord) -> bool:
    return any(
        capability in _PROVIDER_RUNTIME_FEATURE_KEYS
        for capability in profile.capabilities
    )


def _provider_runtime_profile_contract_error(
    profile: BackendProfileRecord,
) -> Optional[str]:
    if not _profile_uses_provider_runtime(profile):
        return None

    if profile.transport != "http":
        return (
            "Provider-backed summary/translate profiles currently support only http transport."
        )

    auth_type = profile.auth_strategy.type
    if auth_type not in _PROVIDER_RUNTIME_SUPPORTED_AUTH_TYPES:
        return (
            "Provider-backed summary/translate profiles currently support only "
            "`none`, `bearer_secret_ref`, or `header_token` auth strategies."
        )

    if auth_type == "none":
        return None

    credential_ref = profile.auth_strategy.credential_ref
    if credential_ref is None:
        return "Auth strategy requires a credential reference before the backend can be used."

    if credential_ref.kind not in _PROVIDER_RUNTIME_SUPPORTED_CREDENTIAL_KINDS:
        return (
            "Provider-backed summary/translate profiles currently support only "
            "`server_env` or `operator_token` credential references."
        )

    return None


def _provider_runtime_profile_readiness_error(
    settings: Settings,
    profile: BackendProfileRecord,
) -> Optional[str]:
    contract_error = _provider_runtime_profile_contract_error(profile)
    if contract_error:
        return contract_error

    auth_type = profile.auth_strategy.type
    credential_ref = profile.auth_strategy.credential_ref
    if auth_type not in {"bearer_secret_ref", "header_token"} or credential_ref is None:
        return None

    if credential_ref.kind == "server_env":
        env_name = credential_ref.id.strip()
        if not env_name:
            return "Credential reference must include a server environment variable name."
        if (os.environ.get(env_name) or "").strip():
            return None
        return (
            f"Server environment credential `{env_name}` is missing, so runtime cannot use this backend."
        )

    if credential_ref.kind == "operator_token":
        if (settings.backend_admin_token or "").strip():
            return None
        return "Operator token auth is selected but BACKEND_ADMIN_TOKEN is not configured."

    return None


def _probe_backend_profile_health(
    settings: Settings,
    profile: BackendProfileRecord,
) -> BackendHealthSnapshotModel:
    checked_at = _backend_health_checked_at()

    if not profile.enabled:
        return _build_backend_profile_health_snapshot(
            status="unknown",
            checked_at=checked_at,
            message="Profile is disabled. Runtime will not route traffic here until it is enabled.",
        )

    if (
        profile.auth_strategy.type in {"bearer_secret_ref", "header_token"}
        and profile.auth_strategy.credential_ref is None
    ):
        return _build_backend_profile_health_snapshot(
            status="misconfigured",
            checked_at=checked_at,
            message="Auth strategy requires a credential reference before the backend can be used.",
        )

    provider_runtime_error = _provider_runtime_profile_readiness_error(settings, profile)
    if provider_runtime_error:
        return _build_backend_profile_health_snapshot(
            status="misconfigured",
            checked_at=checked_at,
            message=provider_runtime_error,
        )

    if profile.transport != "http":
        return _build_backend_profile_health_snapshot(
            status="unknown",
            checked_at=checked_at,
            message=(
                f"Automatic {profile.transport} health probes are not configured yet. "
                "Review the endpoint, credentials, and recent failures manually."
            ),
        )

    try:
        response = requests.head(
            profile.base_url,
            headers=_PROFILE_HEALTH_HEADERS,
            timeout=_PROFILE_HEALTH_TIMEOUT,
            allow_redirects=True,
            verify=settings.verify_ssl,
        )
        if response.status_code in {405, 501}:
            response = requests.get(
                profile.base_url,
                headers=_PROFILE_HEALTH_HEADERS,
                timeout=_PROFILE_HEALTH_TIMEOUT,
                allow_redirects=True,
                verify=settings.verify_ssl,
            )
    except requests.exceptions.SSLError as exc:
        return _build_backend_profile_health_snapshot(
            status="misconfigured",
            checked_at=checked_at,
            message=f"SSL verification failed while probing the backend: {exc}",
        )
    except requests.Timeout as exc:
        return _build_backend_profile_health_snapshot(
            status="unreachable",
            checked_at=checked_at,
            message=f"Health probe timed out while reaching the backend: {exc}",
        )
    except requests.RequestException as exc:
        return _build_backend_profile_health_snapshot(
            status="unreachable",
            checked_at=checked_at,
            message=f"Health probe failed before the backend responded: {exc}",
        )

    status_code = response.status_code
    reason = response.reason.strip() if response.reason else ""
    message_suffix = f" ({reason})" if reason else ""

    if 200 <= status_code < 400:
        return _build_backend_profile_health_snapshot(
            status="healthy",
            checked_at=checked_at,
            message=f"Health probe reached the backend and received HTTP {status_code}{message_suffix}.",
        )

    if 400 <= status_code < 500:
        return _build_backend_profile_health_snapshot(
            status="misconfigured",
            checked_at=checked_at,
            message=(
                "Health probe reached the backend but received "
                f"HTTP {status_code}{message_suffix}. Review the base URL, path, or credentials."
            ),
        )

    return _build_backend_profile_health_snapshot(
        status="degraded",
        checked_at=checked_at,
        message=(
            "Health probe reached the backend but the upstream returned "
            f"HTTP {status_code}{message_suffix}."
        ),
    )


def _refresh_backend_profile_health(
    settings: Settings, profile: BackendProfileRecord
) -> BackendProfileRecord:
    refreshed_health = _probe_backend_profile_health(settings, profile)
    refreshed_profile = profile.model_copy(
        update={"health": refreshed_health},
        deep=True,
    )
    upsert_backend_profile(settings.storage_base_dir, refreshed_profile)
    return refreshed_profile


def _summary_timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def _backend_profile_supports_capabilities(
    profile: BackendProfileRecord, required_capabilities: set[str]
) -> bool:
    return required_capabilities.issubset(set(profile.capabilities))


def _backend_profile_is_operational(profile: BackendProfileRecord) -> bool:
    return (
        profile.enabled
        and profile.health.status in _PROVIDER_OPERATIONAL_HEALTH_STATUSES
    )


def _backend_profile_is_ready_for_feature(
    settings: Settings,
    profile: BackendProfileRecord,
    required_capabilities: set[str],
) -> bool:
    return (
        _backend_profile_supports_capabilities(profile, required_capabilities)
        and _backend_profile_is_operational(profile)
        and _provider_runtime_profile_readiness_error(settings, profile) is None
    )


def _get_ready_fallback_profile(
    settings: Settings,
    fallback_profile_id: Optional[str],
    required_capabilities: set[str],
    selected_profile_id: Optional[str] = None,
) -> Optional[BackendProfileRecord]:
    if not fallback_profile_id or fallback_profile_id == selected_profile_id:
        return None
    fallback_profile = get_backend_profile(settings.storage_base_dir, fallback_profile_id)
    if fallback_profile is None:
        return None
    if not _backend_profile_is_ready_for_feature(
        settings, fallback_profile, required_capabilities
    ):
        return None
    return fallback_profile


def _api_error_code(exc: HTTPException) -> Optional[str]:
    detail = exc.detail
    if not isinstance(detail, dict):
        return None
    error = detail.get("error")
    if not isinstance(error, dict):
        return None
    code = error.get("code")
    return code if isinstance(code, str) else None


def _should_retry_provider_with_fallback(
    exc: HTTPException, allowed_codes: set[str]
) -> bool:
    if exc.status_code < 500:
        return False
    return (_api_error_code(exc) or "") in allowed_codes


def _resolve_summary_binding_target(
    settings: Settings,
) -> tuple[FeatureBindingRecord, BackendProfileRecord, bool]:
    binding = get_feature_binding(settings.storage_base_dir, _SUMMARY_FEATURE_KEY)
    if binding is None:
        _raise_api_error(
            503,
            "SUMMARY_BINDING_NOT_READY",
            "Full summary is not configured yet.",
            {"reason": "binding_missing"},
        )

    if not binding.enabled:
        _raise_api_error(
            503,
            "SUMMARY_BINDING_NOT_READY",
            "Full summary is disabled by the current binding.",
            {"reason": "binding_disabled"},
        )

    primary_profile = get_backend_profile(
        settings.storage_base_dir, binding.primary_backend_profile_id
    )
    if primary_profile is None:
        _raise_api_error(
            503,
            "SUMMARY_BINDING_NOT_READY",
            "The configured primary summary backend profile could not be found.",
            {"reason": "profile_missing"},
        )

    primary_ready = _backend_profile_is_ready_for_feature(
        settings, primary_profile, _SUMMARY_REQUIRED_CAPABILITIES
    )

    if primary_ready:
        return binding, primary_profile, False

    fallback_profile = _get_ready_fallback_profile(
        settings,
        binding.fallback_backend_profile_id,
        _SUMMARY_REQUIRED_CAPABILITIES,
        primary_profile.id,
    )
    fallback_ready = fallback_profile is not None

    if fallback_ready:
        return binding, fallback_profile, True

    if not _backend_profile_supports_capabilities(
        primary_profile, _SUMMARY_REQUIRED_CAPABILITIES
    ):
        _raise_api_error(
            503,
            "SUMMARY_BINDING_NOT_READY",
            "The configured summary backend does not advertise the summary capability.",
            {"reason": "capability_mismatch"},
        )

    provider_runtime_error = _provider_runtime_profile_readiness_error(
        settings, primary_profile
    )
    if provider_runtime_error:
        _raise_api_error(
            503,
            "SUMMARY_BINDING_NOT_READY",
            "The configured summary backend is misconfigured right now.",
            {
                "reason": "primary_misconfigured",
                "message": provider_runtime_error,
            },
        )

    _raise_api_error(
        503,
        "SUMMARY_BINDING_NOT_READY",
        "The configured summary backend is not operational right now.",
        {"reason": "primary_unhealthy"},
    )


def _resolve_summary_credential_value(
    settings: Settings,
    profile: BackendProfileRecord,
) -> str:
    credential_ref = profile.auth_strategy.credential_ref
    if credential_ref is None:
        _raise_api_error(
            503,
            "SUMMARY_PROVIDER_MISCONFIGURED",
            "The summary backend requires a credential reference before it can be used.",
        )

    if credential_ref.kind == "server_env":
        env_name = credential_ref.id.strip()
        token = (os.environ.get(env_name) or "").strip()
        if token:
            return token
        _raise_api_error(
            503,
            "SUMMARY_PROVIDER_MISCONFIGURED",
            "The summary backend credential is missing from the server environment.",
            {"env_name": env_name},
        )

    if credential_ref.kind == "operator_token":
        token = (settings.backend_admin_token or "").strip()
        if token:
            return token
        _raise_api_error(
            503,
            "SUMMARY_PROVIDER_MISCONFIGURED",
            "The operator token is not configured for summary backend authentication.",
        )

    _raise_api_error(
        503,
        "SUMMARY_PROVIDER_AUTH_UNSUPPORTED",
        "The current summary credential source is not supported yet.",
        {"credential_kind": credential_ref.kind},
    )


def _build_summary_auth_headers(
    settings: Settings, profile: BackendProfileRecord
) -> dict[str, str]:
    auth_type = profile.auth_strategy.type
    if auth_type == "none":
        return {}

    if auth_type == "bearer_secret_ref":
        token = _resolve_summary_credential_value(settings, profile)
        return {"Authorization": f"Bearer {token}"}

    if auth_type == "header_token":
        token = _resolve_summary_credential_value(settings, profile)
        header_name = (
            profile.metadata.get("auth_header_name", "Authorization").strip()
            or "Authorization"
        )
        header_prefix = profile.metadata.get("auth_header_prefix", "").strip()
        header_value = f"{header_prefix} {token}".strip() if header_prefix else token
        return {header_name: header_value}

    _raise_api_error(
        503,
        "SUMMARY_PROVIDER_AUTH_UNSUPPORTED",
        "The configured summary backend auth strategy is not supported yet.",
        {"auth_type": auth_type},
    )


def _resolve_summary_model(
    binding: FeatureBindingRecord, profile: BackendProfileRecord
) -> str:
    model = (binding.model_override or profile.default_model or "").strip()
    if model:
        return model
    _raise_api_error(
        503,
        "SUMMARY_PROVIDER_MISCONFIGURED",
        "A summary model must be configured on the binding or backend profile.",
    )


def _resolve_summary_timeout_ms(binding: FeatureBindingRecord) -> int:
    if binding.timeout_ms is not None and binding.timeout_ms > 0:
        return binding.timeout_ms
    return _SUMMARY_DEFAULT_TIMEOUT_MS


def _resolve_summary_retry_attempts(binding: FeatureBindingRecord) -> int:
    if binding.retry_policy is None:
        return 1
    return max(1, binding.retry_policy.max_attempts)


def _resolve_summary_backoff_seconds(binding: FeatureBindingRecord) -> float:
    if binding.retry_policy is None or binding.retry_policy.backoff_ms <= 0:
        return 0.0
    return binding.retry_policy.backoff_ms / 1000.0


def _resolve_summary_chat_path(profile: BackendProfileRecord) -> str:
    configured = (
        profile.metadata.get("chat_completions_path")
        or profile.metadata.get("chat_path")
        or _SUMMARY_DEFAULT_CHAT_PATH
    ).strip()
    if not configured:
        return _SUMMARY_DEFAULT_CHAT_PATH
    return configured if configured.startswith("/") else f"/{configured}"


def _detect_summary_source_language(payload: FullSummaryRequest) -> Optional[str]:
    explicit = (payload.source_language or "").strip()
    if explicit:
        return explicit

    counts: dict[str, int] = {}
    for turn in payload.turns:
        language = (turn.language or "").strip()
        if not language:
            continue
        counts[language] = counts.get(language, 0) + 1

    if not counts:
        return None
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def _resolve_summary_output_language(
    payload: FullSummaryRequest, source_language: Optional[str]
) -> Optional[str]:
    explicit = (payload.output_language or "").strip()
    if explicit:
        return explicit

    preset_language = (payload.preset.language or "").strip()
    if preset_language and preset_language.lower() != "auto":
        return preset_language
    return source_language


def _build_summary_provider_messages(
    payload: FullSummaryRequest,
    source_language: Optional[str],
    output_language: Optional[str],
) -> list[dict[str, str]]:
    preset_schema = [
        {
            "id": section.id,
            "label": section.label,
            "kind": section.kind,
            "required": section.required,
        }
        for section in payload.preset.output_schema
    ]
    turns = [
        {
            "id": turn.id,
            "speakerLabel": turn.speaker_label,
            "language": turn.language,
            "startMs": turn.start_ms,
            "endMs": turn.end_ms,
            "text": turn.text,
        }
        for turn in payload.turns
    ]
    system_prompt = (
        "You create full-session summaries from transcript turns. "
        "Return only valid JSON with the shape "
        '{"title": string, "blocks": [{"id": string, "title": string, "content": string | string[], '
        '"source_turn_ids": string[]}]} '
        "Do not wrap the JSON in markdown. "
        "Use only block ids from the preset schema, keep their order, and only cite turn ids that appear in the transcript."
    )
    user_prompt = json.dumps(
        {
            "promptVersion": _SUMMARY_PROMPT_VERSION,
            "session": {
                "id": payload.session_id,
                "title": payload.title,
                "sourceRevision": payload.source_revision,
                "sourceLanguage": source_language,
                "outputLanguage": output_language,
                "trigger": payload.trigger,
                "regenerationScope": payload.regeneration_scope,
            },
            "preset": {
                "id": payload.preset.id,
                "version": payload.preset.version,
                "label": payload.preset.label,
                "description": payload.preset.description,
                "language": payload.preset.language,
                "outputSchema": preset_schema,
            },
            "transcriptTurns": turns,
        },
        ensure_ascii=False,
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _extract_summary_completion_text(response_payload: Any) -> str:
    if not isinstance(response_payload, dict):
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider returned an invalid response payload.",
        )

    choices = response_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider response did not include any choices.",
        )

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider returned an invalid choice payload.",
        )

    message = first_choice.get("message")
    if not isinstance(message, dict):
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider response did not include a message payload.",
        )

    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    if isinstance(content, list):
        fragments: list[str] = []
        for item in content:
            if isinstance(item, str) and item.strip():
                fragments.append(item.strip())
            elif isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    fragments.append(text.strip())
        combined = "\n".join(fragment for fragment in fragments if fragment)
        if combined.strip():
            return combined.strip()

    _raise_api_error(
        502,
        "SUMMARY_PROVIDER_RESPONSE_INVALID",
        "The summary provider returned an empty completion message.",
    )


def _parse_summary_json_payload(text: str) -> Any:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    with contextlib.suppress(json.JSONDecodeError):
        return json.loads(stripped)

    decoder = json.JSONDecoder()
    for index, char in enumerate(stripped):
        if char not in "{[":
            continue
        with contextlib.suppress(json.JSONDecodeError):
            payload, _ = decoder.raw_decode(stripped[index:])
            return payload

    _raise_api_error(
        502,
        "SUMMARY_PROVIDER_RESPONSE_INVALID",
        "The summary provider did not return valid JSON output.",
    )


def _coerce_summary_block_content(raw_content: Any, section_kind: str) -> str:
    if isinstance(raw_content, str):
        return raw_content.strip()

    if isinstance(raw_content, list):
        lines: list[str] = []
        for item in raw_content:
            if isinstance(item, str) and item.strip():
                lines.append(item.strip())
            elif isinstance(item, dict):
                text = item.get("text") or item.get("content") or item.get("quote")
                if isinstance(text, str) and text.strip():
                    lines.append(text.strip())
        if not lines:
            return ""
        if section_kind == "narrative":
            return " ".join(lines)
        prefix = "> " if section_kind == "quote_list" else "- "
        return "\n".join(f"{prefix}{line}" for line in lines)

    return ""


def _coerce_summary_turn_ids(raw_value: Any) -> list[str]:
    if isinstance(raw_value, list):
        return [
            str(item).strip()
            for item in raw_value
            if isinstance(item, (str, int)) and str(item).strip()
        ]
    if isinstance(raw_value, str) and raw_value.strip():
        return [raw_value.strip()]
    return []


def _build_summary_supporting_snippets(
    block_id: str,
    turn_ids: list[str],
    turns_by_id: dict[str, Any],
) -> list[SummarySupportingSnippetModel]:
    snippets: list[SummarySupportingSnippetModel] = []
    seen_turn_ids: set[str] = set()

    for index, turn_id in enumerate(turn_ids):
        if turn_id in seen_turn_ids:
            continue
        seen_turn_ids.add(turn_id)
        turn = turns_by_id.get(turn_id)
        if turn is None:
            continue
        snippets.append(
            SummarySupportingSnippetModel(
                id=f"{block_id}:{turn.id}:{index}",
                turn_id=turn.id,
                speaker_label=turn.speaker_label,
                start_ms=turn.start_ms,
                end_ms=turn.end_ms,
                text=turn.text,
            )
        )
        if len(snippets) >= 3:
            break

    return snippets


def _compose_summary_content(blocks: list[SummaryBlockResultModel]) -> str:
    lines = [
        f"{block.title}: {block.content}" if block.title else block.content
        for block in blocks
        if block.content.strip()
    ]
    return "\n".join(lines).strip()


def _normalize_summary_provider_output(
    payload: Any,
    request_payload: FullSummaryRequest,
) -> tuple[str, str, list[SummaryBlockResultModel], list[SummarySupportingSnippetModel]]:
    if not isinstance(payload, dict):
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider JSON output must be an object.",
        )

    turns_by_id = {turn.id: turn for turn in request_payload.turns}
    raw_blocks = payload.get("blocks")
    if isinstance(raw_blocks, dict):
        raw_blocks = [
            (
                {"id": key, **value}
                if isinstance(value, dict)
                else {"id": key, "content": value}
            )
            for key, value in raw_blocks.items()
        ]
    if not isinstance(raw_blocks, list):
        raw_blocks = []

    raw_blocks_by_id: dict[str, dict[str, Any]] = {}
    for raw_block in raw_blocks:
        if not isinstance(raw_block, dict):
            continue
        raw_id = raw_block.get("id") or raw_block.get("kind")
        if isinstance(raw_id, str) and raw_id.strip():
            raw_blocks_by_id[raw_id.strip()] = raw_block

    blocks: list[SummaryBlockResultModel] = []
    for section in request_payload.preset.output_schema:
        raw_block = raw_blocks_by_id.get(section.id, {})
        block_content = _coerce_summary_block_content(
            raw_block.get("content")
            if isinstance(raw_block, dict) and "content" in raw_block
            else (
                raw_block.get("items")
                if isinstance(raw_block, dict) and "items" in raw_block
                else raw_block.get("quotes")
                if isinstance(raw_block, dict) and "quotes" in raw_block
                else raw_block.get("bullets")
                if isinstance(raw_block, dict)
                else None
            ),
            section.kind,
        )
        if not block_content:
            continue
        supporting_snippets = _build_summary_supporting_snippets(
            section.id,
            _coerce_summary_turn_ids(
                raw_block.get("source_turn_ids")
                if isinstance(raw_block, dict)
                else None
            ),
            turns_by_id,
        )
        blocks.append(
            SummaryBlockResultModel(
                id=section.id,
                kind=section.id,
                title=(
                    raw_block.get("title").strip()
                    if isinstance(raw_block, dict)
                    and isinstance(raw_block.get("title"), str)
                    and raw_block.get("title").strip()
                    else section.label
                ),
                content=block_content,
                supporting_snippets=supporting_snippets,
            )
        )

    if not blocks:
        fallback_content = _coerce_summary_block_content(
            payload.get("summary") or payload.get("content") or payload.get("overview"),
            "narrative",
        )
        if not fallback_content:
            _raise_api_error(
                502,
                "SUMMARY_PROVIDER_RESPONSE_INVALID",
                "The summary provider JSON output did not include any usable blocks.",
            )
        fallback_section = (
            request_payload.preset.output_schema[0]
            if request_payload.preset.output_schema
            else None
        )
        blocks.append(
            SummaryBlockResultModel(
                id=fallback_section.id if fallback_section else "overview",
                kind=fallback_section.id if fallback_section else "overview",
                title=fallback_section.label if fallback_section else request_payload.preset.label,
                content=fallback_content,
                supporting_snippets=[],
            )
        )

    deduped_snippets: list[SummarySupportingSnippetModel] = []
    seen_snippet_ids: set[str] = set()
    for block in blocks:
        for snippet in block.supporting_snippets:
            if snippet.id in seen_snippet_ids:
                continue
            seen_snippet_ids.add(snippet.id)
            deduped_snippets.append(snippet)

    title = (
        payload.get("title").strip()
        if isinstance(payload.get("title"), str) and payload.get("title").strip()
        else f"{request_payload.preset.label} summary"
    )
    content = _compose_summary_content(blocks)
    if not content:
        _raise_api_error(
            502,
            "SUMMARY_PROVIDER_RESPONSE_INVALID",
            "The summary provider did not return any summary content.",
        )

    return title, content, blocks, deduped_snippets


async def _request_summary_provider_payload(
    *,
    settings: Settings,
    profile: BackendProfileRecord,
    binding: FeatureBindingRecord,
    model: str,
    messages: list[dict[str, str]],
) -> Any:
    request_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        **_build_summary_auth_headers(settings, profile),
    }
    timeout_seconds = max(1.0, _resolve_summary_timeout_ms(binding) / 1000.0)
    retry_attempts = _resolve_summary_retry_attempts(binding)
    backoff_seconds = _resolve_summary_backoff_seconds(binding)
    request_url = f"{profile.base_url}{_resolve_summary_chat_path(profile)}"
    request_body = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }

    last_error_message = "Summary provider request failed."

    async with httpx.AsyncClient(
        verify=settings.verify_ssl,
        http2=True,
        follow_redirects=False,
    ) as client:
        for attempt in range(retry_attempts):
            try:
                response = await client.post(
                    request_url,
                    headers=request_headers,
                    json=request_body,
                    timeout=timeout_seconds,
                )
            except httpx.TimeoutException:
                last_error_message = "Summary provider request timed out."
            except httpx.RequestError as exc:
                last_error_message = f"Summary provider request failed: {exc}"
            else:
                if response.status_code in {408, 429} or response.status_code >= 500:
                    body_preview = _truncate_log_text(response.text, 400)
                    last_error_message = (
                        "Summary provider could not complete the request: "
                        f"HTTP {response.status_code}"
                        + (f" ({body_preview})" if body_preview else "")
                    )
                elif response.status_code >= 400:
                    body_preview = _truncate_log_text(response.text, 400)
                    _raise_api_error(
                        502,
                        "SUMMARY_PROVIDER_REQUEST_FAILED",
                        "The summary provider rejected the request. Check the configured model, path, or credentials.",
                        {
                            "status_code": response.status_code,
                            "response_body": body_preview,
                        },
                    )
                else:
                    with contextlib.suppress(ValueError):
                        return response.json()
                    _raise_api_error(
                        502,
                        "SUMMARY_PROVIDER_RESPONSE_INVALID",
                        "The summary provider returned a non-JSON response.",
                    )

            if attempt + 1 < retry_attempts and backoff_seconds > 0:
                await asyncio.sleep(backoff_seconds)

    _raise_api_error(
        502,
        "SUMMARY_PROVIDER_REQUEST_FAILED",
        "The summary provider could not complete the request.",
        {"detail": last_error_message},
    )


def _resolve_translate_binding_target(
    settings: Settings,
) -> tuple[FeatureBindingRecord, BackendProfileRecord, bool]:
    binding = get_feature_binding(settings.storage_base_dir, _TRANSLATE_FEATURE_KEY)
    if binding is None:
        _raise_api_error(
            503,
            "TRANSLATE_BINDING_NOT_READY",
            "Final-turn translation is not configured yet.",
            {"reason": "binding_missing"},
        )

    if not binding.enabled:
        _raise_api_error(
            503,
            "TRANSLATE_BINDING_NOT_READY",
            "Final-turn translation is disabled by the current binding.",
            {"reason": "binding_disabled"},
        )

    primary_profile = get_backend_profile(
        settings.storage_base_dir, binding.primary_backend_profile_id
    )
    if primary_profile is None:
        _raise_api_error(
            503,
            "TRANSLATE_BINDING_NOT_READY",
            "The configured primary translate backend profile could not be found.",
            {"reason": "profile_missing"},
        )

    primary_ready = _backend_profile_is_ready_for_feature(
        settings, primary_profile, _TRANSLATE_REQUIRED_CAPABILITIES
    )
    if primary_ready:
        return binding, primary_profile, False

    fallback_profile = _get_ready_fallback_profile(
        settings,
        binding.fallback_backend_profile_id,
        _TRANSLATE_REQUIRED_CAPABILITIES,
        primary_profile.id,
    )
    fallback_ready = fallback_profile is not None
    if fallback_ready:
        return binding, fallback_profile, True

    if not _backend_profile_supports_capabilities(
        primary_profile, _TRANSLATE_REQUIRED_CAPABILITIES
    ):
        _raise_api_error(
            503,
            "TRANSLATE_BINDING_NOT_READY",
            "The configured translate backend does not advertise the final-turn translation capability.",
            {"reason": "capability_mismatch"},
        )

    provider_runtime_error = _provider_runtime_profile_readiness_error(
        settings, primary_profile
    )
    if provider_runtime_error:
        _raise_api_error(
            503,
            "TRANSLATE_BINDING_NOT_READY",
            "The configured translate backend is misconfigured right now.",
            {
                "reason": "primary_misconfigured",
                "message": provider_runtime_error,
            },
        )

    _raise_api_error(
        503,
        "TRANSLATE_BINDING_NOT_READY",
        "The configured translate backend is not operational right now.",
        {"reason": "primary_unhealthy"},
    )


def _resolve_translate_credential_value(
    settings: Settings,
    profile: BackendProfileRecord,
) -> str:
    credential_ref = profile.auth_strategy.credential_ref
    if credential_ref is None:
        _raise_api_error(
            503,
            "TRANSLATE_PROVIDER_MISCONFIGURED",
            "The translate backend requires a credential reference before it can be used.",
        )

    if credential_ref.kind == "server_env":
        env_name = credential_ref.id.strip()
        token = (os.environ.get(env_name) or "").strip()
        if token:
            return token
        _raise_api_error(
            503,
            "TRANSLATE_PROVIDER_MISCONFIGURED",
            "The translate backend credential is missing from the server environment.",
            {"env_name": env_name},
        )

    if credential_ref.kind == "operator_token":
        token = (settings.backend_admin_token or "").strip()
        if token:
            return token
        _raise_api_error(
            503,
            "TRANSLATE_PROVIDER_MISCONFIGURED",
            "The operator token is not configured for translate backend authentication.",
        )

    _raise_api_error(
        503,
        "TRANSLATE_PROVIDER_AUTH_UNSUPPORTED",
        "The current translate credential source is not supported yet.",
        {"credential_kind": credential_ref.kind},
    )


def _build_translate_auth_headers(
    settings: Settings, profile: BackendProfileRecord
) -> dict[str, str]:
    auth_type = profile.auth_strategy.type
    if auth_type == "none":
        return {}

    if auth_type == "bearer_secret_ref":
        token = _resolve_translate_credential_value(settings, profile)
        return {"Authorization": f"Bearer {token}"}

    if auth_type == "header_token":
        token = _resolve_translate_credential_value(settings, profile)
        header_name = (
            profile.metadata.get("auth_header_name", "Authorization").strip()
            or "Authorization"
        )
        header_prefix = profile.metadata.get("auth_header_prefix", "").strip()
        header_value = f"{header_prefix} {token}".strip() if header_prefix else token
        return {header_name: header_value}

    _raise_api_error(
        503,
        "TRANSLATE_PROVIDER_AUTH_UNSUPPORTED",
        "The configured translate backend auth strategy is not supported yet.",
        {"auth_type": auth_type},
    )


def _resolve_translate_model(
    binding: FeatureBindingRecord, profile: BackendProfileRecord
) -> str:
    model = (binding.model_override or profile.default_model or "").strip()
    if model:
        return model
    _raise_api_error(
        503,
        "TRANSLATE_PROVIDER_MISCONFIGURED",
        "A translate model must be configured on the binding or backend profile.",
    )


def _resolve_translate_timeout_ms(binding: FeatureBindingRecord) -> int:
    if binding.timeout_ms is not None and binding.timeout_ms > 0:
        return binding.timeout_ms
    return _TRANSLATE_DEFAULT_TIMEOUT_MS


def _resolve_translate_retry_attempts(binding: FeatureBindingRecord) -> int:
    if binding.retry_policy is None:
        return 1
    return max(1, binding.retry_policy.max_attempts)


def _resolve_translate_backoff_seconds(binding: FeatureBindingRecord) -> float:
    if binding.retry_policy is None or binding.retry_policy.backoff_ms <= 0:
        return 0.0
    return binding.retry_policy.backoff_ms / 1000.0


def _resolve_translate_chat_path(profile: BackendProfileRecord) -> str:
    configured = (
        profile.metadata.get("chat_completions_path")
        or profile.metadata.get("chat_path")
        or _TRANSLATE_DEFAULT_CHAT_PATH
    ).strip()
    if not configured:
        return _TRANSLATE_DEFAULT_CHAT_PATH
    return configured if configured.startswith("/") else f"/{configured}"


def _detect_translate_source_language(
    payload: FinalTurnTranslationRequest,
) -> Optional[str]:
    explicit = (payload.source_language or "").strip()
    return explicit or None


def _resolve_translate_target_language(
    payload: FinalTurnTranslationRequest,
) -> str:
    target_language = payload.target_language.strip()
    if target_language:
        return target_language
    _raise_api_error(
        400,
        "TRANSLATE_TARGET_LANGUAGE_REQUIRED",
        "A target language is required to generate a translation.",
    )


def _build_translate_provider_messages(
    payload: FinalTurnTranslationRequest,
    source_language: Optional[str],
    target_language: str,
) -> list[dict[str, str]]:
    system_prompt = (
        "You translate final transcript turns. "
        'Return only valid JSON with the shape {"translation": string, '
        '"source_language": string | null, "target_language": string}. '
        "Do not wrap the JSON in markdown and do not add commentary."
    )
    user_prompt = json.dumps(
        {
            "promptVersion": _TRANSLATE_PROMPT_VERSION,
            "turn": {
                "sessionId": payload.session_id,
                "turnId": payload.turn_id,
                "sourceRevision": payload.source_revision,
                "speakerLabel": payload.speaker_label,
                "sourceLanguage": source_language,
                "targetLanguage": target_language,
                "startMs": payload.start_ms,
                "endMs": payload.end_ms,
                "text": payload.text,
            },
        },
        ensure_ascii=False,
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _extract_translate_completion_text(response_payload: Any) -> str:
    if not isinstance(response_payload, dict):
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider returned an invalid response payload.",
        )

    choices = response_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider response did not include any choices.",
        )

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider returned an invalid choice payload.",
        )

    message = first_choice.get("message")
    if not isinstance(message, dict):
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider response did not include a message payload.",
        )

    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    if isinstance(content, list):
        fragments: list[str] = []
        for item in content:
            if isinstance(item, str) and item.strip():
                fragments.append(item.strip())
            elif isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    fragments.append(text.strip())
        combined = "\n".join(fragment for fragment in fragments if fragment)
        if combined.strip():
            return combined.strip()

    _raise_api_error(
        502,
        "TRANSLATE_PROVIDER_RESPONSE_INVALID",
        "The translate provider returned an empty completion message.",
    )


def _parse_translate_json_payload(text: str) -> Any:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    with contextlib.suppress(json.JSONDecodeError):
        return json.loads(stripped)

    decoder = json.JSONDecoder()
    for index, char in enumerate(stripped):
        if char not in "{[":
            continue
        with contextlib.suppress(json.JSONDecodeError):
            payload, _ = decoder.raw_decode(stripped[index:])
            return payload

    _raise_api_error(
        502,
        "TRANSLATE_PROVIDER_RESPONSE_INVALID",
        "The translate provider did not return valid JSON output.",
    )


def _normalize_translate_provider_output(
    payload: Any,
    request_payload: FinalTurnTranslationRequest,
    *,
    source_language: Optional[str],
    target_language: str,
) -> tuple[str, Optional[str]]:
    if not isinstance(payload, dict):
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider JSON output must be an object.",
        )

    translated_text = (
        payload.get("translation")
        or payload.get("translated_text")
        or payload.get("text")
    )
    if not isinstance(translated_text, str) or not translated_text.strip():
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider did not return translated text.",
        )

    normalized_source_language = (
        payload.get("source_language").strip()
        if isinstance(payload.get("source_language"), str)
        and payload.get("source_language").strip()
        else source_language
    )
    normalized_target_language = (
        payload.get("target_language").strip()
        if isinstance(payload.get("target_language"), str)
        and payload.get("target_language").strip()
        else target_language
    )
    if normalized_target_language != target_language:
        _raise_api_error(
            502,
            "TRANSLATE_PROVIDER_RESPONSE_INVALID",
            "The translate provider returned an unexpected target language.",
            {
                "expected_target_language": target_language,
                "returned_target_language": normalized_target_language,
                "turn_id": request_payload.turn_id,
            },
        )

    return translated_text.strip(), normalized_source_language


async def _request_translate_provider_payload(
    *,
    settings: Settings,
    profile: BackendProfileRecord,
    binding: FeatureBindingRecord,
    model: str,
    messages: list[dict[str, str]],
) -> Any:
    request_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        **_build_translate_auth_headers(settings, profile),
    }
    timeout_seconds = max(1.0, _resolve_translate_timeout_ms(binding) / 1000.0)
    retry_attempts = _resolve_translate_retry_attempts(binding)
    backoff_seconds = _resolve_translate_backoff_seconds(binding)
    request_url = f"{profile.base_url}{_resolve_translate_chat_path(profile)}"
    request_body = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }

    last_error_message = "Translate provider request failed."

    async with httpx.AsyncClient(
        verify=settings.verify_ssl,
        http2=True,
        follow_redirects=False,
    ) as client:
        for attempt in range(retry_attempts):
            try:
                response = await client.post(
                    request_url,
                    headers=request_headers,
                    json=request_body,
                    timeout=timeout_seconds,
                )
            except httpx.TimeoutException:
                last_error_message = "Translate provider request timed out."
            except httpx.RequestError as exc:
                last_error_message = f"Translate provider request failed: {exc}"
            else:
                if response.status_code in {408, 429} or response.status_code >= 500:
                    body_preview = _truncate_log_text(response.text, 400)
                    last_error_message = (
                        "Translate provider could not complete the request: "
                        f"HTTP {response.status_code}"
                        + (f" ({body_preview})" if body_preview else "")
                    )
                elif response.status_code >= 400:
                    body_preview = _truncate_log_text(response.text, 400)
                    _raise_api_error(
                        502,
                        "TRANSLATE_PROVIDER_REQUEST_FAILED",
                        "The translate provider rejected the request. Check the configured model, path, or credentials.",
                        {
                            "status_code": response.status_code,
                            "response_body": body_preview,
                        },
                    )
                else:
                    with contextlib.suppress(ValueError):
                        return response.json()
                    _raise_api_error(
                        502,
                        "TRANSLATE_PROVIDER_RESPONSE_INVALID",
                        "The translate provider returned a non-JSON response.",
                    )

            if attempt + 1 < retry_attempts and backoff_seconds > 0:
                await asyncio.sleep(backoff_seconds)

    _raise_api_error(
        502,
        "TRANSLATE_PROVIDER_REQUEST_FAILED",
        "The translate provider could not complete the request.",
        {"detail": last_error_message},
    )


def _normalize_feature_binding_record(
    payload: FeatureBindingRecord,
) -> FeatureBindingRecord:
    retry_policy = payload.retry_policy
    data: Dict[str, Any] = {
        "feature_key": payload.feature_key,
        "primary_backend_profile_id": payload.primary_backend_profile_id.strip(),
        "fallback_backend_profile_id": (
            payload.fallback_backend_profile_id.strip()
            if payload.fallback_backend_profile_id
            else None
        ),
        "enabled": payload.enabled,
        "model_override": payload.model_override.strip() if payload.model_override else None,
        "timeout_ms": payload.timeout_ms,
        "retry_policy": (
            {
                "max_attempts": retry_policy.max_attempts,
                "backoff_ms": retry_policy.backoff_ms,
            }
            if retry_policy
            else None
        ),
        "degraded_behavior": payload.degraded_behavior,
    }
    return FeatureBindingRecord.model_validate(data)


def _build_legacy_capture_profile(
    settings: Settings, source: Literal["default", "override"]
) -> BackendProfileRecord:
    auth_strategy = BackendAuthStrategyModel(
        type="provider_native" if settings.auth_enabled else "none"
    )
    message = (
        "Derived from /v1/backend/endpoint override."
        if source == "override"
        else "Derived from server default STT configuration."
    )
    return BackendProfileRecord(
        id=_LEGACY_CAPTURE_PROFILE_ID,
        label="Legacy STT Capture Backend",
        kind="stt",
        base_url=settings.pronaia_api_base,
        transport="http",
        auth_strategy=auth_strategy,
        capabilities=["stt.file", "stt.realtime"],
        enabled=True,
        metadata={
            "legacy_source": source,
            "deployment": settings.deployment,
        },
        health=BackendHealthSnapshotModel(status="unknown", message=message),
    )


def _build_legacy_capture_bindings() -> list[FeatureBindingRecord]:
    return [
        FeatureBindingRecord(
            feature_key="capture.realtime",
            primary_backend_profile_id=_LEGACY_CAPTURE_PROFILE_ID,
            enabled=True,
        ),
        FeatureBindingRecord(
            feature_key="capture.file",
            primary_backend_profile_id=_LEGACY_CAPTURE_PROFILE_ID,
            enabled=True,
        ),
    ]


def _build_backend_capabilities_response(settings: Settings) -> BackendCapabilitiesResponse:
    source = _resolve_backend_source()
    endpoint_state = _build_backend_state(settings, source)
    legacy_profile = _build_legacy_capture_profile(settings, source)
    return BackendCapabilitiesResponse(
        capability_keys=list(_BACKEND_CAPABILITY_KEYS),
        feature_keys=list(_FEATURE_KEYS),
        compatibility=BackendBindingCompatibilityState(
            legacy_source=source,
            endpoint_state=endpoint_state,
            legacy_profiles=[legacy_profile],
            legacy_bindings=_build_legacy_capture_bindings(),
        ),
    )


@app.get("/v1/backend/profiles", response_model=BackendProfilesResponse)
async def get_backend_profiles(
    settings: Settings = Depends(_require_backend_admin),
) -> BackendProfilesResponse:
    """List operator-managed backend profiles stored separately from legacy STT overrides."""
    return BackendProfilesResponse(
        profiles=list_backend_profiles(settings.storage_base_dir)
    )


@app.get("/v1/backend/profiles/{profile_id}", response_model=BackendProfileRecord)
async def get_backend_profile_record(
    profile_id: str,
    settings: Settings = Depends(_require_backend_admin),
) -> BackendProfileRecord:
    """Return a single operator-managed backend profile."""
    profile = get_backend_profile(settings.storage_base_dir, profile_id)
    if profile is None:
        _raise_api_error(404, "BACKEND_PROFILE_NOT_FOUND", "Backend profile was not found.")
    return profile


@app.get("/v1/backend/profiles/{profile_id}/health", response_model=BackendProfileHealthResponse)
async def get_backend_profile_health(
    profile_id: str,
    refresh: bool = Query(default=False),
    settings: Settings = Depends(_require_backend_admin),
) -> BackendProfileHealthResponse:
    """Return the current or freshly revalidated health snapshot for a backend profile."""
    profile = get_backend_profile(settings.storage_base_dir, profile_id)
    if profile is None:
        _raise_api_error(404, "BACKEND_PROFILE_NOT_FOUND", "Backend profile was not found.")
    if refresh:
        profile = await asyncio.to_thread(_refresh_backend_profile_health, settings, profile)
    return BackendProfileHealthResponse(
        profile_id=profile.id,
        refreshed=refresh,
        health=profile.health,
    )


@app.put("/v1/backend/profiles/{profile_id}", response_model=BackendProfileRecord)
async def put_backend_profile(
    profile_id: str,
    payload: BackendProfileRecord,
    settings: Settings = Depends(_require_backend_admin),
) -> BackendProfileRecord:
    """Create or replace an operator-managed backend profile."""
    try:
        normalized_payload = _normalize_backend_profile_record(payload)
    except (ValidationError, ValueError) as exc:
        _raise_api_error(
            400,
            "BACKEND_PROFILE_INVALID",
            "Backend profile payload is invalid after normalization.",
            {"validation_error": str(exc)},
        )
    normalized_profile_id = profile_id.strip()
    if normalized_payload.id != normalized_profile_id:
        _raise_api_error(
            400,
            "BACKEND_PROFILE_ID_MISMATCH",
            "profile_id path parameter must match payload.id.",
        )
    return upsert_backend_profile(settings.storage_base_dir, normalized_payload)


@app.delete("/v1/backend/profiles/{profile_id}", status_code=204)
async def delete_backend_profile_record(
    profile_id: str,
    settings: Settings = Depends(_require_backend_admin),
) -> Response:
    """Delete an operator-managed backend profile."""
    deleted = delete_backend_profile(settings.storage_base_dir, profile_id)
    if not deleted:
        _raise_api_error(404, "BACKEND_PROFILE_NOT_FOUND", "Backend profile was not found.")
    return Response(status_code=204)


@app.get("/v1/backend/bindings", response_model=FeatureBindingsResponse)
async def get_backend_feature_bindings(
    settings: Settings = Depends(_require_backend_admin),
) -> FeatureBindingsResponse:
    """List operator-managed feature bindings."""
    return FeatureBindingsResponse(
        bindings=list_feature_bindings(settings.storage_base_dir)
    )


@app.get("/v1/backend/bindings/{feature_key}", response_model=FeatureBindingRecord)
async def get_backend_feature_binding(
    feature_key: str,
    settings: Settings = Depends(_require_backend_admin),
) -> FeatureBindingRecord:
    """Return a single operator-managed feature binding."""
    binding = get_feature_binding(settings.storage_base_dir, feature_key)
    if binding is None:
        _raise_api_error(404, "FEATURE_BINDING_NOT_FOUND", "Feature binding was not found.")
    return binding


@app.put("/v1/backend/bindings/{feature_key}", response_model=FeatureBindingRecord)
async def put_backend_feature_binding(
    feature_key: str,
    payload: FeatureBindingRecord,
    settings: Settings = Depends(_require_backend_admin),
) -> FeatureBindingRecord:
    """Create or replace an operator-managed feature binding."""
    try:
        normalized_payload = _normalize_feature_binding_record(payload)
    except ValidationError as exc:
        _raise_api_error(
            400,
            "FEATURE_BINDING_INVALID",
            "Feature binding payload is invalid after normalization.",
            {"validation_error": str(exc)},
        )
    normalized_feature_key = feature_key.strip()
    if normalized_payload.feature_key != normalized_feature_key:
        _raise_api_error(
            400,
            "FEATURE_BINDING_KEY_MISMATCH",
            "feature_key path parameter must match payload.feature_key.",
        )
    return upsert_feature_binding(settings.storage_base_dir, normalized_payload)


@app.delete("/v1/backend/bindings/{feature_key}", status_code=204)
async def delete_backend_feature_binding(
    feature_key: str,
    settings: Settings = Depends(_require_backend_admin),
) -> Response:
    """Delete an operator-managed feature binding."""
    deleted = delete_feature_binding(settings.storage_base_dir, feature_key)
    if not deleted:
        _raise_api_error(404, "FEATURE_BINDING_NOT_FOUND", "Feature binding was not found.")
    return Response(status_code=204)


@app.get("/v1/backend/capabilities", response_model=BackendCapabilitiesResponse)
async def get_backend_capabilities(
    settings: Settings = Depends(_require_backend_admin),
) -> BackendCapabilitiesResponse:
    """Return supported backend capabilities and legacy STT compatibility bridge info."""
    return _build_backend_capabilities_response(settings)


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
        _raise_api_error(500, "SERVER_CONFIG_ERROR", "Configuration load failed.")


def _get_transcribe_queue_semaphore(settings: Settings) -> asyncio.Semaphore:
    global _transcribe_queue_concurrency, _transcribe_queue_semaphore
    concurrency = max(1, int(settings.transcribe_queue_concurrency))
    with _transcribe_queue_lock:
        if (
            _transcribe_queue_semaphore is None
            or _transcribe_queue_concurrency != concurrency
        ):
            _transcribe_queue_semaphore = asyncio.Semaphore(concurrency)
            _transcribe_queue_concurrency = concurrency
        return _transcribe_queue_semaphore


async def _submit_transcription_queued(
    client: RTZRClient,
    settings: Settings,
    file_bytes: bytes,
    config_payload: Dict[str, Any],
    title: Optional[str],
) -> Dict[str, Any]:
    semaphore = _get_transcribe_queue_semaphore(settings)
    try:
        await asyncio.wait_for(
            semaphore.acquire(),
            timeout=settings.transcribe_queue_timeout_seconds,
        )
    except asyncio.TimeoutError:
        _raise_api_error(
            503,
            "TRANSCRIBE_QUEUE_TIMEOUT",
            "Transcription submission queue timed out.",
            {
                "concurrency": settings.transcribe_queue_concurrency,
                "timeout_seconds": settings.transcribe_queue_timeout_seconds,
            },
        )

    try:
        return await client.submit_transcription(file_bytes, config_payload, title)
    finally:
        semaphore.release()


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
        _raise_api_error(400, "FILE_EMPTY", "Uploaded file is empty.")

    config_text = (config or "").strip()
    if config_text:
        try:
            config_payload = json.loads(config_text)
        except json.JSONDecodeError as exc:
            _raise_api_error(
                400,
                "INVALID_CONFIG_JSON",
                "config JSON parsing failed.",
                {"reason": str(exc)},
            )
        if not isinstance(config_payload, dict):
            _raise_api_error(
                400, "INVALID_CONFIG_TYPE", "config must be a JSON object."
            )
    else:
        config_payload = {}

    try:
        upstream_response = await _submit_transcription_queued(
            client,
            settings,
            file_bytes,
            config_payload,
            title,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - upstream failure
        logger.exception("파일 전사 프록시 중 오류", exc_info=exc)
        _raise_api_error(
            502,
            "UPSTREAM_REQUEST_FAILED",
            "Upstream transcription request failed.",
            {"reason": str(exc)},
        )

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
        _raise_api_error(
            502,
            "UPSTREAM_STATUS_FAILED",
            "Upstream transcription status request failed.",
            {"reason": str(exc)},
        )

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
        _raise_api_error(404, "AUDIO_NOT_FOUND", "Audio is not available.")
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


async def _receive_stream_start_payload(
    websocket: WebSocket,
) -> Optional[Dict[str, Any]]:
    try:
        first = await websocket.receive()
    except WebSocketDisconnect:
        return None
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("스트리밍 start 수신 실패", exc_info=exc)
        await websocket.close(code=1011, reason="Invalid start message")
        return None

    if first.get("type") == "websocket.disconnect":
        return None

    start_text = first.get("text")
    if not start_text:
        await websocket.send_text(
            json.dumps({"type": "error", "message": "Missing start message."})
        )
        await websocket.close(code=1007, reason="Missing start message")
        return None

    try:
        start_payload = json.loads(start_text)
    except json.JSONDecodeError:
        await websocket.send_text(
            json.dumps({"type": "error", "message": "Invalid start payload."})
        )
        await websocket.close(code=1007, reason="Invalid start payload")
        return None

    if not isinstance(start_payload, dict):
        await websocket.send_text(
            json.dumps({"type": "error", "message": "Invalid start payload."})
        )
        await websocket.close(code=1007, reason="Invalid start payload")
        return None

    msg_type = _normalize_message_type(start_payload)
    if msg_type and msg_type not in {"start", "session", "start_request"}:
        await websocket.send_text(
            json.dumps(
                {"type": "error", "message": "Start message is required first."}
            )
        )
        await websocket.close(code=1007, reason="Start message required")
        return None

    return start_payload


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


def _extract_words_from_results(results: list[Any]) -> list[str]:
    """Flatten word texts from all alternatives across results."""
    words_text_fragments: list[str] = []
    for result in results:
        if not isinstance(result, dict):
            continue
        alternatives = result.get("alternatives")
        if not isinstance(alternatives, list):
            continue
        for alt in alternatives:
            if not isinstance(alt, dict):
                continue
            words = alt.get("words")
            if not isinstance(words, list):
                continue
            for word in words:
                if not isinstance(word, dict):
                    continue
                text_val = word.get("text")
                if isinstance(text_val, str) and text_val.strip():
                    words_text_fragments.append(text_val.strip())
    return words_text_fragments


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
        word_fragments = _extract_words_from_results(results)
        if word_fragments:
            payload.setdefault("raw_text", " ".join(word_fragments))
    return payload


def _grpc_error_status_name(error: BaseException) -> str:
    code_getter = getattr(error, "code", None)
    if not callable(code_getter):
        return "UNKNOWN"
    with contextlib.suppress(Exception):
        code = code_getter()
        if isinstance(code, grpc.StatusCode):
            return code.name
        if code:
            return str(code).rsplit(".", 1)[-1].upper()
    return "UNKNOWN"


def _grpc_error_details(error: BaseException) -> str:
    details_getter = getattr(error, "details", None)
    if callable(details_getter):
        with contextlib.suppress(Exception):
            details = details_getter()
            if isinstance(details, str) and details.strip():
                return details.strip()
    error_text = str(error).strip()
    return error_text or "Upstream gRPC streaming session failed."


def _grpc_terminal_error_payload(error: BaseException) -> Dict[str, Any]:
    status_name = _grpc_error_status_name(error)
    details = _grpc_error_details(error)
    return {
        "type": "error",
        "code": f"UPSTREAM_GRPC_{status_name}",
        "message": f"Upstream gRPC streaming failed: {details}",
        "retryable": False,
        "terminal": True,
        "upstream_status": status_name,
    }


async def _handle_onprem_streaming(
    websocket: WebSocket, client: RTZRClient, settings: Settings
) -> None:
    """Bridge client websocket messages to the on-prem gRPC streaming API."""
    start_payload = await _receive_stream_start_payload(websocket)
    if start_payload is None:
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
        if isinstance(exc, grpc.RpcError):
            await websocket.send_text(
                json.dumps(_grpc_terminal_error_payload(exc), ensure_ascii=False)
            )
            await websocket.close(
                code=UPSTREAM_GRPC_TERMINAL_CLOSE_CODE,
                reason=UPSTREAM_GRPC_TERMINAL_CLOSE_REASON,
            )
        else:
            await websocket.send_text(
                json.dumps({"type": "error", "message": "Failed to connect upstream gRPC streaming session."})
            )
            await websocket.close(code=1011, reason="Upstream gRPC connection failed")
        return

    # Signal handshake ready to the browser client.
    await websocket.send_text(json.dumps({"type": "ready"}))
    websocket_close_code = 1000
    websocket_close_reason = ""

    async def relay_client_to_grpc():
        finalize_requested = False
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                binary = message.get("bytes")
                if binary is not None:
                    if not finalize_requested:
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
                    if not finalize_requested:
                        await grpc_session.finish()
                        finalize_requested = True
                    continue
                if parsed_type in {"ping", "pong"}:
                    continue
        except WebSocketDisconnect:
            logger.info("온프렘 스트리밍: 브라우저 연결 종료 (client->grpc)")
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("온프렘 스트리밍 client->grpc 오류", exc_info=exc)
            raise

    async def relay_grpc_to_client():
        nonlocal websocket_close_code, websocket_close_reason
        try:
            while True:
                response = await grpc_session.recv()
                if response is None:
                    if grpc_session.last_error:
                        await websocket.send_text(
                            json.dumps(
                                _grpc_terminal_error_payload(grpc_session.last_error),
                                ensure_ascii=False,
                            )
                        )
                        websocket_close_code = UPSTREAM_GRPC_TERMINAL_CLOSE_CODE
                        websocket_close_reason = UPSTREAM_GRPC_TERMINAL_CLOSE_REASON
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
            await websocket.close(code=websocket_close_code, reason=websocket_close_reason)


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

    start_payload = await _receive_stream_start_payload(websocket)
    if start_payload is None:
        return
    decoder_config, _ = _extract_decoder_config_from_start(start_payload)

    streaming_url = None
    try:
        streaming_url = client.get_streaming_url(config=decoder_config)
        upstream = await client.connect_streaming(config=decoder_config)
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

    await websocket.send_text(json.dumps({"type": "ready"}))

    async def relay_client_to_upstream():
        finalize_requested = False
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                binary = message.get("bytes")
                if binary is not None:
                    if not finalize_requested:
                        await upstream.send(bytes(binary))
                    continue
                text = message.get("text")
                if text is not None:
                    try:
                        parsed: Any = json.loads(text)
                    except json.JSONDecodeError:
                        parsed = text

                    if isinstance(parsed, dict):
                        parsed_type = _normalize_message_type(parsed)
                        if parsed_type in {"start", "session", "start_request", "ping", "pong"}:
                            continue
                        if parsed_type in {"final", "stop", "eos"}:
                            if not finalize_requested:
                                await upstream.send("EOS")
                                finalize_requested = True
                            continue
                        continue

                    if isinstance(parsed, str) and parsed.strip().upper() == "EOS":
                        if not finalize_requested:
                            await upstream.send("EOS")
                            finalize_requested = True
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
