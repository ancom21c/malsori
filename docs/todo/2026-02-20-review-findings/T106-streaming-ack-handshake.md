# T106 - Streaming ACK handshake 명확화

## Spec

### 문제

- websocket 연결 후 명시적 준비 ACK 없이 고정 대기 후 세션을 open 처리하면 초기 전송 실패/유실 가능성이 있다.
- 지연 환경에서 "준비 완료"와 "연결만 성립" 상태가 혼동된다.

### 목표

- streaming 세션 시작 기준을 명확한 ACK 이벤트로 통일하고, 타임아웃/재시도 동작을 예측 가능하게 만든다.

### 범위

- 포함:
  - client handshake 상태기계 보강
  - ACK 타임아웃/재시도 정책
  - 오류 코드/토스트 정리
  - 관련 테스트 추가
- 제외:
  - 스트리밍 프로토콜 전면 변경
  - 오디오 인코딩 파이프라인 재작성

### 해결방안

- handshake 상태 분리:
  - `CONNECTING -> WAITING_ACK -> READY -> STREAMING`
  - `READY` 전에는 오디오 chunk flush 금지
- ACK 계약:
  - 서버의 준비 이벤트(`session_ready` 등) 수신을 세션 시작 조건으로 강제
  - ACK 미수신 시 `STREAM_ACK_TIMEOUT` 오류로 종료
- 재시도:
  - 연결 단계 재시도 횟수/지수 backoff 설정
  - 사용자에게 재시도 중 상태를 i18n 메시지로 표시
- 구성값:
  - `STREAM_ACK_TIMEOUT_MS` 등 환경/설정 기반 튜닝 가능

### 수용 기준 (AC)

- [x] ACK 수신 전에는 세션 open/onReady로 표시되지 않는다.
- [x] ACK 지연/미수신 시 명확한 오류 코드와 사용자 안내가 제공된다.
- [x] 정상 환경에서 초기 partial/final 누락률이 감소한다.

## Plan (Review 대상)

1. 현재 streaming client 상태 전이와 타임아웃 경로 문서화
2. ACK 이벤트 계약(이벤트명/필수 필드) 확정
3. 상태기계 리팩터링 + retry/backoff 구현
4. 단위 테스트와 지연 네트워크 시뮬레이션 케이스 추가

## Review Checklist (Plan Review)

- [x] ACK 없는 서버 버전과의 호환 처리 방침이 있는가?
- [x] 재시도 로직이 중복 세션/중복 청크를 만들지 않는가?
- [x] 타임아웃 값이 모바일 네트워크에서도 현실적인가?

## Implementation Log

- [x] handshake 상태기계 수정
  - `webapp/src/services/api/rtzrStreamingClient.ts`
  - websocket open 후 즉시 `open` 확정하지 않고 ACK 대기 유지
  - ACK 타임아웃 시 `STREAM_ACK_TIMEOUT`으로 소켓 종료 후 재연결 루프 진입
  - `onopen`에서 reconnect counter 초기화 제거, handshake 성공 시점으로 이동
- [x] 오류 코드/메시지 정리
  - `webapp/src/pages/RealtimeSessionPage.tsx`: close reason / error detail code가 `STREAM_ACK_TIMEOUT`이면 전용 안내 문구 노출
  - `webapp/src/i18n/translations.ts`: `streamAckTimeoutTryAgain` 추가
- [x] 테스트 케이스 추가
  - `webapp/src/services/api/rtzrStreamingClient.test.ts`
  - ACK 수신 전 onOpen 미호출 + ACK 후 버퍼 flush 검증
  - ACK timeout 시 재연결/영구실패 경로 검증

## Review Checklist (Implementation Review)

- [x] READY 전 데이터 전송이 차단되는가?
- [x] 타임아웃/재시도 중 UI 상태가 일관적인가?
- [x] 기존 정상 경로 latency 회귀가 없는가?

## Verify

- `npm --prefix webapp test`
- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- 지연 네트워크 수동 테스트(ACK 지연/미수신)
- 실시간 전사 스모크(시작 직후 발화 누락 여부)
