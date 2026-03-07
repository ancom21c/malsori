# T802 - Runtime Error Reporter Hydration-safe Init

## Spec

### 문제

- runtime error reporter가 hydrated settings 없이 1회만 초기화된다.
- IndexedDB에 저장된 `adminApiBaseUrl`만 있는 경우 reporting이 비활성 상태로 고정될 수 있다.

### 목표

- hydrated settings 이후에도 runtime error reporter가 정확히 enable 판단을 하도록 만든다.

### 범위

- 포함:
  - reporter init 타이밍 재설계
  - hydration-aware enable logic
  - 회귀 테스트
- 제외:
  - observability payload schema 변경

### 해결방안

- reporter를 eager side-effect가 아니라 app/provider lifecycle에서 초기화한다.
- hydrated state를 확인한 뒤 init하고, idempotent subscription을 유지한다.

### 상세 설계

- `main.tsx`의 eager `initRuntimeErrorReporter()`를 제거하고 app 내부 effect로 이동한다.
- reporter module은 `init` / `update` 또는 hydration-safe `ensureInitialized` 모델을 가진다.
- runtime config flag는 여전히 필요하지만, admin base URL은 hydrated store를 기준으로 판정한다.

### 수용 기준 (AC)

- [ ] persisted `adminApiBaseUrl`만 있어도 hydration 이후 reporter가 활성화됨
- [ ] runtime flag가 false면 여전히 reporter 비활성
- [ ] double-init / duplicate listeners 없음

## Plan (Review 대상)

1. 현재 eager init 경로를 제거한다.
2. hydration-aware effect를 app/provider에 추가한다.
3. reporter tests로 hydration-after-init 경로를 검증한다.

## Review Checklist (Plan Review)

- [x] duplicate event listener 위험을 막는가?
- [x] runtime config flag contract를 유지하는가?
- [x] persisted admin base only 케이스를 재현 가능한 테스트로 담는가?

## Self Review (Spec/Plan)

- [x] 런타임 계약을 바꾸지 않고 init 시점만 바로잡는다.
- [x] 회귀 위험이 큰 전역 listener 문제를 테스트로 묶었다.
- [x] 내부망 전용 base URL 정책과도 충돌하지 않는다.

## Implementation Log

- [ ] pending

## Review Checklist (Implementation Review)

- [ ] listeners가 중복 등록되지 않는가?
- [ ] hydrate 완료 전에는 premature send를 시도하지 않는가?
- [ ] tests가 persisted-base case를 잡는가?

## Verify

- [ ] `npm --prefix webapp run test -- runtimeErrorReporter settingsStore`
- [ ] `npm --prefix webapp run lint`
