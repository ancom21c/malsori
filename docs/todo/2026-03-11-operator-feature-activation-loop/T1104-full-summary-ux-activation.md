# T1104 - Full Summary UX Activation

## Spec

### 문제

- summary surface는 shell과 helper copy는 있지만, full summary 요청/재생성/preset 변경을 사용자 관점에서 끝낼 수 있는 UX가 아직 없다.
- capability ready 상태에서도 rail이 실제 workflow를 안내하지 못하면 feature가 살아 있어도 가치가 약하다.

### 목표

- detail/realtime summary surface에서 full summary 요청, regenerate, preset override를 명확히 제공한다.
- summary visible/hidden/helper states가 flag/capability/binding readiness와 맞게 보이도록 한다.

### 범위

- 포함:
  - summary rail open/close / empty / pending / ready / stale / failed UX
  - preset selector / auto-selected 표시 / manual override
  - source-linked block rendering과 transcript jump affordance
  - full summary regenerate / apply-from-now vs regenerate-all copy
- 제외:
  - realtime summary execution
  - translate UI

### 해결방안

- detail rail을 full summary의 primary surface로 삼는다.
- realtime workspace에는 compact summary surface를 유지하되 full summary action을 detail semantics와 맞춘다.
- preset 변경과 regenerate 액션은 helper copy로 현재 범위를 분명히 드러낸다.
- summary block은 source turn/snippet 근거를 통해 transcript 구간으로 jump 할 수 있어야 한다.

### 수용 기준 (AC)

- [x] full summary UX의 상태, action, visibility 규칙이 명시된다.
- [x] preset override와 regenerate semantics가 범위에 포함된다.
- [x] source-linked block rendering과 transcript jump affordance가 범위에 포함된다.
- [x] capability-off / binding-misconfigured safe default가 helper UX로 정리된다.

## Plan

1. full summary rail의 primary states와 action hierarchy를 정의한다.
2. preset selector, auto/manual label, regenerate copy를 정한다.
3. source-linked blocks와 transcript jump affordance를 정한다.
4. detail/realtime surface 차이를 정리하되 동일한 domain semantics를 유지한다.
5. smoke가 읽을 수 있는 visibility helper contract를 남긴다.

## Review Checklist (Plan Review)

- [x] rail이 transcript viewport의 primary ownership을 침범하지 않는가?
- [x] preset 변경과 regenerate semantics가 혼동되지 않는가?
- [x] summary block의 source evidence가 transcript jump affordance로 연결되는가?
- [x] hidden/disabled/helper state가 capability/binding readiness와 일치하는가?
- [x] realtime summary task와 범위가 겹치지 않는가?

## Self Review 1 - Scope Fit

- [x] full summary execution 직후 필요한 UX activation이라 P1로 적절하다.
- [x] realtime summary 없이도 독립 구현 가능한 surface만 담았다.

## Self Review 2 - Safety

- [x] hidden/disabled/helper state를 명시해 provider 미준비 상태의 UX leakage를 막는다.
- [x] transcript primary flow를 해치지 않는 rail/sheet 원칙을 유지한다.

## Self Review 3 - Executability

- [x] page model, component surface, translations, smoke assertions으로 바로 분해 가능하다.
- [x] summary execution task(T1103)와 read/write 경계가 분명하다.

## Implementation Log

summary surface shell은 이미 있으며, 남은 일은 provider-backed execution 위에 실제 action surface를 올리는 것이다.

- [x] detail/realtime summary rail/sheet shell, 상태 렌더링, source-linked block jump affordance foundation을 구현했다.
- [x] capability-off / binding-misconfigured helper states를 정리했다.
- [x] full summary request / regenerate / retry action surface를 detail/realtime summary surface에 연결했다.
- [x] preset selector / auto-manual label / apply-from-now vs regenerate-all helper/action UX를 구현했다.

## Review Checklist (Implementation Review)

- [x] rail이 empty/pending/ready/stale/failed를 혼동 없이 보여주는가?
- [x] preset override와 regenerate가 잘못된 범위로 실행되지 않는가?
- [x] source-linked block interaction이 transcript reading flow를 방해하지 않는가?
- [x] mobile/desktop에서 transcript primary surface를 밀어내지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- src/components/summary/SummarySurface.test.tsx src/components/summary/summarySurfaceModel.test.ts src/pages/sessionArtifactLifecycleModel.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [ ] `RUN_UI_SMOKE=1 EXPECT_SESSION_ARTIFACTS_MODE=visible ./scripts/post-deploy-smoke.sh`
