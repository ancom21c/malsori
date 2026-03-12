import asyncio
from types import SimpleNamespace

import pytest
from fastapi.dependencies import utils as fastapi_dependency_utils
from fastapi import HTTPException

fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None

from api_server import main


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
