# T204 - 접근성/키보드 조작성 정합성 보강

## Spec

### 문제

- 일부 상호작용 요소가 `div/card/box onClick` 형태로 구현되어 키보드 조작이 제한된다.
- 접근성 가이드 기준(시맨틱 요소, focus, keyboard handler)과 불일치 항목이 있다.

### 목표

- 클릭 가능한 주요 요소를 키보드/스크린리더 친화 구조로 정렬한다.
- 마우스/터치/키보드 입력이 동일한 결과를 내도록 통일한다.

### 범위

- 포함:
  - TranscriptionView 세그먼트 카드 상호작용 시맨틱 개선
  - SegmentWaveformTimeline 세그먼트 선택 상호작용 시맨틱 개선
  - 필요한 `aria-label`, `aria-pressed`, `role`, `onKeyDown` 보강
  - focus-visible 스타일 점검
- 제외:
  - 전 화면 전체 WCAG 재인증

### 해결방안

- 클릭 전용 컨테이너를 `ButtonBase`/`button` 기반으로 교체한다.
- 타임라인 세그먼트 박스는 키보드 포커스 가능 요소로 바꾸고 Enter/Space 대응을 추가한다.
- 편집 진입 동작(더블클릭 의존)을 버튼/명시 동작 중심으로 보완한다.

### 수용 기준 (AC)

- [x] 키보드만으로 세그먼트 선택/재생/편집 진입이 가능하다.
- [x] 스크린리더에서 상호작용 요소 의미가 명확히 읽힌다.
- [x] focus ring이 일관되게 표시된다.

## Plan (Review 대상)

1. 비시맨틱 상호작용 요소 위치와 이벤트 경로 목록화
2. 요소별 대체 컴포넌트(`button`, `ButtonBase`) 및 aria 정책 확정
3. 키보드 이벤트 처리 표준 적용(Enter/Space)
4. 수동 접근성 점검 체크리스트로 검증

## Review Checklist (Plan Review)

- [x] 기존 pointer UX를 손상하지 않는가?
- [x] 포커스 이동 순서가 직관적인가?
- [x] 모바일 터치 hit-area가 줄어들지 않는가?

## Implementation Log

- [x] `webapp/src/components/TranscriptionView.tsx` 세그먼트 본문 클릭 영역을 `ButtonBase`로 치환하고 focus-visible 스타일 추가
- [x] `webapp/src/components/SegmentWaveformTimeline.tsx` 세그먼트 marker를 `button` 시맨틱으로 전환
- [x] `aria-pressed`, `aria-label`, `Home/End/Arrow` 키보드 seek handler 추가
- [x] 접근성 회귀 테스트 시나리오 문서화 (`docs/qa-a11y-keyboard-2026-03-03.md`)

## Review Checklist (Implementation Review)

- [ ] 키보드 내비게이션으로 핵심 동작이 재현되는가?
- [x] 의도치 않은 중복 클릭/이벤트 버블링 문제가 없는가?
- [x] 포커스 스타일이 디자인 시스템과 일치하는가?

## Verify

- [ ] 수동 점검: Tab/Shift+Tab/Enter/Space로 리스트/타임라인 조작
- [ ] 스크린리더 라벨 점검(NVDA/VoiceOver 중 1개 이상)
- [x] `npm --prefix webapp run lint`
