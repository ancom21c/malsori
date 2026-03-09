# T603 Smoke Note (2026-03-06)

## Scope

- operator settings safe default
- manual refresh intent
- internal-only boundary UX

## Evidence

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`

## Code-path review

- backend availability health check is isolated in `handleRefreshBackendAvailability()` and only wired to page entry / explicit refresh.
- admin state fetch is isolated in `handleRefreshBackendState()` and only invoked from button click handlers.
- `backendAdminToken` is no longer part of the effect dependency chain, so typing the token does not retrigger network calls.
- backend tab remains visible even when admin is unavailable; the section now explains the internal-only boundary and keeps operator controls gated.

## Notes

- This note is based on code-path verification plus lint/build gates in this turn.
- Browser-level smoke for the settings page is better done after deployment against the real internal admin host.
