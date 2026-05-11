"""Shared provider-runtime policy for additive backend features."""

from __future__ import annotations

import asyncio
import contextlib
import os
from dataclasses import dataclass
from typing import Any, Callable, Optional

import httpx

from .models import BackendProfileRecord, FeatureBindingRecord

PROVIDER_RUNTIME_FEATURE_KEYS = {"artifact.summary", "translate.turn_final"}
PROVIDER_RUNTIME_SUPPORTED_AUTH_TYPES = {"none", "bearer_secret_ref", "header_token"}
PROVIDER_RUNTIME_SUPPORTED_CREDENTIAL_KINDS = {"server_env", "operator_token"}
PROVIDER_OPERATIONAL_HEALTH_STATUSES = {"unknown", "healthy"}


@dataclass(frozen=True)
class ProviderRuntimeSpec:
    provider_name: str
    provider_title: str
    error_prefix: str
    default_timeout_ms: int
    default_chat_path: str = "/chat/completions"
    temperature: float = 0.2


class ProviderRuntimeError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


ProviderHttpClientFactory = Callable[..., Any]


def truncate_log_text(value: Optional[str], max_length: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value)
    if len(text) <= max_length:
        return text
    return text[: max(0, max_length - 3)] + "..."


def profile_uses_provider_runtime(profile: BackendProfileRecord) -> bool:
    return any(
        capability in PROVIDER_RUNTIME_FEATURE_KEYS
        for capability in profile.capabilities
    )


def provider_runtime_profile_contract_error(
    profile: BackendProfileRecord,
) -> Optional[str]:
    if not profile_uses_provider_runtime(profile):
        return None

    if profile.transport != "http":
        return (
            "Provider-backed summary/translate profiles currently support only http transport."
        )

    auth_type = profile.auth_strategy.type
    if auth_type not in PROVIDER_RUNTIME_SUPPORTED_AUTH_TYPES:
        return (
            "Provider-backed summary/translate profiles currently support only "
            "`none`, `bearer_secret_ref`, or `header_token` auth strategies."
        )

    if auth_type == "none":
        return None

    credential_ref = profile.auth_strategy.credential_ref
    if credential_ref is None:
        return "Auth strategy requires a credential reference before the backend can be used."

    if credential_ref.kind not in PROVIDER_RUNTIME_SUPPORTED_CREDENTIAL_KINDS:
        return (
            "Provider-backed summary/translate profiles currently support only "
            "`server_env` or `operator_token` credential references."
        )

    return None


def provider_runtime_profile_readiness_error(
    settings: Any,
    profile: BackendProfileRecord,
) -> Optional[str]:
    contract_error = provider_runtime_profile_contract_error(profile)
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
        if (getattr(settings, "backend_admin_token", None) or "").strip():
            return None
        return "Operator token auth is selected but BACKEND_ADMIN_TOKEN is not configured."

    return None


def backend_profile_supports_capabilities(
    profile: BackendProfileRecord, required_capabilities: set[str]
) -> bool:
    return required_capabilities.issubset(set(profile.capabilities))


def backend_profile_is_operational(profile: BackendProfileRecord) -> bool:
    return (
        profile.enabled
        and profile.health.status in PROVIDER_OPERATIONAL_HEALTH_STATUSES
    )


def backend_profile_is_ready_for_feature(
    settings: Any,
    profile: BackendProfileRecord,
    required_capabilities: set[str],
) -> bool:
    return (
        backend_profile_supports_capabilities(profile, required_capabilities)
        and backend_profile_is_operational(profile)
        and provider_runtime_profile_readiness_error(settings, profile) is None
    )


def resolve_provider_credential_value(
    settings: Any,
    profile: BackendProfileRecord,
    *,
    spec: ProviderRuntimeSpec,
) -> str:
    credential_ref = profile.auth_strategy.credential_ref
    if credential_ref is None:
        raise ProviderRuntimeError(
            503,
            f"{spec.error_prefix}_MISCONFIGURED",
            f"The {spec.provider_name} backend requires a credential reference before it can be used.",
        )

    if credential_ref.kind == "server_env":
        env_name = credential_ref.id.strip()
        token = (os.environ.get(env_name) or "").strip()
        if token:
            return token
        raise ProviderRuntimeError(
            503,
            f"{spec.error_prefix}_MISCONFIGURED",
            f"The {spec.provider_name} backend credential is missing from the server environment.",
            {"env_name": env_name},
        )

    if credential_ref.kind == "operator_token":
        token = (getattr(settings, "backend_admin_token", None) or "").strip()
        if token:
            return token
        raise ProviderRuntimeError(
            503,
            f"{spec.error_prefix}_MISCONFIGURED",
            f"The operator token is not configured for {spec.provider_name} backend authentication.",
        )

    raise ProviderRuntimeError(
        503,
        f"{spec.error_prefix}_AUTH_UNSUPPORTED",
        f"The current {spec.provider_name} credential source is not supported yet.",
        {"credential_kind": credential_ref.kind},
    )


def build_provider_auth_headers(
    settings: Any,
    profile: BackendProfileRecord,
    *,
    spec: ProviderRuntimeSpec,
) -> dict[str, str]:
    auth_type = profile.auth_strategy.type
    if auth_type == "none":
        return {}

    if auth_type == "bearer_secret_ref":
        token = resolve_provider_credential_value(settings, profile, spec=spec)
        return {"Authorization": f"Bearer {token}"}

    if auth_type == "header_token":
        token = resolve_provider_credential_value(settings, profile, spec=spec)
        header_name = (
            profile.metadata.get("auth_header_name", "Authorization").strip()
            or "Authorization"
        )
        header_prefix = profile.metadata.get("auth_header_prefix", "").strip()
        header_value = f"{header_prefix} {token}".strip() if header_prefix else token
        return {header_name: header_value}

    raise ProviderRuntimeError(
        503,
        f"{spec.error_prefix}_AUTH_UNSUPPORTED",
        f"The configured {spec.provider_name} backend auth strategy is not supported yet.",
        {"auth_type": auth_type},
    )


def resolve_provider_model(
    binding: FeatureBindingRecord,
    profile: BackendProfileRecord,
    *,
    spec: ProviderRuntimeSpec,
) -> str:
    model = (binding.model_override or profile.default_model or "").strip()
    if model:
        return model
    raise ProviderRuntimeError(
        503,
        f"{spec.error_prefix}_MISCONFIGURED",
        f"A {spec.provider_name} model must be configured on the binding or backend profile.",
    )


def resolve_provider_timeout_ms(
    binding: FeatureBindingRecord,
    *,
    spec: ProviderRuntimeSpec,
) -> int:
    if binding.timeout_ms is not None and binding.timeout_ms > 0:
        return binding.timeout_ms
    return spec.default_timeout_ms


def resolve_provider_retry_attempts(binding: FeatureBindingRecord) -> int:
    if binding.retry_policy is None:
        return 1
    return max(1, binding.retry_policy.max_attempts)


def resolve_provider_backoff_seconds(binding: FeatureBindingRecord) -> float:
    if binding.retry_policy is None or binding.retry_policy.backoff_ms <= 0:
        return 0.0
    return binding.retry_policy.backoff_ms / 1000.0


def resolve_provider_chat_path(
    profile: BackendProfileRecord,
    *,
    spec: ProviderRuntimeSpec,
) -> str:
    configured = (
        profile.metadata.get("chat_completions_path")
        or profile.metadata.get("chat_path")
        or spec.default_chat_path
    ).strip()
    if not configured:
        return spec.default_chat_path
    return configured if configured.startswith("/") else f"/{configured}"


async def request_chat_provider_payload(
    *,
    settings: Any,
    profile: BackendProfileRecord,
    binding: FeatureBindingRecord,
    model: str,
    messages: list[dict[str, str]],
    spec: ProviderRuntimeSpec,
    client_factory: Optional[ProviderHttpClientFactory] = None,
    sleep: Callable[[float], Any] = asyncio.sleep,
) -> Any:
    request_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        **build_provider_auth_headers(settings, profile, spec=spec),
    }
    timeout_seconds = max(1.0, resolve_provider_timeout_ms(binding, spec=spec) / 1000.0)
    retry_attempts = resolve_provider_retry_attempts(binding)
    backoff_seconds = resolve_provider_backoff_seconds(binding)
    request_url = f"{profile.base_url}{resolve_provider_chat_path(profile, spec=spec)}"
    request_body = {
        "model": model,
        "messages": messages,
        "temperature": spec.temperature,
    }

    last_error_message = f"{spec.provider_title} provider request failed."
    make_client = client_factory or httpx.AsyncClient

    async with make_client(
        verify=getattr(settings, "verify_ssl", True),
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
                last_error_message = (
                    f"{spec.provider_title} provider request timed out."
                )
            except httpx.RequestError as exc:
                last_error_message = (
                    f"{spec.provider_title} provider request failed: {exc}"
                )
            else:
                if response.status_code in {408, 429} or response.status_code >= 500:
                    body_preview = truncate_log_text(response.text, 400)
                    last_error_message = (
                        f"{spec.provider_title} provider could not complete the request: "
                        f"HTTP {response.status_code}"
                        + (f" ({body_preview})" if body_preview else "")
                    )
                elif response.status_code >= 400:
                    body_preview = truncate_log_text(response.text, 400)
                    raise ProviderRuntimeError(
                        502,
                        f"{spec.error_prefix}_REQUEST_FAILED",
                        (
                            f"The {spec.provider_name} provider rejected the request. "
                            "Check the configured model, path, or credentials."
                        ),
                        {
                            "status_code": response.status_code,
                            "response_body": body_preview,
                        },
                    )
                else:
                    with contextlib.suppress(ValueError):
                        return response.json()
                    raise ProviderRuntimeError(
                        502,
                        f"{spec.error_prefix}_RESPONSE_INVALID",
                        f"The {spec.provider_name} provider returned a non-JSON response.",
                    )

            if attempt + 1 < retry_attempts and backoff_seconds > 0:
                await sleep(backoff_seconds)

    raise ProviderRuntimeError(
        502,
        f"{spec.error_prefix}_REQUEST_FAILED",
        f"The {spec.provider_name} provider could not complete the request.",
        {"detail": last_error_message},
    )
