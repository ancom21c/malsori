# T1107 Rollout Smoke Note

## Metadata

- Date: `2026-03-12`
- Commit: `a31ad0569411e006184ee5dd9706f3a3f3199354`
- Base URL: `https://malsori.ancom.duckdns.org`
- Internal Base URL: `(not configured)`
- Session Artifacts Mode: `hidden`
- Translate Route Mode: `redirect`
- Backend Admin Token Present: `false`

## Commands

- `RUN_SMOKE=0 ./infra/deploy/local/deploy-dev.sh`
- `RUN_UI_SMOKE=1 UI_SMOKE_SCREENSHOT_DIR="docs/todo/2026-03-11-operator-feature-activation-loop/evidence/t1107-rollout-smoke/20260312/ui" ./scripts/post-deploy-smoke.sh`

## Checks

- public `/v1/backend/*` blocked: `pass` (`backend_admin_enabled=false`, public path blocked/disabled)
- public `/v1/observability/runtime-error` blocked: `pass`
- internal `/v1/backend/profiles|bindings|capabilities` auth contract: `not verified` (internal ingress/admin surface not configured in current values)
- summary visibility mode: `pass` (`hidden`)
- translate route mode: `pass` (`redirect -> /capture/realtime`)
- core STT routes (`/`, `/realtime`, `/settings`, `/transcriptions/:id`) no-regression: `pass`

## Artifacts

- `smoke.log`
- `ui/desktop-root.png`
- `ui/desktop-settings.png`
- `ui/desktop-realtime.png`
- `ui/desktop-capture.png`
- `ui/desktop-capture-realtime.png`
- `ui/desktop-capture-file.png`
- `ui/desktop-translate.png`
- `ui/desktop-transcriptions-smoke-detail-empty.png`
- `ui/desktop-transcriptions-smoke-detail-ready.png`
- `ui/desktop-sessions-smoke-detail-empty.png`
- `ui/desktop-sessions-smoke-detail-ready.png`
- `ui/mobile-root.png`

## Rollback Readiness

- `VITE_FEATURE_SESSION_ARTIFACTS=false` fallback 확인: current deploy already validates the fail-closed `hidden` mode
- `VITE_FEATURE_REALTIME_TRANSLATE=false` fallback 확인: current deploy already validates the fail-closed `redirect` mode
- capability/binding rollback plan 확인: not exercised in this deploy; operator admin surface remains closed
- internal admin surface closeout plan 확인: pending separate deploy with internal ingress/admin token wiring
