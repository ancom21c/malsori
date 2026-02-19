# T004 - Realtime 지연/재연결 UX

## Spec

### 문제

- 실시간 전사 중 지연(latency)과 연결 불안정이 사용자에게 충분히 드러나지 않는다.
- 재연결 상태에서 사용자가 "무슨 일이 일어나는지" 이해하기 어렵다.

### 목표

- 지연 상태와 재연결 상태를 명확하게 보여주고, 사용자가 취할 행동(재시도/중단)을 분명히 제공한다.

### 범위

- 포함:
  - 세션 중 latency indicator
  - reconnect 상태 배너/토스트
  - retry/abort 액션 제공
  - 오류 메타데이터 최소 노출(사용자 친화 메시지)
- 제외:
  - 스트리밍 프로토콜 자체 재설계

### 수용 기준 (AC)

- [ ] 연결 지연 상태를 색상/문구로 즉시 인지할 수 있다.
- [ ] 재연결 중/실패 시 다음 행동이 명확하다.
- [ ] 세션 중단/재시도 이후 상태가 일관되게 정리된다.

## Plan (Review 대상)

1. 현재 reconnect state machine 이벤트 정리
2. UI 상태 모델(latency/reconnecting/failed/recovered) 정의
3. 배너/토스트/액션 버튼 설계
4. 오류 메타데이터 노출 수준 합의
5. 회귀 테스트(핵심 state transition) 추가

## Review Checklist (Plan Review)

- [ ] 과도한 알림(노이즈) 없이 핵심 신호만 보여주는가?
- [ ] 모바일 화면에서도 액션이 가려지지 않는가?
- [ ] 재연결 루프 무한 반복 방지 조건이 있는가?

## Implementation Log

- [ ] 상태 모델 추가
- [ ] UI/카피 반영
- [ ] 테스트 반영

## Review Checklist (Implementation Review)

- [ ] 연결 회복 후 UI가 정상 상태로 복귀하는가?
- [ ] 실패 상태에서 사용자 액션이 확실히 동작하는가?
- [ ] 기존 권한/세션 UX와 충돌하지 않는가?

## Verify

- 연결 차단/복구 시뮬레이션으로 상태 전이 확인
- `cd webapp && npm test`
- 수동 스모크: `/realtime`에서 start -> disconnect -> retry/abort
