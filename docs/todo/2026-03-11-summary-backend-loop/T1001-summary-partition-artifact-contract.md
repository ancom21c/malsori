# T1001 - Summary Partition / Artifact Contract

## Spec

### 문제

- current codebase에는 `SessionArtifact(type=summary)` placeholder만 있고, contiguous partition 기반 summary model이 없다.
- realtime/full summary를 붙이려면 partition, run history, stale source revision 같은 기본 contract가 먼저 고정돼야 한다.

### 목표

- summary를 contiguous turn partition 위에서 설명 가능한 domain/model contract로 만든다.
- realtime/full summary가 같은 artifact surface 위에서 coexist 할 수 있는 저장/API 기준을 만든다.

### 범위

- 포함:
  - `SummaryPartition`, `SummaryRun`, `SummaryBlock` 권장 모델 확정
  - `SessionArtifact(type=summary)` 확장 기준 정의
  - source revision / stale marking / supporting snippet contract
- 제외:
  - provider prompt 본문 최적화
  - preset 선택 UI 자체

### 해결방안

- summary는 contiguous turn range만 참조하는 partition을 canonical unit으로 둔다.
- published summary와 historical run을 분리해 latest result와 audit trail을 동시에 보존한다.
- transcript correction/late final turn은 overwrite가 아니라 stale marking으로 표현한다.

### 상세 설계

#### A. Domain Entity Split

- `SummaryPartition`
  - `id`, `sessionId`, `startTurnId`, `endTurnId`, `turnCount`
  - `startedAt`, `endedAt`
  - `status`: `draft | finalized | stale`
  - `reason`: `manual | silence_gap | speaker_shift | topic_shift | max_turns | max_duration | token_budget | session_end`
  - `sourceRevision`
- `SummaryRun`
  - `id`, `sessionId`, `mode`, `partitionIds | fullSessionScope`
  - `presetId`, `presetVersion`
  - `providerLabel`, `model`
  - `requestedAt`, `completedAt`, `status`, `errorMessage`
- `SummaryBlock`
  - `id`, `runId`, `kind`, `title`, `content`
  - `supportingSnippets`
- `PublishedSummary`
  - current detail/realtime surface가 읽는 최신 published summary snapshot

#### B. Existing Model Bridge

- `SessionArtifact(type=summary)`는 current published summary surface를 표현한다.
- `SessionArtifact.requests`는 `SummaryRun` history를 브리지하는 read model로 사용한다.
- `supportingSnippets`는 artifact-level rollup 또는 selected block preview를 표현한다.
- current placeholder summary artifact는 additive migration으로 새 model을 읽을 수 있을 때만 upgrade 한다.

#### C. State Derivation

- partition status:
  - `draft`: live capture 중 아직 mutable
  - `finalized`: summary 생성 기준으로 안정화된 구간
  - `stale`: source turn mutation으로 재생성이 필요한 구간
- artifact status:
  - `pending`: published summary가 아직 없고 실행 중
  - `ready`: published summary available
  - `failed`: latest run failed but transcript core는 계속 usable
- stale partition이 존재하면 published summary는 유지하되 freshness helper를 함께 노출한다.

#### D. Persistence / API Direction

- storage는 additive migration만 허용한다.
- summary tables를 별도로 추가하든 artifact payload를 확장하든, legacy detail read path가 summary 필드 부재로 깨지면 안 된다.
- API DTO는 partition/run/block를 직접 드러내거나, frontend adapter가 같은 의미 구조로 정규화할 수 있어야 한다.

#### E. Safe Default / Rollback

- capability 또는 binding이 없으면 summary rail은 hidden/disabled다.
- summary store migration 실패 시 transcript/detail load를 막지 않고 summary만 unavailable로 내린다.

### 수용 기준 (AC)

- [x] summary partition 필드와 status/reason/sourceRevision contract가 문서상 고정된다.
- [x] realtime/full summary가 같은 artifact model 위에서 공존 가능한 구조로 정리된다.
- [x] supporting snippet과 summary run/audit trail의 역할이 분리된다.
- [x] core transcript/detail flow를 침범하지 않는 additive rule이 명시된다.

## Plan (Review 대상)

1. 현재 `SessionArtifact` / `ArtifactRequestRecord`와 new summary entities의 역할을 명시적으로 분리한다.
2. partition fields/status/reason/sourceRevision을 domain contract로 먼저 고정한다.
3. published summary와 run history 사이의 derivation rule을 정한다.
4. stale marking이 artifact status와 transcript core UX에 어떻게 반영되는지 연결한다.
5. additive migration / rollback / capability-off safe default를 verify 관점까지 명시한다.

## Review Checklist (Plan Review)

- [x] partition이 contiguous range만 허용하는가?
- [x] published artifact와 historical run이 혼동되지 않는가?
- [x] stale/failure가 transcription core failure처럼 보이지 않게 분리되는가?
- [x] additive migration과 rollback safe default가 포함됐는가?

## Self Review 1 - Scope Fit

- [x] summary 구현의 선행 계약이라 P0가 맞다.
- [x] preset/UX보다 먼저 domain contract를 고정하는 순서가 안전하다.

## Self Review 2 - Regression / Safety

- [x] stale/failure를 summary rail로 격리해 transcript core failure와 섞이지 않게 했다.
- [x] additive migration / capability-off hidden state가 포함돼 rollback path가 있다.
- [x] legacy detail read path를 깨지 않는다는 제약을 상세 설계에 넣었다.

## Self Review 3 - Executability

- [x] domain entity split이 구현 단계(`types -> persistence -> adapter -> UI`)로 바로 분해 가능하다.
- [x] verify 항목이 `session` domain과 build/lint gate에 연결된다.
- [x] published summary와 run history를 분리해 이후 task(T1003/T1004)와 경계가 명확하다.

## Implementation Log

- [x] domain model과 storage/API contract를 구현한다.
- [x] current placeholder summary artifact를 published summary read model로 브리지한다.
- [x] stale/freshness derivation과 run history mapping을 구현한다.
- [x] 필요한 tests/fixture/migration checks를 추가한다.

### Implementation Notes

- Dexie v9에 `summaryPartitions`, `summaryRuns`, `publishedSummaries`를 additive table로 추가했다.
- `summaryRepository`를 새로 만들어 persisted summary state CRUD와 stale/delete helper를 page/component 바깥으로 분리했다.
- `SessionArtifact(type=summary)`는 published summary 우선, ready run fallback, historical request history 브리지 순으로 hydrate 한다.
- detail page는 새 summary state를 live query로 읽고, existing summary rail은 placeholder fallback을 유지한다.
- segment replace/correction/speaker relabel은 persisted summary state를 stale로 mark하고, local wipe/delete 경로는 summary rows도 함께 정리한다.

## Review Checklist (Implementation Review)

- [x] existing detail route가 summary 필드 부재 때문에 깨지지 않는가?
- [x] stale/failure 상태가 additive rail로만 격리되는가?
- [x] migration이 additive field만으로 가능한가?

## Verify

- [x] `npm --prefix webapp run test -- src/domain/session.test.ts src/pages/sessionWorkspaceModel.test.ts src/pages/sessionArtifactLifecycleModel.test.ts src/services/data/summaryRepository.test.ts src/services/data/transcriptionRepository.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
