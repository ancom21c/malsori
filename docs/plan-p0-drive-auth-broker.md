# Plan: Drive Auth Broker (Thin Backend) + Sync Touch Fix

## Goal

- Provide an optional "auth broker" mode for Google Drive sync:
  - Backend (python_api) stores refresh token and issues short-lived access tokens.
  - Webapp uses the broker to connect Drive and refresh tokens without exposing refresh tokens to the browser.
- Fix a sync correctness P0:
  - Segment edits (corrections/speaker labels) must bump the parent transcription's `updatedAt` so cloud sync detects changes.

## Non-goals (This Pass)

- Full cloud sync v2 redesign (manifest, Drive Changes API cursor, resumable uploads, chunked downloads).
- Multi-provider cloud (Dropbox/OneDrive).
- E2EE for Drive payloads.

## Implementation Steps

1. python_api: Google OAuth broker endpoints
   - Add settings for Google OAuth credentials (env):
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REDIRECT_URI`
     - optional: `GOOGLE_OAUTH_SCOPES` (default: `drive.file openid email profile`)
   - Implement:
     - `GET  /v1/cloud/google/status` (enabled/connected + email/sub when available)
     - `GET  /v1/cloud/google/oauth/start?return_to=...` (redirect to Google auth)
     - `GET  /v1/cloud/google/oauth/callback` (exchange code, persist refresh token, redirect back)
     - `GET  /v1/cloud/google/access-token` (refresh -> return access token + expires_in)
     - `POST /v1/cloud/google/disconnect` (revoke + delete stored token)
   - Persist refresh token under `STT_STORAGE_BASE_DIR/google_drive_oauth/` scoped per browser session cookie.

2. webapp: broker support (keep GIS as fallback)
   - Extend `GoogleAuthProvider` to support 2 modes:
     - `gis`: current client-side GIS token flow.
     - `broker`: redirect-based connect + backend-issued access tokens (with refresh scheduling).
   - Make `SyncProvider` stable across token refresh:
     - Use a token ref + `GoogleDriveService` token provider so token refresh does not recreate `SyncManager`.

3. webapp: sync touch fix
   - When updating `segments` (correction/speaker labels), also touch the parent transcription `updatedAt`.

## Verification

- `cd webapp && npm test`
- `cd webapp && npm run lint`
- `cd webapp && npm run build`
- `python -m compileall python_api/api_server`

## Open Questions

- `access-token` is now scoped by an HttpOnly session cookie (`malsori_gdrive_session`). This is not a full auth system; production deployments should still enforce access control at the ingress/network layer.
- Should scopes default to `drive.file` only, or include `openid email profile` for better account identity UX?
