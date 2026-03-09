# T903 - Realtime Transcript Accessibility Decoupling

## Spec

### 문제

- `followLive`가 visual auto-scroll과 `aria-live` announcement를 동시에 제어한다.
- 사용자가 과거 transcript를 읽기 위해 follow를 끄면 접근성 경로도 같이 꺼진다.

### 목표

- visual follow preference와 assistive announcement semantics를 분리한다.
- transcript review와 live recognition awareness를 동시에 만족시키는 기본값을 만든다.

### 범위

- 포함:
  - `RealtimeTranscript` live-region semantics 조정
  - 필요한 helper copy/state wiring 조정
  - 테스트 또는 a11y note 보강
- 제외:
  - realtime IA 전체 재설계
  - 별도 screen-reader settings panel 추가

### 해결방안

- `followLive`는 auto-scroll 전용으로 유지한다.
- transcript log는 session active 동안 `aria-live="polite"`를 유지하고, note mode에서는 꺼서 중복 낭독을 피한다.
- helper copy는 `followLive`가 scroll behavior만 제어한다는 의미로 정리한다.

### 상세 설계

- `RealtimeTranscript`는 `noteMode`, `sessionState`, `followLive`를 분리해 live-region policy를 계산한다.
- `aria-live`는 `noteMode === false` 및 session active일 때 `polite`, 그 외는 `off` 또는 제거로 둔다.
- auto-scroll effect는 기존처럼 `followLive === true`일 때만 실행한다.
- 필요 시 transcript 영역 상단에 concise helper text를 추가한다.

### 수용 기준 (AC)

- [ ] follow-live off 상태에서도 live transcript announcement 경로가 유지된다.
- [ ] note mode에서는 transcript log announcement가 중복되지 않는다.
- [ ] auto-scroll 동작은 기존처럼 follow-live에만 종속된다.

## Plan (Review 대상)

1. transcript live-region policy를 명시적인 계산 로직으로 분리한다.
2. helper copy가 있으면 visual/assistive 의미를 더 정확히 바꾼다.
3. reduced motion과 note mode regression을 함께 점검한다.

## Review Checklist (Plan Review)

- [x] auto-scroll과 screen-reader semantics를 명확히 분리했는가?
- [x] note mode 중복 announcement를 피하는가?
- [x] 새로운 toggle을 추가하지 않고도 문제를 해결하는가?

## Self Review (Spec/Plan)

- [x] a11y semantics는 visual preference에 종속되면 안 된다는 방향이 명확하다.
- [x] 기존 IA를 거의 건드리지 않는 작은 수정으로 해결 가능하다.
- [x] acceptance가 behavior 기준으로 검증 가능하다.

## Implementation Log

- [x] `RealtimeTranscript`에서 live announcement enable policy를 `followLive`와 분리했다.
- [x] `followLive`는 auto-scroll 전용으로 유지하고, active session 중 log live region은 계속 `polite`를 유지하도록 정리했다.
- [x] note mode에서는 기존처럼 transcript log 자체를 렌더링하지 않아 중복 announcement를 피하도록 유지했다.
- [x] `RealtimeTranscript.test.tsx`를 추가해 scroll gating과 `aria-live` semantics를 고정했다.

## Review Checklist (Implementation Review)

- [x] follow-live off 상태에서 새 segment가 스크린리더에 계속 전달되는가?
- [x] note mode에서 중복 읽기/과도한 noise가 없는가?
- [x] helper copy와 실제 behavior가 일치하는가?

## Verify

- [x] `npm --prefix webapp run test -- RealtimeTranscript AppRouter`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
