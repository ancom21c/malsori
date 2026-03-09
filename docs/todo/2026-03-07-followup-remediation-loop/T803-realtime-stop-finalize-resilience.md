# T803 - Realtime Stop / Finalize Resilience

## Spec

### 문제

- reconnect 중 stop 요청 시 buffered audio replay/final 경로가 약하다.
- 현재는 socket이 열린 경우에만 `final`을 보내고, safety timer 이후 pending chunk가 dropped될 수 있다.

### 목표

- reconnect 중 stop에서도 replay/final을 최대한 시도하고, 불가 시 degraded/drop을 명시적으로 남긴다.

### 범위

- 포함:
  - stop/finalize state machine 보강
  - reconnect 중 stop 처리 로직
  - 관련 테스트 보강
- 제외:
  - upstream protocol 변경

### 해결방안

- stop 요청 시 client가 즉시 reconnect를 포기하지 않고, pending replay를 시도할 수 있는 draining/finalizing phase를 도입한다.
- 일정 시간 내 reopen/replay/final 실패 시 degraded metadata와 명확한 사용자 메시지로 종료한다.

### 상세 설계

- streaming client에 `requestFinalDuringRecovery` 또는 equivalent drain path를 추가한다.
- `stopSession(false)`는 reconnect 중이면 drain timeout 동안 socket reopen/final을 허용한다.
- 실패 시 dropped metrics를 유지한 채 `completed-with-degradation` semantics에 가까운 local metadata를 남긴다.

### 수용 기준 (AC)

- [ ] reconnect 중 stop에서도 pending replay/final 경로를 시도함
- [ ] drain 실패 시 silent drop 대신 degraded/drop metadata가 남음
- [ ] unit test 또는 model test로 reconnect-stop case 재현 가능

## Plan (Review 대상)

1. 현재 stop/finalize 흐름과 client API를 좁혀서 수정한다.
2. reconnect-stop 전용 drain path를 추가한다.
3. timeout/fallback message와 metadata patch를 정렬한다.
4. targeted test를 추가한다.

## Review Checklist (Plan Review)

- [x] normal stop path를 불필요하게 복잡하게 만들지 않는가?
- [x] drain timeout 이후에도 session이 hanging 되지 않는가?
- [x] degraded metrics contract와 충돌하지 않는가?

## Self Review (Spec/Plan)

- [x] 데이터 유실을 없애거나 최소한 설명 가능한 상태로 만드는 데 집중했다.
- [x] protocol 변경 없이 client/session layer 안에서 해결 가능하도록 설계했다.
- [x] 저장 metadata와 사용자 메시지를 함께 다루도록 했다.

## Implementation Log

- [x] `RtzrStreamingClient`에 final 요청 상태를 추가해 reconnect 중에도 buffered audio flush 후 `final`을 보낼 수 있게 했다.
- [x] normal stop path에서 recorder flush를 먼저 실행한 뒤 `requestFinal()`을 호출하도록 순서를 바꿨다.
- [x] stop 중 reconnect/open callback이 다시 `recording` 상태로 되돌아가지 않도록 `RealtimeSessionPage` state transition을 가드했다.
- [x] degraded save 시 warning snackbar를 띄워 결과 불완전 가능성을 명시했다.
- [x] reconnect-mid-stop 경로를 `rtzrStreamingClient.test.ts`로 고정했다.

## Review Checklist (Implementation Review)

- [x] normal stop/abort/reconnect retry regression이 없는가?
- [x] timeout 후 finalize가 deterministic한가?
- [x] tests가 drain 실패와 성공 경로를 모두 포함하는가?

## Verify

- [x] `npm --prefix webapp run test -- rtzrStreamingClient`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
