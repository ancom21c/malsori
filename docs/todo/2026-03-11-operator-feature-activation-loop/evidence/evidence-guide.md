# Operator Feature Activation Evidence

이 디렉터리는 active operator activation loop에서 publish-worthy rollout evidence만 보관한다.

## Storage Convention

- 경로: `docs/todo/2026-03-11-operator-feature-activation-loop/evidence/t1107-rollout-smoke/<yyyymmdd>/`
- 필수 산출물:
  - `smoke.log`
  - `smoke-note.md`
  - `ui/` 아래 UI smoke screenshot
- 선택 산출물:
  - internal/public ingress별 추가 curl output 요약
  - operator panel 또는 translate/detail route 보조 screenshot

## Command Convention

- `smoke.log`에는 실제 실행한 `./scripts/post-deploy-smoke.sh` 표준 출력/에러를 그대로 남긴다.
- `smoke-note.md`에는 아래 metadata를 같이 남긴다.
  - 실행 시각
  - commit SHA
  - public `BASE_URL`
  - internal `INTERNAL_BASE_URL`
  - `EXPECT_SESSION_ARTIFACTS_MODE`
  - `EXPECT_TRANSLATE_ROUTE_MODE`
  - `BACKEND_ADMIN_TOKEN` 사용 여부만 기록 (`present=true|false`), 실제 값은 금지
- UI smoke를 켠 경우 `UI_SMOKE_SCREENSHOT_DIR`를 같은 날짜 폴더의 `ui/`로 맞춘다.

## Suggested Command

```bash
mkdir -p docs/todo/2026-03-11-operator-feature-activation-loop/evidence/t1107-rollout-smoke/20260312/ui

RUN_UI_SMOKE=1 \
INTERNAL_BASE_URL="https://internal.example" \
EXPECT_SESSION_ARTIFACTS_MODE=visible \
EXPECT_TRANSLATE_ROUTE_MODE=enabled \
UI_SMOKE_SCREENSHOT_DIR="docs/todo/2026-03-11-operator-feature-activation-loop/evidence/t1107-rollout-smoke/20260312/ui" \
./scripts/post-deploy-smoke.sh \
  2>&1 | tee "docs/todo/2026-03-11-operator-feature-activation-loop/evidence/t1107-rollout-smoke/20260312/smoke.log"
```

실제 deploy에서는 위 실행 뒤 `smoke-note.md`를 같은 폴더에 추가하고, public blocked 결과와 internal admin 결과를 분리해 적는다.
