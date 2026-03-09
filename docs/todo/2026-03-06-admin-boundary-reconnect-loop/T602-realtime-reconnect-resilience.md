# T602 - Realtime Reconnect Resilience + Degraded Signaling

## Spec

### 문제

- WebSocket이 microphone 준비보다 먼저 열려 empty failed session을 남길 수 있다.
- reconnect 중 audio buffering이 chunk count 기반이며, 오래된 오디오를 조용히 버린다.
- drop이 발생해도 session quality degradation이 UI에 명시되지 않는다.

### 목표

- realtime 세션 준비와 reconnect를 deterministic 하게 만든다.
- reconnect tolerance budget 안에서는 음성을 보존/재전송한다.
- tolerance budget 초과로 손실이 발생하면 `degraded` 상태를 사용자와 저장 metadata에 남긴다.

### 범위

- 포함:
  - recorder-first `prepareSession()` 순서
  - duration-budget reconnect buffer + FIFO replay
  - drop/degraded state 계산과 HUD surfacing
  - finalize/discard 판단 정리
- 제외:
  - camera capture 구조 변경은 T604에서 다룸

### 해결방안

- `prepareSession()`은 microphone/recorder start 성공 후에만 socket connect를 시작한다.
- reconnect buffer는 `{chunk, durationMs, createdAt}` 단위로 저장한다.
- tolerance budget은 transport option으로 명시하고, 기본값은 reconnect backoff/handshake budget과 정렬한다.
- reconnect 성공 시 buffer를 FIFO로 flush한다.
- budget 초과분이 발생하면 oldest chunk를 drop하되, dropped ms / dropped ratio를 누적한다.
- drop 임계치를 넘기면 session을 `degraded`로 표시하고 helper text를 노출한다.

### 상세 설계

- buffer budget은 `maxBufferedAudioMs`로 관리한다.
- 기본 budget은 `(sum of reconnect delays) + handshake budget`을 기준으로 계산하고, 구현에서는 상한을 둔다.
- degraded 임계치는 절대량과 비율 둘 다 본다.
  - 기본안: `droppedBufferedAudioMs >= 2000` 또는 `droppedBufferedAudioRatio >= 0.1`
- HUD에는 `degraded` chip과 `buffer replay` 상태 문구를 추가한다.
- transcription metadata에는 `bufferedAudioMs`, `droppedBufferedAudioMs`, `degraded`를 남긴다.
- mic start 실패 시 `sessionConnectedRef`가 false 상태로 유지되어 discard 경로가 보장돼야 한다.

### 수용 기준 (AC)

- [ ] microphone 준비 실패 시 빈 failed session을 남기지 않는다.
- [ ] reconnect tolerance budget 안의 audio는 reconnect 후 FIFO로 재전송된다.
- [ ] tolerance budget 초과 drop 시 `degraded` 상태가 UI에 표시된다.
- [ ] session 저장 metadata에 reconnect degradation 정보가 기록된다.

## Plan (Review 대상)

1. current prepare/connect/finalize 흐름을 시퀀스 기준으로 정리한다.
2. recorder-first 준비 순서로 바꾸고 discard 판단을 재검증한다.
3. transport buffer를 duration-budget 방식으로 바꾼다.
4. degraded 계산과 HUD/metadata 노출을 연결한다.
5. reconnect/drop 경계 케이스 테스트를 추가한다.

## Review Checklist (Plan Review)

- [x] race fix와 buffer policy를 같은 transport contract 안에서 다루도록 묶었는가?
- [x] buffer growth를 duration budget으로 제한해 메모리 상한을 유지하는가?
- [x] degraded를 단순 장식이 아니라 user-visible quality signal로 정의했는가?

## Self Review (Spec/Plan)

- [x] user가 요구한 buffered replay + degraded 표시를 직접 반영했다.
- [x] fast network / mic failure / reconnect storm를 모두 같은 AC 아래 검증할 수 있다.
- [x] T604와 분리해 transport correctness 우선순위를 선명히 했다.

## Implementation Log

- [x] realtime session sequence inventory 작성
- [x] recorder-first `prepareSession()` 반영
- [x] duration-budget buffer / replay 구현
- [x] degraded state 계산 및 UI/metadata 연결
- [x] reconnect tests / notes 추가

### 구현 메모

- `RtzrStreamingClient`를 chunk-count queue에서 `duration-budget + metrics callback` 구조로 변경했다.
- `prepareSession()`은 recorder start 성공 후 socket connect를 시작하도록 재배선했다.
- reconnect drop/replay 정보는 local transcription metadata(`realtime*`)에 저장되도록 연결했다.
- HUD에는 buffering/degraded chip과 helper alert를 추가했다.
- `rtzrStreamingClient` 테스트에 replay FIFO, budget drop, disconnect drop 케이스를 추가했다.

## Review Checklist (Implementation Review)

- [x] reconnect 성공 후 chunk ordering이 FIFO로 유지되는지 확인
- [x] budget 초과 시 silent data loss가 아니라 degraded signal이 남는지 확인
- [x] finalize/discard 경로가 empty session을 남기지 않는지 확인

## Self Review (Implementation)

- [x] finalize 직전 disconnect에서 마지막 drop metric이 stale ref에 묻히는 문제를 한 번 잡았고, callback에서 ref를 즉시 갱신하도록 보정했다.
- [x] reconnect tolerance는 option으로 override 가능하지만 기본값도 reconnect backoff + handshake budget에 맞춰 계산되도록 유지했다.
- [x] camera/audio source 이중 획득 문제는 건드리지 않고 transport correctness에만 범위를 제한했다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run test -- rtzrStreamingClient realtimeSessionModel`
- [x] `npm --prefix webapp run test -- AppRouter`
- [x] reconnect/drop smoke note 작성
