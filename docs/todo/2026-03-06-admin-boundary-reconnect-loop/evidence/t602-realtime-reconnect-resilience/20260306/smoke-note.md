# T602 Smoke Note (2026-03-06)

## Scope

- recorder-first realtime session preparation
- reconnect buffer duration budget
- degraded signaling on dropped buffered audio

## Evidence

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- `npm --prefix webapp run test -- rtzrStreamingClient realtimeSessionModel`
- `npm --prefix webapp run test -- AppRouter`

## Unit-level smoke coverage

- ready ack 이후 buffered audio가 FIFO로 replay되는지 검증
- duration budget 초과 시 oldest buffered audio가 drop되고 `degraded=true`가 되는지 검증
- reconnect 완료 전 disconnect 시 buffered audio loss가 drop metric으로 집계되는지 검증

## Notes

- 이번 턴에서는 브라우저 실기 smoke 대신 transport/unit coverage로 reconnect/drop 경계를 검증했다.
- live browser smoke는 배포 단계에서 실제 websocket endpoint와 함께 다시 확인하는 것이 맞다.
