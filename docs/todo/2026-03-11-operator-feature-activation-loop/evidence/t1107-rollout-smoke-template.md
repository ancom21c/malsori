# T1107 Rollout Smoke Note

## Metadata

- Date: `YYYY-MM-DD`
- Commit: `<git-sha>`
- Base URL: `<public-base-url>`
- Internal Base URL: `<internal-base-url>`
- Session Artifacts Mode: `hidden|visible|skip`
- Translate Route Mode: `redirect|enabled|skip`
- Backend Admin Token Present: `true|false`

## Commands

- `RUN_UI_SMOKE=1 INTERNAL_BASE_URL=<internal-base> EXPECT_SESSION_ARTIFACTS_MODE=<mode> EXPECT_TRANSLATE_ROUTE_MODE=<mode> UI_SMOKE_SCREENSHOT_DIR=<path> ./scripts/post-deploy-smoke.sh`
- 추가 수동 확인 명령이 있으면 여기에 기록

## Checks

- public `/v1/backend/*` blocked:
- public `/v1/observability/runtime-error` blocked:
- internal `/v1/backend/profiles|bindings|capabilities` auth contract:
- summary visibility mode:
- translate route mode:
- core STT routes (`/`, `/realtime`, `/settings`, `/transcriptions/:id`) no-regression:

## Artifacts

- `smoke.log`
- `ui/desktop-root.png`
- `ui/mobile-root.png`
- 추가 screenshot / operator panel screenshot 경로

## Rollback Readiness

- `VITE_FEATURE_SESSION_ARTIFACTS=false` fallback 확인:
- `VITE_FEATURE_REALTIME_TRANSLATE=false` fallback 확인:
- capability/binding rollback plan 확인:
- internal admin surface closeout plan 확인:
