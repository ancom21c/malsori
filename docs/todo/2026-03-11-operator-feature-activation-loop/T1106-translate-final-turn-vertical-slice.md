# T1106 - Translate Final-Turn Vertical Slice

## Spec

### 문제

- `/translate`는 현재 shell/redirect contract만 있고 provider-backed execution이 없다.
- translate를 partial/live까지 한 번에 열면 summary와 동시에 scope가 과도하게 커진다.

### 목표

- `translate.turn_final` capability만 먼저 구현해 `/translate` route를 실제 동작하는 additive surface로 만든다.
- provider failure는 translate surface에만 격리하고 realtime capture core는 유지한다.

### 범위

- 포함:
  - `translate.turn_final` binding resolution
  - `/translate` route enablement contract
  - final-turn translation request/result surface
  - target language selection / output metadata
  - original transcript와 translation result의 분리 규칙
  - pending/disabled/misconfigured helper states
- 제외:
  - `translate.turn_partial`
  - summary realtime execution

### 해결방안

- `/translate`는 flag+capability+binding readiness가 모두 준비될 때만 enabled로 연다.
- initial vertical slice는 final turn 결과만 append/update 한다.
- translation 결과는 original transcript와 별도 surface/state로 유지한다.
- partial/live translation은 후속 capability로 남긴다.

### 수용 기준 (AC)

- [x] `translate.turn_final` vertical slice의 scope와 route contract가 고정된다.
- [x] redirect vs enabled mode 전환 기준이 문서화된다.
- [x] target language/output metadata와 original transcript 분리 규칙이 범위에 포함된다.
- [x] failure isolation과 helper states가 범위에 포함된다.

## Plan

1. `translate.turn_final` binding resolution과 request/response DTO를 정한다.
2. target language selection/output metadata와 original transcript separation을 정한다.
3. `/translate` route enablement 조건과 helper fallback UX를 정한다.
4. final-turn translation result surface와 failure isolation을 구현 단위로 분해한다.
5. translate partial/live는 후속 범위로 명시적으로 남긴다.

## Review Checklist (Plan Review)

- [x] `/translate` enabled 조건이 flag+capability+binding readiness와 일치하는가?
- [x] final-turn only scope가 partial/live translation과 혼동되지 않는가?
- [x] translation result가 원문 transcript를 덮어쓰지 않는가?
- [x] provider failure가 realtime capture core에 전이되지 않는가?
- [x] redirect rollback 경로가 유지되는가?

## Self Review 1 - Scope Fit

- [x] summary 이후의 다음 additive feature로 적절한 P1 task다.
- [x] partial/live translation을 제외해 scope를 통제했다.

## Self Review 2 - Safety

- [x] redirect rollback을 유지해 미완성 상태 노출을 막는다.
- [x] helper/disabled 상태를 포함해 provider unready leakage를 줄인다.
- [x] 원문 transcript와 translation surface를 분리해 데이터 훼손 리스크를 줄인다.

## Self Review 3 - Executability

- [x] route gating, runtime DTO, provider adapter, translate UI로 구현 경로가 분명하다.
- [x] smoke route mode와 직접 연결된다.

## Implementation Log

translate shell은 이미 있으며, 현재는 route/binding presentation만 있고 provider-backed execution이 없는 상태다.

- [x] `/translate` redirect shell과 source-first workspace fallback surface를 구현했다.
- [x] translate binding readiness presentation(`translate.turn_final`, `translate.turn_partial`)을 구현했다.
- [x] `/translate` enabled 조건을 flag-only shell에서 binding/capability-aware execution gate로 바꾼다.
- [x] `translate.turn_final` provider adapter와 target language/output contract를 구현한다.
- [x] final-turn translation result surface와 helper states를 실제 execution 결과에 연결한다.

## Review Checklist (Implementation Review)

- [x] `/translate`가 enabled일 때만 shell을 열고, 아니면 정확히 redirect 하는가?
- [x] final-turn translation failure가 capture/session core를 깨지 않는가?
- [x] 번역 결과와 원문 transcript가 서로 덮어쓰지 않는가?
- [x] partial/live translation이 암묵적으로 노출되지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- src/app/platformCapabilities.test.ts src/pages/TranslatePage.test.tsx src/pages/translateBindingModel.test.ts src/pages/translateWorkspaceModel.test.ts src/services/api/rtzrApiClient.test.ts src/services/data/translationRepository.test.ts`
- [x] `python3 -m unittest discover -s python_api/tests`
- [x] `python3 -m compileall python_api/api_server`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [ ] `RUN_UI_SMOKE=1 EXPECT_TRANSLATE_ROUTE_MODE=enabled ./scripts/post-deploy-smoke.sh`
