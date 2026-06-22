"""Feature binding target resolution for provider-backed backend features."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional

from .models import BackendProfileRecord, FeatureBindingRecord
from .provider_runtime import (
    backend_profile_is_ready_for_feature,
    backend_profile_supports_capabilities,
    provider_runtime_profile_readiness_error,
)


FeatureBindingLookup = Callable[[str], Optional[FeatureBindingRecord]]
BackendProfileLookup = Callable[[str], Optional[BackendProfileRecord]]


@dataclass(frozen=True)
class FeatureBindingTargetSpec:
    feature_key: str
    required_capabilities: set[str]
    error_code: str
    binding_missing_message: str
    binding_disabled_message: str
    primary_profile_missing_message: str
    capability_mismatch_message: str
    primary_misconfigured_message: str
    primary_unhealthy_message: str


@dataclass(frozen=True)
class ResolvedFeatureBindingTarget:
    binding: FeatureBindingRecord
    profile: BackendProfileRecord
    used_fallback: bool


class FeatureBindingTargetError(Exception):
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


def get_ready_fallback_profile(
    *,
    settings: Any,
    fallback_profile_id: Optional[str],
    required_capabilities: set[str],
    selected_profile_id: Optional[str],
    get_backend_profile: BackendProfileLookup,
) -> Optional[BackendProfileRecord]:
    if not fallback_profile_id or fallback_profile_id == selected_profile_id:
        return None
    fallback_profile = get_backend_profile(fallback_profile_id)
    if fallback_profile is None:
        return None
    if not backend_profile_is_ready_for_feature(
        settings, fallback_profile, required_capabilities
    ):
        return None
    return fallback_profile


def resolve_feature_binding_target(
    *,
    settings: Any,
    spec: FeatureBindingTargetSpec,
    get_feature_binding: FeatureBindingLookup,
    get_backend_profile: BackendProfileLookup,
) -> ResolvedFeatureBindingTarget:
    binding = get_feature_binding(spec.feature_key)
    if binding is None:
        raise FeatureBindingTargetError(
            503,
            spec.error_code,
            spec.binding_missing_message,
            {"reason": "binding_missing"},
        )

    if not binding.enabled:
        raise FeatureBindingTargetError(
            503,
            spec.error_code,
            spec.binding_disabled_message,
            {"reason": "binding_disabled"},
        )

    primary_profile = get_backend_profile(binding.primary_backend_profile_id)
    if primary_profile is None:
        raise FeatureBindingTargetError(
            503,
            spec.error_code,
            spec.primary_profile_missing_message,
            {"reason": "profile_missing"},
        )

    if backend_profile_is_ready_for_feature(
        settings, primary_profile, spec.required_capabilities
    ):
        return ResolvedFeatureBindingTarget(binding, primary_profile, False)

    fallback_profile = get_ready_fallback_profile(
        settings=settings,
        fallback_profile_id=binding.fallback_backend_profile_id,
        required_capabilities=spec.required_capabilities,
        selected_profile_id=primary_profile.id,
        get_backend_profile=get_backend_profile,
    )
    if fallback_profile is not None:
        return ResolvedFeatureBindingTarget(binding, fallback_profile, True)

    if not backend_profile_supports_capabilities(
        primary_profile, spec.required_capabilities
    ):
        raise FeatureBindingTargetError(
            503,
            spec.error_code,
            spec.capability_mismatch_message,
            {"reason": "capability_mismatch"},
        )

    runtime_error = provider_runtime_profile_readiness_error(
        settings, primary_profile
    )
    if runtime_error:
        raise FeatureBindingTargetError(
            503,
            spec.error_code,
            spec.primary_misconfigured_message,
            {
                "reason": "primary_misconfigured",
                "message": runtime_error,
            },
        )

    raise FeatureBindingTargetError(
        503,
        spec.error_code,
        spec.primary_unhealthy_message,
        {"reason": "primary_unhealthy"},
    )
