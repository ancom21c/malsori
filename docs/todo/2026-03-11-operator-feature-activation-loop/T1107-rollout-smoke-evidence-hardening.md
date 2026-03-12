# T1107 - Rollout Smoke / Evidence Hardening

## Spec

### 문제

- internal admin surface, summary visible mode, translate enabled mode가 열리면 기존 smoke만으로는 rollout boundary를 충분히 증명하기 어렵다.
- 구현은 되어도 deploy evidence가 없으면 rollback 기준이 흔들린다.

### 목표

- internal/public/admin/summary/translate visibility를 함께 검증하는 smoke matrix와 evidence 경로를 정리한다.
- operator activation과 additive feature activation의 rollback 기준을 문서/스크립트로 남긴다.

### 범위

- 포함:
  - smoke matrix 확장
  - UI smoke visibility assertions
  - internal host evidence / screenshot / log conventions
  - rollout/rollback operator checklist
- 제외:
  - feature provider prompt tuning
  - 장기 observability platform 구축

### 해결방안

- smoke는 public blocked, internal admin enabled, summary visible/hidden, translate enabled/redirect를 모두 다룬다.
- evidence는 deploy 시점 기준 screenshot/log/command를 묶어 보관한다.
- rollback은 flag/capability/internal surface toggle 순서를 명시한다.

### 수용 기준 (AC)

- [x] smoke/evidence hardening의 목표와 범위가 고정된다.
- [x] summary/translate/admin visibility modes가 smoke 대상에 포함된다.
- [x] rollback checklist가 범위에 포함된다.

## Plan

1. smoke matrix에 internal/public/admin/summary/translate 조합을 추가한다.
2. UI smoke가 summary visible/hidden, translate enabled/redirect를 읽도록 확장한다.
3. evidence 저장 위치와 명령 기록 규칙을 정한다.
4. rollback checklist를 operator/deploy 관점으로 정리한다.

## Review Checklist (Plan Review)

- [x] smoke가 provider readiness failure와 route visibility failure를 구분하는가?
- [x] internal host evidence와 public host evidence가 분리되는가?
- [x] rollback 순서가 feature flag/capability/internal surface toggle과 정렬되는가?
- [x] core STT smoke가 additive smoke에 가려지지 않는가?

## Self Review 1 - Scope Fit

- [x] activation 루프 마지막 게이트로서 독립 task가 필요하다.
- [x] summary/translate/operator activation 결과를 하나의 evidence 체계로 묶는다.

## Self Review 2 - Safety

- [x] public exposure와 wrong route mode를 smoke에서 바로 차단한다.
- [x] rollback 기준을 명시해 deploy confusion을 줄인다.

## Self Review 3 - Executability

- [x] smoke script, UI smoke script, docs/evidence template로 바로 분해 가능하다.
- [x] deploy 단계에서 반복 실행 가능한 verify 기준을 남긴다.

## Implementation Log

- [x] smoke matrix와 UI smoke assertions에 admin boundary, session artifact rail mode, translate route mode를 반영했다.
- [x] evidence 저장 위치와 deploy log convention을 operator loop 문서에 정리했다.
- [x] rollback checklist를 operator/deploy 관점으로 최종 고정했다.
- [x] local verify가 빈 env pass로 흐르지 않도록 binding fixture JSON을 추가했다.

## Review Checklist (Implementation Review)

- [x] summary visible/hidden, translate enabled/redirect, admin public blocked/internal enabled 조합이 모두 검증되는가?
- [x] smoke failure 메시지가 어떤 gate가 깨졌는지 바로 설명하는가?
- [x] additive smoke가 core STT smoke를 대체하지 않고 보강만 하는가?

## Verify

- [x] `python3 -m py_compile scripts/post-deploy-ui-smoke.py`
- [x] `bash -n scripts/post-deploy-smoke.sh`
- [x] `npm --prefix webapp run bindings:check -- --profiles-file scripts/fixtures/operator-rollout-profiles.json --bindings-file scripts/fixtures/operator-rollout-bindings.json --require-feature artifact.summary`
- [x] `npm --prefix webapp run bindings:check -- --profiles-file scripts/fixtures/operator-rollout-profiles.json --bindings-file scripts/fixtures/operator-rollout-bindings.json --require-feature translate.turn_final`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
- [ ] `RUN_UI_SMOKE=1 INTERNAL_BASE_URL=<internal-base> EXPECT_SESSION_ARTIFACTS_MODE=visible EXPECT_TRANSLATE_ROUTE_MODE=enabled ./scripts/post-deploy-smoke.sh`
