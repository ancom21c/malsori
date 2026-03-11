# Summary Feature Spec (2026-03-11)

> Status: current feature spec baseline for adding realtime and full-session summary without regressing shipped STT value.

Primary references:

- `docs/plan-stt-value-preservation-baseline-2026-03-10.md`
- `docs/plan-platform-expansion-rollout-2026-03-10.md`
- `docs/plan-feature-backend-binding-2026-03-10.md`

## Goal

`malsori`의 파일 전사 / 실시간 전사 / 상세 열람 가치를 유지하면서, session detail과 realtime workspace에 요약 기능을 additive feature로 도입한다.

핵심 제공 가치는 두 가지다.

1. `realtime summary`: 세션 진행 중 turn 흐름을 따라가는 진행형 요약
2. `full summary`: 세션 전체를 정리한 완료형 요약

## Problem

현재 codebase에는 session artifact foundation과 backend binding architecture는 있지만, summary 자체의 canonical feature contract는 없다.

- 어떤 단위로 요약할지(partition)
- 어떤 prompt preset을 쓸지
- 자동 선택과 사용자 override를 어떻게 공존시킬지
- realtime / full summary를 UX에서 어떻게 드러낼지
- summary failure를 어떻게 core STT와 격리할지

이 문서는 그 contract를 명시한다.

## Preservation Constraints

다음은 summary feature가 침범하면 안 된다.

1. file transcription request / polling / detail 진입
2. realtime capture / reconnect / stop-save 안정성
3. detail transcript reading / audio playback / export
4. mobile realtime transcript viewport / transport dock ownership
5. internal-only operator backend boundary

summary는 어디까지나 transcript 위에 얹히는 additive artifact다.

## Core Principles

1. source transcript가 primary surface다.
2. summary는 contiguous turn partition 위에서만 생성된다.
3. realtime summary와 full summary는 서로 다른 lifecycle을 갖는다.
4. preset 선택은 자동화될 수 있지만 항상 traceable 해야 한다.
5. summary failure는 artifact failure로 격리된다.

## Functional Requirements

### 1. Summary Modes

- `summary.realtime`
  - 세션 진행 중 turn 흐름을 따라가며 partition 단위로 갱신된다.
  - draft / updating / ready / stale 상태를 가질 수 있다.
  - capture가 살아 있는 동안에도 transcript 수집보다 우선권을 갖지 않는다.
- `summary.full`
  - 세션 전체를 정리하는 요약이다.
  - file transcription ready 상태 또는 realtime stop/save 이후를 기본 entry point로 본다.
  - provider 전략에 따라 full transcript 재실행 또는 finalized partition 합성으로 만들 수 있다.

두 mode는 동시에 존재할 수 있어야 한다. realtime summary는 진행 중 초안이고, full summary는 정리본이라는 UX 구분이 필요하다.

### 2. Partition Contract

요약 단위는 contiguous partition이다.

- partition은 turn을 건너뛰거나 재배열할 수 없다.
- partition은 최소 다음 정보를 가진다.
  - `id`
  - `sessionId`
  - `startTurnId`
  - `endTurnId`
  - `turnCount`
  - `startedAt`
  - `endedAt`
  - `status`: `draft | finalized | stale`
  - `reason`: `manual | silence_gap | speaker_shift | topic_shift | max_turns | max_duration | token_budget | session_end`
  - `sourceRevision`
- realtime 중에는 최대 하나의 active mutable partition을 둘 수 있다.
- finalized partition은 안정 구간으로 취급하되, late final turn이나 correction이 들어오면 관련 output만 `stale`로 바꾼다.
- implementation은 manual split / merge / lock을 지원할 수 있어야 한다.

### 3. Prompt Presets

summary prompt preset은 first-class artifact다.

- 기본 preset library:
  - `meeting`
  - `lecture`
  - `interview`
  - `casual`
- preset은 최소 다음 필드를 가진다.
  - `id`
  - `version`
  - `label`
  - `description`
  - `language`
  - `intendedContexts`
  - `supportedModes`: `realtime | full | both`
  - `outputSchema`
  - `defaultModelHint`
- preset과 provider/model binding은 분리한다.
  - preset은 사용자 경험과 결과 형식을 표현한다.
  - provider/model은 operator가 feature binding으로 제어한다.

### 4. Prompt Selection

prompt 선택은 auto + manual override를 동시에 지원한다.

- system은 초반 session context를 기반으로 preset을 자동 추천할 수 있다.
- auto selection은 최소 다음 정보를 남긴다.
  - `suggestedPresetId`
  - `confidence`
  - `reason`
  - `evaluatedTurnRange`
- confidence가 낮으면 safe default(`meeting` 또는 product default preset)로 fallback한다.
- 사용자는 언제든 preset을 바꿀 수 있어야 한다.
- preset 변경 시 최소 두 가지 실행 옵션이 필요하다.
  - `지금부터 적용`
  - `전체 다시 생성`

### 5. Output Contract

summary output은 preset별 구조를 가진다.

- 공통적으로 다음 계층을 지원한다.
  - top-level narrative summary
  - section/block 단위 요약
  - supporting snippets
- meeting preset 예시:
  - `overview`
  - `decisions`
  - `actionItems`
  - `openQuestions`
- lecture preset 예시:
  - `topicOutline`
  - `keyClaims`
  - `examples`
  - `followUps`
- interview preset 예시:
  - `themes`
  - `candidateSignals`
  - `quotes`
  - `followUps`

각 summary block 또는 item은 source turn/snippet을 참조할 수 있어야 한다.

### 6. Freshness and Re-summary

summary는 freshness 개념을 가져야 한다.

- transcript가 바뀌면 기존 summary를 silently overwrite하지 않는다.
- 대신 affected output을 `stale`로 표시한다.
- 사용자는 stale block 또는 전체 summary를 명시적으로 재생성할 수 있어야 한다.
- summary request는 prompt version, provider/model, source revision, timestamps를 남겨 reproducibility를 보장한다.

## UX Requirements

### 1. Placement

- realtime session 화면에서 `Summary` 토글로 요약 블록을 열고 닫을 수 있어야 한다.
- file transcription과 realtime session detail 화면에서도 `Summary` 토글로 summary rail을 열고 닫을 수 있어야 한다.
- summary는 transcript를 대체하지 않고 secondary surface로 붙는다.

### 2. Layout

- desktop
  - summary는 right rail로 배치한다.
  - transcript와 요약은 동시에 읽을 수 있어야 한다.
- mobile
  - summary는 bottom sheet 또는 accordion으로 배치한다.
  - transcript viewport와 transport dock를 밀어내면 안 된다.
  - summary open 상태에서도 recording controls 접근성이 유지되어야 한다.

### 3. Controls

- summary surface는 최소 다음 제어를 가진다.
  - `Off`
  - `Live`
  - `Full`
  - preset 변경
  - regenerate
  - close/collapse
- realtime 화면에서는 summary update가 사용자의 scroll/focus를 강제로 빼앗지 않아야 한다.
- preset은 chip 또는 compact selector로 노출하고, auto-selected 여부를 함께 보여준다.
- summary block 클릭 시 대응 transcript range로 이동하거나 highlight 해야 한다.

### 4. States

요약 UI는 최소 다음 상태를 구분한다.

- `disabled`
- `pending`
- `updating`
- `ready`
- `stale`
- `failed`

capability 또는 binding이 없으면 broken control 대신 hidden/disabled + helper copy를 사용한다.

### 5. Realtime vs Full Messaging

UI는 두 summary의 의미를 분명히 구분해야 한다.

- realtime summary: 진행 중 초안 / rolling summary
- full summary: 종료 후 또는 ready 후 생성되는 정리본

둘을 같은 결과처럼 보이게 하면 안 된다.

## Operational Requirements

### 1. Failure Isolation

- summary failure는 artifact failure다.
- transcription failure처럼 보여서는 안 된다.
- summary provider down / binding misconfiguration은 summary surface만 degraded/disabled 시키고 core STT는 유지해야 한다.

### 2. Binding / Capability Gate

- summary는 `artifact.summary` binding과 capability가 둘 다 준비된 경우에만 ready state로 노출한다.
- operator는 backend profile / feature binding으로 provider, model, fallback을 제어한다.
- public runtime에 summary 전용 credential field를 추가하지 않는다.

### 3. Cost / Latency Guardrails

- realtime summary는 debounce / batch window를 가진다.
- min partition size, max partition duration, token budget ceiling을 둔다.
- session 단위 max concurrent summary request 수를 제한한다.
- provider timeout / retry / fallback policy를 binding 수준에서 관리한다.

### 4. Auditability

summary request/run 기록은 최소 다음을 남긴다.

- `summaryMode`
- `partitionIds` 또는 full-session scope
- `presetId`
- `presetVersion`
- `providerLabel`
- `model`
- `requestedAt`
- `completedAt`
- `status`
- `sourceRevision`
- `errorMessage`

### 5. Language Policy

- source transcript language와 summary output language를 구분할 수 있어야 한다.
- mixed-language 세션은 source quote를 유지하면서 summary 언어를 별도로 선택할 수 있어야 한다.
- preset은 language-aware 해야 한다.

## Recommended Domain Additions

현재 `SessionArtifact`, `ArtifactRequestRecord`, `supportingSnippets` 구조를 확장하는 방향을 권장한다.

권장 추가 모델:

- `SummaryPartition`
- `SummaryPreset`
- `SummaryRun`
- `SummaryBlock`

`SessionArtifact(type=summary)`는 최신 published summary를, `requests`는 historical run/audit trail을 표현하는 쪽이 적절하다.

## Acceptance Criteria

1. realtime 화면과 session detail 화면에서 summary를 토글로 열고 닫을 수 있다.
2. desktop/mobile 모두 summary가 transcript primary surface를 침범하지 않는다.
3. realtime summary와 full summary의 차이가 copy와 state로 명확히 드러난다.
4. summary block은 supporting snippet을 통해 source transcript와 연결된다.
5. prompt preset은 auto suggestion + manual override를 모두 지원한다.
6. transcript correction이 들어오면 해당 summary는 stale로 표시되고 재생성 가능하다.
7. capability/binding이 없거나 provider가 실패해도 core STT flow는 그대로 usable하다.

## Non-goals

이 문서는 다음을 즉시 구현하겠다는 약속은 아니다.

1. 특정 provider prompt 본문 확정
2. 특정 clustering/topic-shift 알고리즘 확정
3. list page preview 카드까지 포함한 모든 secondary UX 구현
4. evaluation dataset 구축 자체
