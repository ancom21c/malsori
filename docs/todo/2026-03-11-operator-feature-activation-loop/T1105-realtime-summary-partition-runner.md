# T1105 - Realtime Summary Partition Runner

## Spec

### 문제

- summary spec은 realtime mode와 contiguous partition contract를 정의했지만, 실제 execution runner와 partition trigger policy는 아직 없다.
- full summary만 구현하면 진행 중 요약 가치와 stale regeneration UX는 남는다.

### 목표

- contiguous partition 기반 realtime summary runner를 구현한다.
- debounce, partition finalize, stale regeneration, published/live summary 구분을 실제 runtime에 반영한다.

### 범위

- 포함:
  - partition trigger policy
  - draft/updating/ready/stale lifecycle
  - realtime summary run scheduling / retry / timeout
  - selected preset / output language traceability across live runs
  - stale partition regenerate action
- 제외:
  - translate execution
  - partial realtime translation

### 해결방안

- realtime 중에는 최대 하나의 active mutable partition만 유지한다.
- trigger는 turn count, silence gap, session end, correction/late-final mutation을 조합한다.
- published full summary와 realtime draft summary는 같은 rail 안에서 copy/state로 구분한다.
- realtime summary run도 current preset selection과 output language metadata를 함께 남겨야 한다.

### 수용 기준 (AC)

- [x] realtime summary runner의 partition/lifecycle/scheduling 규칙이 문서화된다.
- [x] live run의 preset/output language traceability가 범위에 포함된다.
- [x] stale regeneration과 full summary의 관계가 범위에 포함된다.
- [x] additive failure isolation이 유지된다.

## Plan

1. active partition / finalized partition / stale partition lifecycle을 실행 규칙으로 내린다.
2. debounce, timeout, retry, token budget ceiling을 runtime policy로 정한다.
3. realtime summary run의 preset/output language traceability를 저장 규칙으로 정한다.
4. realtime summary 결과와 full summary 결과의 surface/copy 경계를 정한다.
5. correction/late-final mutation이 stale propagation으로 이어지게 한다.

## Review Checklist (Plan Review)

- [x] partition이 contiguous range 규칙을 지키는가?
- [x] full summary와 realtime summary가 서로 덮어쓰지 않는가?
- [x] live run에서도 preset/output language metadata가 추적 가능한가?
- [x] correction/late-final이 silent overwrite가 아니라 stale propagate로 처리되는가?
- [x] 비용/지연 가드레일이 범위에 포함되는가?

## Self Review 1 - Scope Fit

- [x] full summary 다음 단계로서 적절한 별도 task다.
- [x] execution runner와 UX copy를 summary full task와 분리했다.

## Self Review 2 - Safety

- [x] debounce/retry/token budget을 명시해 runaway execution을 막는다.
- [x] stale propagation을 사용해 hidden data loss를 피한다.

## Self Review 3 - Executability

- [x] runtime policy, repository mutation, rail UX, tests로 구현 경로가 나뉜다.
- [x] partition contract(T1001)과 runtime lifecycle(T1004)을 직접 재사용한다.

## Implementation Log

contiguous partition, freshness, stale/regenerate domain foundation은 prior loop에서 landed 상태다. 이번 task는 그 contract 위에 실제 runner를 붙이는 단계다.

- [x] contiguous partition, freshness, stale/regenerate contract foundation이 준비돼 있다.
- [x] partition trigger / finalize / stale propagation runner를 구현한다.
- [x] realtime summary scheduling, retry, timeout, token budget policy를 구현한다.
- [x] live run preset/output language traceability를 persistence/read model에 연결한다.
- [x] realtime summary surface와 full summary surface의 state/copy 분리를 구현한다.

## Review Checklist (Implementation Review)

- [x] active mutable partition이 하나만 유지되는가?
- [x] realtime summary run metadata가 preset/output language 기준으로 재현 가능한가?
- [x] correction/late-final 이후 stale 상태와 regenerate path가 맞게 보이는가?
- [x] realtime summary failure가 capture/session core failure로 보이지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- src/domain/summaryRuntime.test.ts src/services/data/summaryRepository.test.ts src/components/summary/summarySurfaceModel.test.ts src/pages/sessionArtifactLifecycleModel.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [ ] `RUN_UI_SMOKE=1 EXPECT_SESSION_ARTIFACTS_MODE=visible ./scripts/post-deploy-smoke.sh`
