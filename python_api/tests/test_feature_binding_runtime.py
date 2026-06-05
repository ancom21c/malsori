from __future__ import annotations

from types import SimpleNamespace

import pytest

from api_server.feature_binding_runtime import (
    FeatureBindingTargetError,
    FeatureBindingTargetSpec,
    ResolvedFeatureBindingTarget,
    resolve_feature_binding_target,
)
from api_server.models import (
    BackendAuthStrategyModel,
    BackendCredentialRef,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
    FeatureBindingRecord,
)


SUMMARY_TARGET_SPEC = FeatureBindingTargetSpec(
    feature_key="artifact.summary",
    required_capabilities={"artifact.summary"},
    error_code="SUMMARY_BINDING_NOT_READY",
    binding_missing_message="Full summary is not configured yet.",
    binding_disabled_message="Full summary is disabled by the current binding.",
    primary_profile_missing_message="The configured primary summary backend profile could not be found.",
    capability_mismatch_message="The configured summary backend does not advertise the summary capability.",
    primary_misconfigured_message="The configured summary backend is misconfigured right now.",
    primary_unhealthy_message="The configured summary backend is not operational right now.",
)


def create_profile(**overrides: object) -> BackendProfileRecord:
    payload = {
        "id": "summary-primary",
        "label": "Summary primary",
        "kind": "llm",
        "base_url": "https://summary.example.com",
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
        "primary_backend_profile_id": "summary-primary",
        "enabled": True,
        "model_override": "gpt-5-mini",
    }
    payload.update(overrides)
    return FeatureBindingRecord.model_validate(payload)


def resolve_with_store(
    *,
    bindings: list[FeatureBindingRecord],
    profiles: list[BackendProfileRecord],
) -> ResolvedFeatureBindingTarget:
    bindings_by_key = {binding.feature_key: binding for binding in bindings}
    profiles_by_id = {profile.id: profile for profile in profiles}
    return resolve_feature_binding_target(
        settings=SimpleNamespace(backend_admin_token=None),
        spec=SUMMARY_TARGET_SPEC,
        get_feature_binding=lambda feature_key: bindings_by_key.get(feature_key),
        get_backend_profile=lambda profile_id: profiles_by_id.get(profile_id),
    )


def test_resolves_ready_primary_profile() -> None:
    target = resolve_with_store(
        bindings=[create_binding()],
        profiles=[create_profile()],
    )

    assert target.binding.feature_key == "artifact.summary"
    assert target.profile.id == "summary-primary"
    assert target.used_fallback is False


def test_resolves_ready_fallback_when_primary_is_unhealthy() -> None:
    target = resolve_with_store(
        bindings=[
            create_binding(fallback_backend_profile_id="summary-fallback"),
        ],
        profiles=[
            create_profile(
                health=BackendHealthSnapshotModel(status="unreachable"),
            ),
            create_profile(
                id="summary-fallback",
                label="Summary fallback",
                health=BackendHealthSnapshotModel(status="healthy"),
            ),
        ],
    )

    assert target.profile.id == "summary-fallback"
    assert target.used_fallback is True


def test_missing_binding_raises_binding_missing_error() -> None:
    with pytest.raises(FeatureBindingTargetError) as exc_info:
        resolve_with_store(bindings=[], profiles=[])

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "SUMMARY_BINDING_NOT_READY"
    assert exc_info.value.message == "Full summary is not configured yet."
    assert exc_info.value.details == {"reason": "binding_missing"}


def test_missing_primary_profile_raises_profile_missing_error() -> None:
    with pytest.raises(FeatureBindingTargetError) as exc_info:
        resolve_with_store(bindings=[create_binding()], profiles=[])

    assert exc_info.value.message == (
        "The configured primary summary backend profile could not be found."
    )
    assert exc_info.value.details == {"reason": "profile_missing"}


def test_capability_mismatch_raises_specific_error() -> None:
    with pytest.raises(FeatureBindingTargetError) as exc_info:
        resolve_with_store(
            bindings=[create_binding()],
            profiles=[create_profile(capabilities=["translate.turn_final"])],
        )

    assert exc_info.value.message == (
        "The configured summary backend does not advertise the summary capability."
    )
    assert exc_info.value.details == {"reason": "capability_mismatch"}


def test_runtime_misconfiguration_raises_specific_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("MISSING_SUMMARY_TOKEN", raising=False)
    profile = create_profile(
        auth_strategy=BackendAuthStrategyModel(
            type="bearer_secret_ref",
            credential_ref=BackendCredentialRef(
                kind="server_env",
                id="MISSING_SUMMARY_TOKEN",
            ),
        )
    )

    with pytest.raises(FeatureBindingTargetError) as exc_info:
        resolve_with_store(bindings=[create_binding()], profiles=[profile])

    assert exc_info.value.message == (
        "The configured summary backend is misconfigured right now."
    )
    assert exc_info.value.details == {
        "reason": "primary_misconfigured",
        "message": (
            "Server environment credential `MISSING_SUMMARY_TOKEN` is missing, "
            "so runtime cannot use this backend."
        ),
    }
