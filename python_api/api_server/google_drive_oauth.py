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
import hmac
import json
import logging
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
from fastapi import APIRouter, HTTPException, Query, Request, Response
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

SESSION_COOKIE_NAME = "malsori_gdrive_session"
SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 days

TOKEN_DIRNAME = "google_drive_oauth"
TOKEN_FILENAME_PREFIX = "google_drive.oauth"
OAUTH_STATE_TTL_SECONDS = 15 * 60
OAUTH_STATE_CLOCK_SKEW_SECONDS = 60

router = APIRouter(prefix="/v1/cloud/google", tags=["cloud"])

logger = logging.getLogger(__name__)

_token_lock = Lock()


def _raise_oauth_error(
    status_code: int,
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    error: Dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    raise HTTPException(status_code=status_code, detail={"error": error})


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

    if len(candidate) > 1024:
        candidate = candidate[:1024]

    return candidate


def _is_valid_session_id(value: str) -> bool:
    if not value:
        return False
    if len(value) > 128:
        return False
    for ch in value:
        if ch.isalnum() or ch in {"-", "_"}:
            continue
        return False
    return True


def _read_session_id(request: Request) -> Optional[str]:
    raw = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw:
        return None
    candidate = raw.strip()
    return candidate if _is_valid_session_id(candidate) else None


def _new_session_id() -> str:
    # token_urlsafe generates URL-safe characters (alnum, "-", "_") by default.
    return secrets.token_urlsafe(32)


def _cookie_secure(request: Request) -> bool:
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "").lower()
    return proto == "https"


def _set_session_cookie(response: Response, request: Request, session_id: str) -> None:
    # Lax is required so cookies are included on the OAuth redirect back to our callback.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        max_age=SESSION_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=_cookie_secure(request),
        path="/",
    )


def _token_dir(storage_base_dir: Path) -> Path:
    token_dir = storage_base_dir / TOKEN_DIRNAME
    token_dir.mkdir(parents=True, exist_ok=True)
    return token_dir


def _token_path(storage_base_dir: Path, session_id: str) -> Path:
    if not _is_valid_session_id(session_id):
        raise ValueError("Invalid session ID.")
    return _token_dir(storage_base_dir) / f"{TOKEN_FILENAME_PREFIX}.{session_id}.json"


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
    state_secret: str


def _get_oauth_config() -> _OAuthConfig:
    settings = get_settings()
    if not settings.google_oauth_credentials_configured:
        _raise_oauth_error(
            501,
            "OAUTH_NOT_CONFIGURED",
            "Google OAuth is not configured on this server.",
        )
    if not settings.google_oauth_storage_ready:
        _raise_oauth_error(
            503,
            "OAUTH_STORAGE_REQUIRED",
            settings.google_oauth_storage_warning
            or "Google OAuth requires persistent storage.",
        )

    scopes = DEFAULT_SCOPES
    if settings.google_oauth_scopes and settings.google_oauth_scopes.strip():
        scopes = [
            token.strip()
            for token in settings.google_oauth_scopes.split()
            if token.strip()
        ]
    state_secret = (
        (settings.google_oauth_state_secret or "").strip()
        or (settings.google_oauth_client_secret or "").strip()
    )
    if not state_secret:
        _raise_oauth_error(
            503,
            "OAUTH_STATE_SECRET_MISSING",
            "Google OAuth state secret is not configured.",
        )
    return _OAuthConfig(
        client_id=str(settings.google_oauth_client_id),
        client_secret=str(settings.google_oauth_client_secret),
        redirect_uri=str(settings.google_oauth_redirect_uri),
        scopes=scopes,
        state_secret=state_secret,
    )


def _base64url_decode(value: str) -> bytes:
    padding = "=" * ((4 - (len(value) % 4)) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("utf-8"))


def _encode_oauth_state(
    config: _OAuthConfig,
    session_id: str,
    code_verifier: str,
    return_to: str,
    now: Optional[float] = None,
) -> str:
    issued_at = int(now if now is not None else time.time())
    payload = {
        "sid": session_id,
        "ver": code_verifier,
        "rt": return_to,
        "iat": issued_at,
        "n": secrets.token_urlsafe(10),
    }
    encoded_payload = _base64url(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    )
    signature = hmac.new(
        config.state_secret.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_payload}.{_base64url(signature)}"


def _decode_oauth_state(
    config: _OAuthConfig,
    state: str,
    session_id: str,
    now: Optional[float] = None,
) -> Dict[str, str]:
    if "." not in state:
        logger.warning("OAuth state decode failed: malformed token.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")
    encoded_payload, provided_signature = state.split(".", 1)
    if not encoded_payload or not provided_signature:
        logger.warning("OAuth state decode failed: malformed token segments.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    expected_signature = _base64url(
        hmac.new(
            config.state_secret.encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    )
    if not secrets.compare_digest(provided_signature, expected_signature):
        logger.warning("OAuth state decode failed: signature mismatch.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    try:
        decoded_payload = _base64url_decode(encoded_payload)
        payload = json.loads(decoded_payload.decode("utf-8"))
    except Exception:
        logger.warning("OAuth state decode failed: payload parse error.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    if not isinstance(payload, dict):
        logger.warning("OAuth state decode failed: payload is not an object.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    issued_at_raw = payload.get("iat")
    try:
        issued_at = int(issued_at_raw)
    except (TypeError, ValueError):
        logger.warning("OAuth state decode failed: missing issued-at.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    now_ts = float(now if now is not None else time.time())
    if issued_at - OAUTH_STATE_CLOCK_SKEW_SECONDS > now_ts:
        logger.warning("OAuth state decode failed: issued-at is in the future.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")
    if now_ts - issued_at > OAUTH_STATE_TTL_SECONDS:
        logger.warning("OAuth state expired. iat=%s now=%s", issued_at, int(now_ts))
        _raise_oauth_error(
            400, "OAUTH_STATE_EXPIRED", "OAuth state has expired. Please try again."
        )

    expected_session_id = payload.get("sid")
    if not isinstance(expected_session_id, str) or expected_session_id != session_id:
        logger.warning("OAuth state decode failed: session mismatch.")
        _raise_oauth_error(
            400,
            "OAUTH_SESSION_MISMATCH",
            "OAuth session mismatch. Please retry the connection flow.",
        )

    verifier = payload.get("ver")
    if not isinstance(verifier, str) or not verifier.strip():
        logger.warning("OAuth state decode failed: missing verifier.")
        _raise_oauth_error(400, "OAUTH_STATE_INVALID", "Invalid OAuth state.")

    return_to = _sanitize_return_to(payload.get("rt"))
    return {"verifier": verifier, "return_to": return_to}


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
        _raise_oauth_error(
            502,
            "OAUTH_TOKEN_EXCHANGE_FAILED",
            payload.get("error_description")
            or payload.get("error")
            or "OAuth token exchange failed.",
        )
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
        _raise_oauth_error(
            502,
            "OAUTH_REFRESH_FAILED",
            payload.get("error_description")
            or payload.get("error")
            or "OAuth refresh failed.",
        )
    return payload if isinstance(payload, dict) else {}


@router.get("/status")
def google_drive_status(request: Request, response: Response) -> Dict[str, Any]:
    settings = get_settings()
    enabled = bool(settings.google_oauth_enabled)

    connected = False
    email = None
    sub = None
    scopes = None
    connected_at = None

    if enabled:
        session_id = _read_session_id(request)
        if not session_id:
            session_id = _new_session_id()
            _set_session_cookie(response, request, session_id)
        path = _token_path(settings.storage_base_dir, session_id)
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
        "storage_persistent": bool(settings.storage_persistent),
        "configuration_warning": settings.google_oauth_storage_warning,
    }


@router.get("/oauth/start")
def google_drive_oauth_start(
    request: Request,
    return_to: Optional[str] = Query(default=None),
) -> RedirectResponse:
    config = _get_oauth_config()

    session_id = _read_session_id(request)
    cookie_session_id = session_id
    if not session_id:
        session_id = _new_session_id()
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = _sha256_base64url(code_verifier)
    sanitized_return_to = _sanitize_return_to(return_to)
    state = _encode_oauth_state(
        config=config,
        session_id=session_id,
        code_verifier=code_verifier,
        return_to=sanitized_return_to,
    )

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
    redirect = RedirectResponse(url, status_code=302)
    if not cookie_session_id:
        _set_session_cookie(redirect, request, session_id)
    return redirect


@router.get("/oauth/callback")
def google_drive_oauth_callback(
    request: Request,
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
) -> RedirectResponse:
    if error:
        _raise_oauth_error(400, "OAUTH_FLOW_ERROR", f"OAuth error: {error}")
    if not code or not state:
        _raise_oauth_error(
            400, "OAUTH_CODE_OR_STATE_MISSING", "Missing OAuth code/state."
        )

    config = _get_oauth_config()
    settings = get_settings()

    session_id = _read_session_id(request)
    if not session_id:
        _raise_oauth_error(
            400,
            "OAUTH_SESSION_REQUIRED",
            "Missing session cookie. Please retry the connection flow.",
        )

    state_payload = _decode_oauth_state(
        config=config, state=state, session_id=session_id
    )
    code_verifier = str(state_payload.get("verifier") or "")
    return_to = _sanitize_return_to(state_payload.get("return_to"))

    token_payload = _exchange_code_for_token(config, code, code_verifier)

    access_token = token_payload.get("access_token")
    refresh_token = token_payload.get("refresh_token")
    scope_str = token_payload.get("scope") if isinstance(token_payload.get("scope"), str) else ""

    token_path = _token_path(settings.storage_base_dir, session_id)

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
                _raise_oauth_error(
                    502,
                    "OAUTH_REFRESH_TOKEN_MISSING",
                    "OAuth did not return a refresh token. Please retry the connection flow.",
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
def google_drive_access_token(request: Request) -> Dict[str, Any]:
    config = _get_oauth_config()
    settings = get_settings()
    session_id = _read_session_id(request)
    if not session_id:
        _raise_oauth_error(401, "OAUTH_SESSION_REQUIRED", "Missing session cookie.")
    token_path = _token_path(settings.storage_base_dir, session_id)

    with _token_lock:
        payload = _load_token_file(token_path)
        refresh_token = payload.get("refresh_token")

    if not isinstance(refresh_token, str) or not refresh_token.strip():
        _raise_oauth_error(401, "OAUTH_NOT_CONNECTED", "Google Drive is not connected.")

    refreshed = _refresh_access_token(config, refresh_token.strip())

    access_token = refreshed.get("access_token")
    if not isinstance(access_token, str) or not access_token.strip():
        _raise_oauth_error(
            502,
            "OAUTH_ACCESS_TOKEN_MISSING",
            "OAuth refresh returned no access token.",
        )

    return {
        "access_token": access_token,
        "token_type": refreshed.get("token_type") or "Bearer",
        "expires_in": refreshed.get("expires_in"),
        "scope": refreshed.get("scope"),
    }


@router.post("/disconnect")
def google_drive_disconnect(request: Request) -> Dict[str, Any]:
    _get_oauth_config()
    settings = get_settings()
    session_id = _read_session_id(request)
    if not session_id:
        _raise_oauth_error(401, "OAUTH_SESSION_REQUIRED", "Missing session cookie.")
    token_path = _token_path(settings.storage_base_dir, session_id)

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
