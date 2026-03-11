# T1003 - Summary Surface UX For Realtime/Detail

## Spec

### 문제

- summary는 spec상 정의됐지만 realtime 화면과 session detail에서 어떻게 열고 닫고 읽을지 UX contract가 아직 없다.
- mobile에서는 transcript viewport와 transport dock를 침범하지 않는 배치가 특히 중요하다.

### 목표

- realtime 화면과 file/realtime detail 화면에 공통되는 summary surface UX를 정의한다.
- desktop/mobile 모두 transcript primary ownership을 유지하는 layout contract를 만든다.

### 범위

- 포함:
  - `Summary` 토글 open/close contract
  - `Off / Live / Full` 상태 전환 UI
  - desktop right rail / mobile bottom sheet or accordion 기준
  - state chips, preset chip, transcript range jump interaction
- 제외:
  - list page preview 카드
  - summary content quality 자체

### 해결방안

- summary는 secondary surface로만 노출한다.
- realtime/detail 모두 같은 상태 vocabulary를 사용한다.
- summary block click 시 transcript range focus/highlight를 제공한다.
- mobile에서는 summary open 상태에서도 transport controls 접근성을 유지한다.

### 상세 설계

#### A. Surface Entry Points

- realtime capture page
  - `Summary` toggle
  - `Off / Live / Full` mode switch
  - compact preset chip + freshness/status chips
- session detail page
  - `Summary` toggle
  - full summary 중심 + realtime summary history/preview가 있으면 secondary view

#### B. Layout Contract

- desktop
  - transcript main pane + summary right rail
  - summary rail width는 transcript readability를 해치지 않는 범위에서 고정/탄력값 사용
- mobile
  - summary는 bottom sheet 또는 accordion
  - transcript viewport와 transport dock를 밀어내지 않는다
  - summary open/close가 scroll position을 강제 변경하지 않는다

#### C. Interaction Contract

- summary block 클릭 시 대응 transcript range로 jump 또는 highlight 한다.
- summary update는 focus/scroll steal을 하지 않는다.
- state chips:
  - `disabled`
  - `pending`
  - `updating`
  - `ready`
  - `stale`
  - `failed`
- preset chip은 `auto-selected` 여부와 manual override 상태를 함께 드러낸다.

#### D. Empty / Disabled / Error States

- capability off / binding misconfigured: hidden 또는 disabled helper state
- no summary yet: empty state with next action copy
- stale: 재생성 CTA + source changed helper
- failed: retry/regenerate CTA + error helper, transcript core는 계속 사용 가능

#### E. Shared Component Direction

- realtime/detail가 같은 summary shell vocabulary를 재사용할 수 있도록 공통 component family를 우선 고려한다.
- page-specific copy/placement만 route별로 분기하고, state chips와 block card 구조는 공통화한다.

### 수용 기준 (AC)

- [x] realtime 화면과 session detail 화면에 summary toggle contract가 문서화된다.
- [x] desktop/mobile layout rule이 분리되어 명시된다.
- [x] `disabled/pending/updating/ready/stale/failed` state vocabulary가 정리된다.
- [x] summary와 transcript 사이의 jump/highlight interaction이 정의된다.

## Plan (Review 대상)

1. realtime/detail 공통 surface vocabulary를 먼저 고정한다.
2. desktop/mobile layout ownership을 route별로 정리한다.
3. state/empty/error/freshness UI를 하나의 summary shell contract로 묶는다.
4. transcript jump/highlight interaction을 page behavior에 연결한다.
5. capability-off hidden/disabled state를 safe default로 정의한다.

## Review Checklist (Plan Review)

- [x] summary가 transcript primary surface를 대체하지 않는가?
- [x] mobile에서 transport dock 접근성이 유지되는가?
- [x] state vocabulary가 realtime/full summary 모두에 일관되게 쓰이는가?
- [x] empty/disabled/error/freshness state가 빠지지 않았는가?

## Self Review 1 - Scope Fit

- [x] summary visible value가 큰 축이라 P1이 맞다.
- [x] list preview는 제외해 범위를 불필요하게 넓히지 않았다.

## Self Review 2 - UX Safety

- [x] transcript/transport primary ownership을 mobile/desktop 모두에 넣었다.
- [x] focus/scroll steal 금지를 명시해 realtime reading flow를 보호했다.
- [x] capability-off / stale / failed 상태가 broken UI가 아니라 helper state로 보이게 했다.

## Self Review 3 - Executability

- [x] page entry point, shared shell, interaction contract로 바로 컴포넌트 분해가 가능하다.
- [x] T1002 preset selection과 T1004 freshness lifecycle을 소비하는 구조로 정리했다.
- [x] verify 항목이 라우터/상세/realtime 페이지 테스트로 연결된다.

## Implementation Log

- [x] realtime/detail summary shell을 구현한다.
- [x] desktop/mobile layout과 interaction state를 반영한다.
- [x] empty/disabled/error/freshness states를 추가한다.
- [x] transcript jump/highlight affordance를 추가한다.

### Implementation Notes

- `SummarySurface`와 `summarySurfaceModel`을 추가해 realtime/detail가 같은 summary shell vocabulary를 공유하도록 정리했다.
- desktop에서는 inline right rail card로, compact/mobile에서는 bottom drawer로 summary surface를 열고 닫는다.
- detail page는 기존 artifact rail에서 summary를 전용 shell로 분리하고, action items/key terms/qa card는 그대로 유지한다.
- realtime page는 transcript main pane 옆에 summary rail을 붙이고, compact layout에서는 transcript 위 toggle bar + bottom drawer 조합으로 degrade 한다.
- summary sections의 supporting snippet 버튼은 detail page에서 해당 transcript segment/loop range로 jump하도록 연결했다.

## Review Checklist (Implementation Review)

- [x] summary open 상태가 mobile viewport ownership을 깨지 않는가?
- [x] focus/scroll steal 없이 업데이트가 반영되는가?
- [x] capability off 상태가 broken UI가 아니라 helper/disabled state로 보이는가?

## Verify

- [x] `npm --prefix webapp run test -- src/components/summary/SummarySurface.test.tsx src/components/summary/summarySurfaceModel.test.ts src/domain/session.test.ts src/pages/sessionWorkspaceModel.test.ts src/components/realtime/RealtimeTranscript.test.tsx`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
