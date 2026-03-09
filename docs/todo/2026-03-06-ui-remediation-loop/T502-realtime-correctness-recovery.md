# T502 - Realtime 세션 정확성 복구 (route/fallback/audio meter)

## Spec

### 문제

- 세션 종료 후 상세 페이지 이동 경로가 깨져 있다.
- realtime 기본 config fallback이 빈 JSON으로 퇴행했다.
- recorder 준비 절차와 stream/audio level 연결이 비동기 경합 상태다.
- 현재 오디오 시각화는 source of truth가 둘로 갈려 있다.

### 목표

- realtime 세션 시작/녹음/저장/종료 흐름을 deterministic하게 복구한다.
- 사용자에게 보이는 meter와 실제 recorder 상태가 동일한 source를 사용하게 만든다.

### 범위

- 포함:
  - 종료 후 상세 이동 route 복구
  - config precedence/fallback contract 복원
  - recorder 준비 절차 await화
  - 오디오 meter canonical source 단일화
  - 최소 smoke/test 시나리오 보강
- 제외:
  - 장기적인 waveform/timeline 기능 확장

### 해결방안

- 세션 준비는 `prepareSession()` 단일 진입점으로 유지하되, countdown UX와 병렬로 진행한다.
- caller는 준비 promise가 resolve되기 전에 외부 stream 상태를 직접 읽지 않고, recorder callback과 socket lifecycle을 source of truth로 사용한다.
- UI meter는 recorder가 계산한 level을 직접 사용하고, 별도의 독립 analyser 기반 시각화는 제거하거나 보조 전용으로 격리한다.
- config fallback은 preset 기반 known-good 값으로 복구하고, 유효값이 없으면 start를 차단한다.

### 상세 설계

- route 이동은 literal string 조합 대신 route helper로 고정한다.
- config precedence는 `edited JSON > selected preset > default preset > documented fallback preset`로 고정한다.
- config precedence와 detail route 형식은 순수 함수로 분리해 회귀 테스트로 잠근다.
- `prepareSession`은 session 준비의 유일한 진입점으로 두고, `RecorderManager.start()` 호출부에서 `onLevel`과 `onChunk`를 함께 주입한다.
- caller는 반환 stream을 즉시 읽지 않고 callback 기반 상태 갱신만 사용한다.
- realtime 화면에는 최종적으로 meter 컴포넌트 1종만 남기고, 나머지는 제거 또는 feature flag behind 상태로 둔다.

### 수용 기준 (AC)

- [x] 세션 저장 후 `/transcriptions/:id`로 정상 이동
- [x] preset hydrate 지연 시에도 빈 `{}` config로 세션이 시작되지 않음
- [x] session start 이전에 `microphoneStream`/`audioLevel` race가 재현되지 않음
- [x] realtime UI의 audio feedback이 하나의 canonical source만 사용함
- [x] 관련 smoke/test 시나리오가 문서화되거나 자동화됨

## Plan (Review 대상)

1. 현재 realtime flow에서 route/config/stream/level 관련 state transition을 정리한다.
2. `prepareSession`과 recorder callback contract를 재설계한다.
3. UI meter source를 하나로 줄이고 start/stop 흐름을 정리한다.
4. smoke/test 시나리오를 보강한다.

## Review Checklist (Plan Review)

- [x] route fix, fallback 복원, audio wiring 복구가 한 task 안에서 논리적으로 묶였는가?
- [x] canonical source를 하나로 제한해 이후 디자인 task와 충돌을 줄였는가?
- [x] preset 부재 시 start 차단 UX를 오류 은닉이 아닌 복구 가능 상태로 설계했는가?

## Self Review (Spec/Plan)

- [x] 기능 correctness와 UI 피드백 correctness를 같은 contract로 묶었다.
- [x] 세션 라이프사이클의 비동기 경합을 명시적으로 제거하는 방향이다.
- [x] 장기 waveform 기능과 현재 P0 복구 범위를 분리했다.

## Implementation Log

- [x] realtime state transition 인벤토리 작성
- [x] route 이동 경로 수정
- [x] fallback precedence 및 start guard 복구
- [x] `prepareSession`/recorder callback contract 정리
- [x] canonical audio meter 적용
- [x] smoke/test 보강

## Review Checklist (Implementation Review)

- [x] session start/stop/retry/discard 모든 분기에서 상태 누수가 없는지 점검
- [x] stream/AudioContext/resource cleanup이 누락되지 않았는지 점검
- [x] fallback failure가 무음 실패가 아니라 명시적 사용자 오류로 보이는지 점검

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run test -- src/pages/realtimeSessionModel.test.ts src/app/AppRouter.test.tsx`
- [x] `npm --prefix webapp run build`
- [x] route/detail path + config precedence regression을 `realtimeSessionModel.test.ts`로 자동화
