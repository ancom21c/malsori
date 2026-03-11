# T1002 - Summary Preset Library + Auto-selection Contract

## Spec

### 문제

- summary preset library와 auto/manual selection contract가 없어서 meeting/lecture/interview/casual UX를 일관되게 설명할 수 없다.
- provider/model binding과 prompt preset 책임이 섞이면 operator/runtime/user choice가 분산된다.

### 목표

- summary preset을 first-class record로 정의한다.
- auto suggestion과 user override를 동시에 지원하는 선택 contract를 고정한다.

### 범위

- 포함:
  - preset schema(`id/version/language/outputSchema/supportedModes`)
  - 기본 preset library 정의
  - auto suggestion metadata와 fallback 규칙
  - `지금부터 적용` / `전체 다시 생성` override 경로
- 제외:
  - 실제 classifier/model 구현 세부
  - summary surface layout 자체

### 해결방안

- preset은 user-facing output contract를 표현하고, provider/model은 feature binding이 담당하도록 분리한다.
- auto suggestion은 confidence와 reason을 남기고, confidence가 낮으면 safe default를 사용한다.
- user override가 발생하면 적용 범위를 명시적으로 선택하게 한다.

### 상세 설계

#### A. Preset Record

- `SummaryPreset`
  - `id`, `version`, `label`, `description`
  - `language`
  - `intendedContexts`
  - `supportedModes`: `realtime | full | both`
  - `outputSchema`
  - `defaultModelHint`
  - `defaultSelectionWeight`

#### B. Baseline Library

- `meeting`
  - `overview`, `decisions`, `actionItems`, `openQuestions`
- `lecture`
  - `topicOutline`, `keyClaims`, `examples`, `followUps`
- `interview`
  - `themes`, `signals`, `quotes`, `followUps`
- `casual`
  - `gist`, `topics`, `notableMoments`, `nextSteps`

#### C. Selection Metadata

- `SummaryPresetSuggestion`
  - `suggestedPresetId`
  - `confidence`
  - `reason`
  - `evaluatedTurnRange`
  - `createdAt`
- auto suggestion은 operator binding과 분리된 pure feature logic으로 본다.
- low-confidence는 safe default preset으로 fallback하고, UI에는 `추천` / `기본값 적용`을 분리해 보여준다.

#### D. User Override Contract

- preset 변경 액션은 최소 두 scope를 가진다.
  - `지금부터 적용`
  - `전체 다시 생성`
- override 발생 시 run history에 `selectionSource = manual`를 남긴다.
- auto suggestion이 나중에 다시 계산돼도 manual override를 덮어쓰지 않는다.

#### E. Safe Default / Rollback

- preset library load 실패 시 product default preset 하나로 degrade 한다.
- preset schema mismatch는 run request 차단 + helper copy로 처리하고 transcript core는 유지한다.

### 수용 기준 (AC)

- [x] preset schema와 기본 preset library가 문서상 고정된다.
- [x] auto suggestion metadata(`suggestedPresetId/confidence/reason`)가 정의된다.
- [x] low-confidence fallback과 user override 우선순위가 명시된다.
- [x] `지금부터 적용` / `전체 다시 생성` 두 경로가 문서에 포함된다.

## Plan (Review 대상)

1. preset record와 feature binding 책임을 먼저 분리한다.
2. baseline preset library와 output schema example을 고정한다.
3. auto suggestion metadata와 low-confidence fallback을 정의한다.
4. manual override state machine과 apply scope를 구체화한다.
5. preset load/schema failure safe default를 verify 항목까지 연결한다.

## Review Checklist (Plan Review)

- [x] preset이 provider/model 설정 필드로 새지 않는가?
- [x] low-confidence safe default가 있는가?
- [x] user override가 auto suggestion보다 우선한다는 계약이 명확한가?
- [x] load/schema failure safe default가 포함되는가?

## Self Review 1 - Scope Fit

- [x] summary의 usability를 좌우하는 핵심 축이라 P1이 적절하다.
- [x] summary UX와 runtime lifecycle에 재사용될 수 있는 계약으로 분리했다.

## Self Review 2 - Safety / Drift

- [x] preset과 provider/model binding을 분리해 settings field proliferation을 막았다.
- [x] low-confidence fallback과 manual override 우선순위를 모두 명시했다.
- [x] schema failure가 transcript core failure로 번지지 않는 safe default를 넣었다.

## Self Review 3 - Executability

- [x] preset registry, suggestion metadata, selection source 기록으로 구현 단위가 분명하다.
- [x] T1003/T1004가 이 contract를 그대로 소비할 수 있게 경계를 정리했다.
- [x] verify 항목을 preset/summary test와 lint/build gate에 연결했다.

## Implementation Log

- [x] preset registry와 selection metadata 구조를 구현한다.
- [x] auto suggestion / manual override state flow를 연결한다.
- [x] low-confidence fallback과 apply scope path를 구현한다.
- [x] 필요한 tests 또는 fixtures를 추가한다.

### Implementation Notes

- `summaryPreset` domain module에 baseline preset library와 heuristic auto-suggestion, manual override selection helper를 추가했다.
- product-safe fallback preset은 현재 `meeting`으로 고정했고, unknown preset id도 같은 safe default로 resolve 한다.
- `summaryRuns`는 `presetId`, `presetVersion`, `selectionSource`를 남기고, session-level preset selection state는 별도 Dexie table로 persist 한다.
- `readSessionSummaryState`는 persisted preset selection과 suggestion metadata를 함께 읽어 이후 summary surface가 재사용할 수 있게 정리했다.
- summary artifact bridge는 run이 없더라도 selected preset metadata를 유지해 이후 UI selector가 empty state를 만들지 않도록 했다.

## Review Checklist (Implementation Review)

- [x] preset 변경이 core transcript state를 덮어쓰지 않는가?
- [x] low-confidence fallback이 빈 UI를 만들지 않는가?
- [x] preset version이 run history에 남는가?

## Verify

- [x] `npm --prefix webapp run test -- src/domain/summaryPreset.test.ts src/domain/session.test.ts src/pages/sessionWorkspaceModel.test.ts src/services/data/summaryRepository.test.ts src/services/data/transcriptionRepository.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
