# T107 - SyncProvider 즉시 동기화 상태기계화

## Spec

### 문제

- SyncProvider의 즉시 동기화 트리거 경로가 모호해 stale closure/no-op 가능성이 있다.
- 동기화 시작/중복 실행/실패 재시도 조건이 코드에서 명확히 드러나지 않는다.

### 목표

- 동기화 트리거를 상태기계로 명확히 정의해 예측 가능한 실행 흐름과 테스트 가능성을 확보한다.

### 범위

- 포함:
  - SyncProvider 상태 전이 명시화
  - 즉시/주기/수동 트리거 우선순위 정리
  - 중복 실행 방지 및 취소 정책 명확화
  - 관련 단위 테스트 보강
- 제외:
  - 동기화 도메인 모델 전면 재설계

### 해결방안

- reducer 기반 상태기계 도입:
  - `idle`, `scheduled`, `running`, `cooldown`, `error`
  - 이벤트(`IMMEDIATE_REQUEST`, `TICK`, `RUN_SUCCESS`, `RUN_FAILURE`)로 전이
- 참조 안정화:
  - effect 내부 클로저 의존 최소화(ref/reducer dispatch 중심)
  - 동기화 함수는 최신 config snapshot만 사용
- 실행 제어:
  - 중복 실행 방지 lock
  - 실행 중 추가 요청은 collapse/debounce 정책 적용

### 수용 기준 (AC)

- [x] 즉시 동기화 요청 시 no-op/stale 동작 없이 단일 실행이 보장된다.
- [x] 실행 중 중복 요청이 안전하게 병합되거나 큐잉된다.
- [x] 실패 후 재시도 규칙이 코드와 UI 상태에서 일관된다.

## Plan (Review 대상)

1. 현재 트리거/타이머/effect 의존성 도식화
2. 상태기계 이벤트/전이표 확정
3. reducer + side-effect 분리 구현
4. 타이머/즉시/중복 요청 단위 테스트 작성

## Review Checklist (Plan Review)

- [x] 상태기계 도입이 코드 복잡도를 과도하게 증가시키지 않는가?
- [x] 동기화 지연 시간이 사용자 UX에 악영향을 주지 않는가?
- [x] 디버깅 로그가 충분한가?

## Implementation Log

- [x] 상태기계 구조 반영
  - `webapp/src/services/cloud/syncStateMachine.ts`에 `idle/scheduled/running/cooldown/error` reducer 도입
- [x] 트리거 경로 정리
  - `SyncProvider`에서 즉시/주기/수동 요청을 `REQUEST_SYNC` 이벤트로 통합
  - 충돌 해소(merge/replace) 후 stale closure 없는 즉시 동기화 트리거로 정리
- [x] 테스트/문서 업데이트
  - `webapp/src/services/cloud/syncStateMachine.test.ts` 추가
  - 보드/태스크 문서 상태 갱신

## Review Checklist (Implementation Review)

- [x] 즉시 동기화가 재현 가능하게 안정 동작하는가?
- [x] 실패/취소/재시도 상태가 UI에서 명확한가?
- [x] 기존 주기 동기화 회귀가 없는가?

## Verify

- `npm --prefix webapp test`
- 수동 시나리오: 즉시 동기화 연타/오프라인 전환/재연결
