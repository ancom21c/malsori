import asyncio
from types import SimpleNamespace

import pytest
from fastapi.dependencies import utils as fastapi_dependency_utils
from fastapi import HTTPException

fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None

from api_server import main
from api_server.models import BackendEndpointUpdateRequest


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
