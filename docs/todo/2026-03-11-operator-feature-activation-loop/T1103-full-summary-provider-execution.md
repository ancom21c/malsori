# T1103 - Full Summary Provider-Backed Execution

## Spec

### 문제

- summary의 domain contract, preset contract, stale lifecycle은 정리됐지만 실제 provider-backed full summary 실행 경로는 없다.
- detail rail은 아직 placeholder/persisted shell에 머물러 있다.

### 목표

- `artifact.summary` binding을 통해 full summary run을 실제로 생성하고, run history/published summary를 저장한다.
- summary failure는 additive artifact로 격리하고 transcript core는 계속 읽을 수 있게 한다.

### 범위

- 포함:
  - full summary request/response contract
  - backend binding resolution (`artifact.summary`)
  - provider adapter / audit metadata / persisted run result
  - structured summary blocks / supporting snippets / language-aware output metadata
  - published summary update와 error isolation
- 제외:
  - realtime summary partition execution
  - translate execution

### 해결방안

- full summary는 우선 세션 전체 scope로 실행한다.
- preset 선택과 binding resolution은 request metadata에 함께 남긴다.
- 결과는 `SummaryRun + PublishedSummary`로 저장하고 detail rail read model이 이를 읽는다.
- provider result는 preset별 structured block schema와 source-linked snippets를 보존해야 한다.

### 수용 기준 (AC)

- [x] full summary vertical slice의 API/runtime/storage 경계가 문서화된다.
- [x] `artifact.summary` binding resolution과 audit metadata가 범위에 포함된다.
- [x] structured blocks, supporting snippets, language-aware output metadata가 범위에 포함된다.
- [x] failure isolation과 stale/published summary 갱신 규칙이 명시된다.

## Plan

1. full summary request/response DTO와 provider-neutral adapter를 정한다.
2. `artifact.summary` binding resolution과 provider invocation 경계를 고정한다.
3. run history, published summary, error metadata persistence 규칙을 정한다.
4. structured block output, supporting snippets, output language metadata를 persistence/read model에 포함한다.
5. detail rail이 provider-backed 결과를 읽는 read model과 연결한다.

## Review Checklist (Plan Review)

- [x] preset과 provider/model binding이 분리되는가?
- [x] published summary와 historical run의 역할이 유지되는가?
- [x] existing summary spec의 structured output / supporting snippet contract를 보존하는가?
- [x] provider failure가 transcript/detail core failure로 전이되지 않는가?
- [x] realtime summary 없이도 full summary가 독립적으로 shipping 가능한가?

## Self Review 1 - Scope Fit

- [x] summary를 실제 사용자 가치로 전환하는 첫 vertical slice라 P0가 맞다.
- [x] realtime summary보다 먼저 구현해야 한다는 순서를 반영했다.

## Self Review 2 - Safety

- [x] binding resolution과 audit metadata를 포함해 운영 재현성을 남긴다.
- [x] source-linked output과 language-aware metadata까지 남겨 이후 UX task와 연결된다.
- [x] published summary overwrite 대신 stale/failure separation을 유지한다.

## Self Review 3 - Executability

- [x] provider adapter, persistence, read model, detail UI가 자연스럽게 분해된다.
- [x] backend/frontend 테스트를 각각 둘 수 있다.

## Implementation Log

local `SummaryRun + PublishedSummary` persistence/read-model foundation과 summary rail shell은 prior loop에서 landed 상태다. 이번 task의 잔여 범위는 provider-backed execution을 실제로 연결하는 것이다.

- [x] local summary repository, published summary read model, summary rail shell foundation이 준비돼 있다.
- [x] public `POST /v1/summary/full` request/response DTO, binding resolution, provider-backed adapter를 구현했다.
- [x] `artifact.summary` binding resolution과 run persistence를 provider invocation에 연결했다.
- [x] structured summary blocks, supporting snippets, output language metadata를 실제 provider result로 저장한다.
- [x] detail rail에서 full mode를 실제로 선택했을 때 current source revision 기준으로 auto-run을 시작하고, success/failure를 `SummaryRun + PublishedSummary`로 저장하도록 end-to-end 연결했다.

## Review Checklist (Implementation Review)

- [x] summary provider unavailable 상태에서 rail이 pending/failed helper로만 남는가?
- [x] structured blocks와 supporting snippets가 preset schema와 어긋나지 않는가?
- [x] published summary와 run history가 꼬이지 않는가?
- [x] binding 미설정 상태가 broken request가 아니라 disabled helper로 드러나는가?

## Verify

- [x] `npm --prefix webapp run test -- src/services/api/rtzrApiClient.test.ts src/services/data/summaryRepository.test.ts src/domain/session.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `python3 -m unittest discover -s python_api/tests`
- [x] `python3 -m compileall python_api/api_server`
- [ ] `RUN_UI_SMOKE=1 EXPECT_SESSION_ARTIFACTS_MODE=visible ./scripts/post-deploy-smoke.sh`
