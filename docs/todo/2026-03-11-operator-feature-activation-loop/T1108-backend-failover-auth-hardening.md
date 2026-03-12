# T1108 - Backend Failover / Auth Hardening

## Spec

### 문제

- operator panel은 health/fallback 상태를 보여주지만, 현재 runtime은 `degraded` profile을 계속 operational로 취급해 fallback으로 넘기지 못한다.
- summary/translate provider 호출이 request 시점에서 실패해도 binding fallback이 실제로 동작하지 않는다.
- profile contract는 일부 auth/credential 조합을 저장할 수 있지만, summary/translate 실행 경로에서는 즉시 unsupported error로 깨져 CRUD와 runtime truth가 어긋난다.

### 목표

- health snapshot, binding resolution, request-time failover가 같은 readiness 기준을 사용하도록 맞춘다.
- summary/translate provider-backed execution이 primary outage나 auth misconfiguration을 fallback으로 흡수할 수 있게 한다.
- operator가 저장 가능한 profile shape와 실제 실행 가능한 profile shape를 맞춘다.

### 범위

- 포함:
  - backend profile health probe 상태 해석 보정
  - summary/translate binding resolution의 operational 기준 보정
  - request-time provider failure fallback
  - summary/translate profile auth/credential contract validation
  - backend health refresh path의 async-safe 호출
- 제외:
  - 새로운 auth provider 구현
  - deploy smoke evidence 캡처

### 해결방안

- 4xx probe와 unsupported runtime contract는 `misconfigured`로, timeout/5xx는 non-ready 상태로 분리한다.
- binding resolution은 `healthy | unknown`만 operational로 보고, primary request 실패 시 fallback으로 한 번 더 시도한다.
- summary/translate capability를 가진 profile은 현재 vertical slice에서 지원하는 auth/credential 조합만 저장 가능하게 제한한다.
- admin health refresh endpoint는 blocking probe를 thread offload로 실행한다.

### 수용 기준 (AC)

- [x] degraded/misconfigured/unreachable 상태가 runtime selection에 반영된다.
- [x] summary/translate provider request failure 시 fallback 재시도가 범위에 포함된다.
- [x] unsupported auth/credential 조합이 저장 단계나 health 단계에서 드러난다.
- [x] async admin route가 blocking probe를 직접 잡고 있지 않다.

## Plan

1. summary/translate profile readiness contract를 함수 단위로 정리한다.
2. health probe와 binding resolution의 operational 상태 집합을 정렬한다.
3. summary/translate request path에 fallback retry를 추가한다.
4. unsupported auth/credential shape를 normalization/test 단계에서 차단한다.
5. backend health refresh를 thread offload로 바꾸고 회귀 테스트를 보강한다.

## Review Checklist (Plan Review)

- [x] fallback이 capability mismatch까지 가리지 않고 runtime outage에만 안전하게 개입하는가?
- [x] health snapshot과 request-time auth validation이 서로 다른 truth를 만들지 않는가?
- [x] unsupported contract 차단이 legacy STT profile까지 과도하게 좁히지 않는가?
- [x] async route에서 blocking I/O가 제거되는가?

## Implementation Log

- [x] summary/translate runtime contract에서 non-ready health와 unsupported auth shape를 같은 기준으로 해석하도록 정렬했다.
- [x] provider request failure 시 fallback backend로 재시도하도록 summary/translate execution path를 보강했다.
- [x] backend profile normalization/health probe/test를 current provider-backed vertical slice contract에 맞게 강화했다.
- [x] backend profile health refresh endpoint를 thread offload로 실행하도록 바꿨다.

## Review Checklist (Implementation Review)

- [x] operator inspector와 실제 request path가 같은 readiness truth를 쓰는가?
- [x] request-time failover가 primary/fallback audit metadata를 깨지 않는가?
- [x] unsupported auth/credential rejection이 기존 allowed contract와 충돌하지 않는가?
- [x] backend tests가 degraded/misconfigured/request-failover를 커버하는가?

## Verify

- [x] `python3 -m unittest discover -s python_api/tests`
- [x] `python3 -m compileall python_api/api_server`
- [x] `npm --prefix webapp run test -- src/domain/backendProfile.test.ts src/domain/featureBinding.test.ts src/components/backendBindingOperatorModel.test.ts`
