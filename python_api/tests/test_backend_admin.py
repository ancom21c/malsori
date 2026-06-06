import asyncio
from types import SimpleNamespace

import pytest
from fastapi.dependencies import utils as fastapi_dependency_utils
from fastapi import HTTPException

fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None

from api_server import main
from api_server.backend_bindings_store import (
    get_backend_profile,
    get_feature_binding,
    upsert_backend_profile,
    upsert_feature_binding,
)
from api_server.models import (
    BackendAuthStrategyModel,
    BackendEndpointUpdateRequest,
    BackendHealthSnapshotModel,
    BackendProfileRecord,
    FeatureBindingRecord,
)


def create_backend_profile(**overrides: object) -> BackendProfileRecord:
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


def create_feature_binding(**overrides: object) -> FeatureBindingRecord:
    payload = {
        "feature_key": "artifact.summary",
        "primary_backend_profile_id": "summary-primary",
        "enabled": True,
    }
    payload.update(overrides)
    return FeatureBindingRecord.model_validate(payload)


def test_require_backend_admin_allows_missing_token_when_not_required(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = SimpleNamespace(
        backend_admin_enabled=True,
        backend_admin_token_required=False,
        backend_admin_token=None,
    )
    monkeypatch.setattr(main, "get_settings", lambda: settings)

    resolved = main._require_backend_admin(None)

    assert resolved is settings


def test_require_backend_admin_rejects_missing_token_when_required(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = SimpleNamespace(
        backend_admin_enabled=True,
        backend_admin_token_required=True,
        backend_admin_token="secret-token",
    )
    monkeypatch.setattr(main, "get_settings", lambda: settings)

    with pytest.raises(HTTPException) as exc_info:
        main._require_backend_admin(None)

    assert exc_info.value.status_code == 401


def test_health_status_reports_backend_admin_token_requirement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = SimpleNamespace(
        deployment="cloud",
        auth_enabled=True,
        backend_admin_enabled=True,
        backend_admin_token_required=False,
    )
    monkeypatch.setattr(main, "get_settings", lambda: settings)
    monkeypatch.setattr(main, "_resolve_backend_source", lambda: "default")

    response = asyncio.run(main.health_status())

    assert response.backend_admin_enabled is True
    assert response.backend_admin_token_required is False


def test_set_backend_endpoint_forwards_null_credentials_to_override_apply(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_updates: dict[str, object] = {}
    settings = SimpleNamespace(
        deployment="onprem",
        pronaia_api_base="https://onprem.example.com",
        verify_ssl=False,
        pronaia_client_id=None,
        pronaia_client_secret=None,
        auth_enabled=False,
        transcribe_path="/api/v2/batch",
        streaming_path="/api/v1/transcribe:streaming",
    )

    def fake_apply_backend_override(payload: dict[str, object]) -> SimpleNamespace:
        captured_updates.update(payload)
        return settings

    monkeypatch.setattr(main, "apply_backend_override", fake_apply_backend_override)
    monkeypatch.setattr(main, "_reset_client", lambda: None)
    monkeypatch.setattr(main, "_resolve_backend_source", lambda: "override")

    response = asyncio.run(
        main.set_backend_endpoint(
            BackendEndpointUpdateRequest(
                deployment="onprem",
                api_base_url="https://onprem.example.com",
                client_id=None,
                client_secret=None,
                verify_ssl=False,
            ),
            settings,
        )
    )

    assert captured_updates == {
        "pronaia_api_base": "https://onprem.example.com",
        "deployment": "onprem",
        "verify_ssl": False,
        "pronaia_client_id": None,
        "pronaia_client_secret": None,
    }
    assert response.auth_enabled is False
    assert response.has_client_id is False
    assert response.has_client_secret is False


def test_delete_backend_profile_rejects_when_binding_still_references_it(
    tmp_path,
) -> None:
    settings = SimpleNamespace(storage_base_dir=tmp_path)
    upsert_backend_profile(tmp_path, create_backend_profile())
    upsert_feature_binding(tmp_path, create_feature_binding())

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main.delete_backend_profile_record("summary-primary", settings))

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["error"]["code"] == "BACKEND_PROFILE_IN_USE"
    assert get_backend_profile(tmp_path, "summary-primary") is not None


def test_put_backend_feature_binding_rejects_missing_primary_profile_reference(
    tmp_path,
) -> None:
    settings = SimpleNamespace(storage_base_dir=tmp_path)
    payload = create_feature_binding(primary_backend_profile_id="missing-profile")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main.put_backend_feature_binding("artifact.summary", payload, settings))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["error"]["code"] == "FEATURE_BINDING_PROFILE_NOT_FOUND"
    assert get_feature_binding(tmp_path, "artifact.summary") is None


def test_put_backend_feature_binding_rejects_missing_fallback_profile_reference(
    tmp_path,
) -> None:
    settings = SimpleNamespace(storage_base_dir=tmp_path)
    upsert_backend_profile(tmp_path, create_backend_profile())
    payload = create_feature_binding(fallback_backend_profile_id="missing-fallback")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main.put_backend_feature_binding("artifact.summary", payload, settings))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["error"]["code"] == "FEATURE_BINDING_PROFILE_NOT_FOUND"
    assert get_feature_binding(tmp_path, "artifact.summary") is None
