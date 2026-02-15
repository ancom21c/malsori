"""Google Drive OAuth "auth broker" endpoints.

This module implements a thin-backend approach:
- Store refresh tokens server-side (under STT_STORAGE_BASE_DIR).
- Issue short-lived access tokens to the webapp.

The webapp can then call Google Drive APIs directly (data plane stays in the browser),
without needing to keep refresh tokens in the browser.
"""

from __future__ import annotations

import base64
import contextlib
import hashlib
import json
import os
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Optional
from urllib.parse import urlencode, urlparse

import requests
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from .config import get_settings


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

DEFAULT_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "email",
    "profile",
]

TOKEN_FILENAME = "google_drive.oauth.json"

router = APIRouter(prefix="/v1/cloud/google", tags=["cloud"])

_state_lock = Lock()
_oauth_state: Dict[str, Dict[str, Any]] = {}

_token_lock = Lock()


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _sha256_base64url(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return _base64url(digest)


def _sanitize_return_to(value: Optional[str]) -> str:
    if not value:
        return "/"

    candidate = value.strip()
    if not candidate:
        return "/"

    # If an absolute URL sneaks in, strip it to a relative path to avoid open redirects.
    parsed = urlparse(candidate)
    if parsed.scheme or parsed.netloc:
        candidate = parsed.path or "/"
        if parsed.query:
            candidate += f"?{parsed.query}"
        if parsed.fragment:
            candidate += f"#{parsed.fragment}"

    if not candidate.startswith("/") or candidate.startswith("//"):
        return "/"

    return candidate


def _token_path(storage_base_dir: Path) -> Path:
    return storage_base_dir / TOKEN_FILENAME


def _load_token_file(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return {}
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


@dataclass(frozen=True)
class _OAuthConfig:
    client_id: str
    client_secret: str
    redirect_uri: str
    scopes: list[str]


def _get_oauth_config() -> _OAuthConfig:
    settings = get_settings()
    if not settings.google_oauth_enabled:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured on this server.")

    scopes = DEFAULT_SCOPES
    if settings.google_oauth_scopes and settings.google_oauth_scopes.strip():
        scopes = [token.strip() for token in settings.google_oauth_scopes.split() if token.strip()]
    return _OAuthConfig(
        client_id=str(settings.google_oauth_client_id),
        client_secret=str(settings.google_oauth_client_secret),
        redirect_uri=str(settings.google_oauth_redirect_uri),
        scopes=scopes,
    )


def _cleanup_state(now: float, ttl_seconds: float = 15 * 60) -> None:
    expired = [key for key, value in _oauth_state.items() if now - float(value.get("ts", 0)) > ttl_seconds]
    for key in expired:
        _oauth_state.pop(key, None)


def _fetch_userinfo(access_token: str, timeout_seconds: float = 10.0) -> Dict[str, Any]:
    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=timeout_seconds,
    )
    if not response.ok:
        return {}
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _exchange_code_for_token(config: _OAuthConfig, code: str, code_verifier: str) -> Dict[str, Any]:
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": config.redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        },
        timeout=15.0,
    )
    try:
        payload = response.json()
    except ValueError:
        payload = {"error": "invalid_response", "error_description": response.text}
    if not response.ok:
        raise HTTPException(status_code=502, detail=payload.get("error_description") or payload.get("error") or "OAuth token exchange failed.")
    return payload if isinstance(payload, dict) else {}


def _refresh_access_token(config: _OAuthConfig, refresh_token: str) -> Dict[str, Any]:
    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15.0,
    )
    try:
        payload = response.json()
    except ValueError:
        payload = {"error": "invalid_response", "error_description": response.text}
    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=payload.get("error_description") or payload.get("error") or "OAuth refresh failed.",
        )
    return payload if isinstance(payload, dict) else {}


@router.get("/status")
def google_drive_status() -> Dict[str, Any]:
    settings = get_settings()
    enabled = bool(settings.google_oauth_enabled)

    connected = False
    email = None
    sub = None
    scopes = None
    connected_at = None

    if enabled:
        path = _token_path(settings.storage_base_dir)
        payload = _load_token_file(path)
        connected = bool(payload.get("refresh_token"))
        user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
        email = user.get("email") if isinstance(user, dict) else None
        sub = user.get("sub") if isinstance(user, dict) else None
        scopes = payload.get("scopes")
        connected_at = payload.get("connected_at")

    return {
        "enabled": enabled,
        "connected": connected,
        "email": email,
        "sub": sub,
        "scopes": scopes,
        "connected_at": connected_at,
    }


@router.get("/oauth/start")
def google_drive_oauth_start(
    return_to: Optional[str] = Query(default=None),
) -> RedirectResponse:
    config = _get_oauth_config()

    now = time.time()
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = _sha256_base64url(code_verifier)
    state = secrets.token_urlsafe(32)
    sanitized_return_to = _sanitize_return_to(return_to)

    with _state_lock:
        _cleanup_state(now)
        _oauth_state[state] = {"verifier": code_verifier, "return_to": sanitized_return_to, "ts": now}

    # Always ask for consent so we reliably receive/refresh a refresh_token,
    # and to avoid silently reusing an old refresh token across account switching.
    prompt = "consent"

    params = {
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "response_type": "code",
        "scope": " ".join(config.scopes),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    if prompt:
        params["prompt"] = prompt

    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url, status_code=302)


@router.get("/oauth/callback")
def google_drive_oauth_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
) -> RedirectResponse:
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing OAuth code/state.")

    config = _get_oauth_config()
    settings = get_settings()

    with _state_lock:
        state_payload = _oauth_state.pop(state, None)

    if not state_payload:
        raise HTTPException(status_code=400, detail="OAuth state has expired. Please try again.")

    code_verifier = str(state_payload.get("verifier") or "")
    return_to = _sanitize_return_to(state_payload.get("return_to"))

    token_payload = _exchange_code_for_token(config, code, code_verifier)

    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    scope_str = token_payload.get("scope") if isinstance(token_payload.get("scope"), str) else ""

    token_path = _token_path(settings.storage_base_dir)

    with _token_lock:
        userinfo: Dict[str, Any] = {}
        if isinstance(access_token, str) and access_token.strip():
            userinfo = _fetch_userinfo(access_token)

        existing = _load_token_file(token_path)
        existing_refresh = existing.get("refresh_token") if isinstance(existing.get("refresh_token"), str) else None
        existing_user = existing.get("user") if isinstance(existing.get("user"), dict) else {}
        existing_sub = existing_user.get("sub") if isinstance(existing_user, dict) else None

        effective_refresh = refresh_token
        if not (isinstance(effective_refresh, str) and effective_refresh.strip()):
            # Google may omit refresh_token on subsequent grants. Only reuse when it's clearly the same account.
            if (
                existing_refresh
                and isinstance(existing_sub, str)
                and isinstance(userinfo.get("sub"), str)
                and userinfo.get("sub") == existing_sub
            ):
                effective_refresh = existing_refresh
            else:
                raise HTTPException(
                    status_code=502,
                    detail="OAuth did not return a refresh token. Please retry the connection flow.",
                )

        payload = {
            "refresh_token": effective_refresh,
            "scopes": [token for token in scope_str.split() if token] if scope_str else config.scopes,
            "token_type": token_payload.get("token_type") or "Bearer",
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "user": {
                "sub": userinfo.get("sub"),
                "email": userinfo.get("email"),
                "name": userinfo.get("name"),
                "picture": userinfo.get("picture"),
            },
        }
        token_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        with contextlib.suppress(Exception):
            os.chmod(token_path, 0o600)

    return RedirectResponse(return_to, status_code=302)


@router.get("/access-token")
def google_drive_access_token() -> Dict[str, Any]:
    config = _get_oauth_config()
    settings = get_settings()
    token_path = _token_path(settings.storage_base_dir)

    with _token_lock:
        payload = _load_token_file(token_path)
        refresh_token = payload.get("refresh_token")

    if not isinstance(refresh_token, str) or not refresh_token.strip():
        raise HTTPException(status_code=401, detail="Google Drive is not connected.")

    refreshed = _refresh_access_token(config, refresh_token.strip())

    access_token = refreshed.get("access_token")
    if not isinstance(access_token, str) or not access_token.strip():
        raise HTTPException(status_code=502, detail="OAuth refresh returned no access token.")

    return {
        "access_token": access_token,
        "token_type": refreshed.get("token_type") or "Bearer",
        "expires_in": refreshed.get("expires_in"),
        "scope": refreshed.get("scope"),
    }


@router.post("/disconnect")
def google_drive_disconnect() -> Dict[str, Any]:
    config = _get_oauth_config()
    settings = get_settings()
    token_path = _token_path(settings.storage_base_dir)

    refresh_token = None
    with _token_lock:
        payload = _load_token_file(token_path)
        value = payload.get("refresh_token")
        refresh_token = value if isinstance(value, str) else None
        if token_path.exists():
            with contextlib.suppress(Exception):
                token_path.unlink()

    if refresh_token:
        with contextlib.suppress(Exception):
            requests.post(
                GOOGLE_REVOKE_URL,
                data={"token": refresh_token},
                timeout=10.0,
            )

    return {"disconnected": True}
