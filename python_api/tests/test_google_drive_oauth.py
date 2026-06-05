import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from starlette.requests import Request

from api_server import google_drive_oauth


def _build_request(session_id: str) -> Request:
    headers = [(b"cookie", f"{google_drive_oauth.SESSION_COOKIE_NAME}={session_id}".encode("utf-8"))]
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/v1/cloud/google/oauth/callback",
        "headers": headers,
        "query_string": b"",
        "scheme": "https",
        "server": ("testserver", 443),
        "client": ("127.0.0.1", 12345),
    }
    return Request(scope)


def test_oauth_callback_preserves_existing_token_file_when_atomic_replace_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    session_id = "session-123"
    config = google_drive_oauth._OAuthConfig(
        client_id="client-id",
        client_secret="client-secret",
        redirect_uri="https://example.com/callback",
        scopes=["scope-a", "scope-b"],
        state_secret="state-secret",
    )
    state = google_drive_oauth._encode_oauth_state(
        config,
        session_id=session_id,
        code_verifier="verifier-123",
        return_to="/settings/cloud",
    )
    request = _build_request(session_id)

    monkeypatch.setattr(google_drive_oauth, "_get_oauth_config", lambda: config)
    monkeypatch.setattr(
        google_drive_oauth,
        "get_settings",
        lambda: SimpleNamespace(storage_base_dir=tmp_path),
    )
    monkeypatch.setattr(
        google_drive_oauth,
        "_exchange_code_for_token",
        lambda *_args, **_kwargs: {
            "access_token": "access-token",
            "refresh_token": "refresh-token-new",
            "scope": "scope-a scope-b",
            "token_type": "Bearer",
        },
    )
    monkeypatch.setattr(
        google_drive_oauth,
        "_fetch_userinfo",
        lambda *_args, **_kwargs: {
            "sub": "user-1",
            "email": "user@example.com",
            "name": "User Example",
            "picture": "https://example.com/avatar.png",
        },
    )

    token_path = google_drive_oauth._token_path(tmp_path, session_id)
    original_payload = {
        "refresh_token": "refresh-token-old",
        "scopes": ["scope-a"],
        "token_type": "Bearer",
        "connected_at": "2026-01-01T00:00:00+00:00",
        "user": {"sub": "user-1", "email": "old@example.com"},
    }
    token_path.write_text(
        json.dumps(original_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    original_content = token_path.read_text(encoding="utf-8")

    real_replace = Path.replace

    def fail_replace(self: Path, target: Path | str) -> Path:
        if Path(target) == token_path:
            raise OSError("simulated token replace failure")
        return real_replace(self, target)

    monkeypatch.setattr(Path, "replace", fail_replace)

    with pytest.raises(OSError, match="simulated token replace failure"):
        google_drive_oauth.google_drive_oauth_callback(
            request=request,
            code="oauth-code",
            state=state,
            error=None,
        )

    assert token_path.read_text(encoding="utf-8") == original_content
    assert google_drive_oauth._load_token_file(token_path) == original_payload
