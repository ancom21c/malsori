# T1004 - Summary Runtime Freshness + Regeneration Lifecycle

## Spec

### 문제

- realtime summary update cadence, stale marking, regenerate flow가 고정돼 있지 않다.
- transcript correction과 late-final turn이 들어올 때 현재 summary를 어떻게 취급할지 계약이 없다.

### 목표

- realtime/full summary lifecycle을 request/run/freshness 관점에서 정리한다.
- stale marking과 regenerate/apply-from-now flow를 deterministic 하게 정의한다.

### 범위

- 포함:
  - realtime debounce / batch / min partition size
  - stale marking rule
  - regenerate / retry / apply-from-now / rerun-all contract
  - provider timeout/retry/fallback의 binding-level owner 정리
- 제외:
  - provider별 품질 튜닝
  - evaluation dataset 설계

### 해결방안

- realtime summary는 active mutable partition + finalized partition 위에서 점진 갱신한다.
- transcript 변경은 silent overwrite 대신 stale marking으로 surface에 드러낸다.
- regenerate와 preset change는 scope를 명시적으로 구분한다.
- timeout/retry/fallback은 binding 수준 운영 계약으로 문서화한다.

### 상세 설계

#### A. Request Scheduling

- realtime mode
  - active mutable partition에 대해 debounce window를 둔다
  - partition finalized 또는 session milestone에서 run을 발행한다
- full mode
  - file ready / realtime stop-save 이후를 기본 발행 지점으로 본다
  - operator or user explicit regenerate도 허용한다

#### B. Freshness Model

- `fresh`
  - summary run이 current sourceRevision을 기반으로 함
- `stale`
  - partition 또는 session-level sourceRevision mismatch 발생
- `failed`
  - latest run failed but previous published summary may still exist
- `pending/updating`
  - new run requested and result awaiting

#### C. Mutation Triggers

- source transcript mutation trigger 예시:
  - late-final turn ingest
  - corrected text edit
  - speaker relabel
  - partition boundary change
- mutation은 affected partition scope를 먼저 계산하고, 필요 시 session-level full summary까지 stale로 올린다.

#### D. User Action Scopes

- `regenerate block`
  - stale/failed block 또는 partition 단위
- `regenerate summary`
  - mode scope 전체 재생성
- `apply preset from now`
  - new runs only
- `rerun all`
  - 기존 partition/full summary까지 재생성

#### E. Operational Guardrails

- binding-level `timeoutMs`, `retryPolicy`, `fallbackBackendProfileId`를 runtime owner로 둔다.
- UI는 retry/fallback policy를 직접 결정하지 않고, status와 next action만 표현한다.
- repeated failure는 summary surface만 degraded/disabled 처리한다.

### 수용 기준 (AC)

- [ ] realtime summary update cadence와 batching rule이 문서화된다.
- [ ] stale marking trigger가 transcript correction/late-final turn 기준으로 정의된다.
- [ ] regenerate / apply-from-now / rerun-all 세 경로가 구분된다.
- [ ] failure isolation과 binding-level retry/fallback owner가 명시된다.

## Plan (Review 대상)

1. realtime/full request scheduling을 먼저 분리한다.
2. source mutation trigger와 stale propagation scope를 정의한다.
3. user action scope(block/summary/from-now/rerun-all)를 구분한다.
4. binding-level retry/fallback owner와 UI owner를 분리한다.
5. failure isolation을 verify 항목까지 연결한다.

## Review Checklist (Plan Review)

- [x] transcript correction이 summary를 silently rewrite하지 않는가?
- [x] regenerate scope가 명시적이며 user가 이해 가능한가?
- [x] timeout/retry/fallback owner가 UI와 operator binding 사이에서 섞이지 않는가?
- [x] source mutation trigger와 stale propagation 범위가 빠지지 않았는가?

## Self Review 1 - Scope Fit

- [x] summary vertical slice에서 domain 다음으로 중요한 contract라 P1이 적절하다.
- [x] UX task(T1003)와 runtime task를 분리해 회귀 범위를 줄였다.

## Self Review 2 - Safety / Isolation

- [x] failure isolation과 retry/fallback owner를 분리해 summary 문제가 core STT로 번지지 않게 했다.
- [x] source mutation이 silent overwrite가 아니라 stale marking으로 드러나게 했다.
- [x] block-level/session-level regenerate scope를 구분해 과잉 재생성을 피하게 했다.

## Self Review 3 - Executability

- [x] scheduling, mutation, user actions, operator guardrails 네 축으로 구현 순서가 분명하다.
- [x] T1001/T1002/T1003가 제공하는 contract를 그대로 소비하도록 경계를 맞췄다.
- [x] verify 항목이 runtime-focused tests와 standard gates에 연결된다.

## Implementation Log

- [ ] summary request scheduler / lifecycle state를 구현한다.
- [ ] stale marking / regenerate action flow를 연결한다.
- [ ] mutation trigger와 stale propagation scope를 구현한다.
- [ ] timeout/retry/fallback behavior를 binding/runtime에 반영한다.

## Review Checklist (Implementation Review)

- [ ] stale state가 additive artifact rail로만 노출되는가?
- [ ] repeated retries가 transcript performance를 해치지 않는가?
- [ ] preset 변경과 regenerate가 서로 다른 scope로 동작하는가?

## Verify

- [ ] `npm --prefix webapp run test -- summary runtime`
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run build`
