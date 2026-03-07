# T703 - Settings Manual Intent Hardening

## Spec

### 문제

- API base URL 입력이 store에 즉시 저장된다.
- operator availability effect가 입력 중에도 재실행될 수 있다.
- URL field가 URL 입력 affordance를 충분히 주지 못한다.

### 목표

- URL 입력/저장/refresh를 manual-intent 기반으로 정리한다.
- operator boundary UX를 유지하면서 background churn을 제거한다.

### 범위

- 포함:
  - `apiBaseUrl`, `adminApiBaseUrl` draft state 도입
  - explicit save action 도입
  - availability fetch trigger 축소
  - URL field semantics 개선
- 제외:
  - backend state apply/reset contract 변경

### 해결방안

- persisted settings와 form draft를 분리한다.
- page entry에서 persisted 값 기준 availability만 1회 조회한다.
- draft 수정 중에는 아무 네트워크 요청도 보내지 않는다.
- 저장 후에만 persisted state를 갱신하고 availability를 다시 확인한다.

### 상세 설계

- settings page에 `connectionDraft` state를 둔다.
- `Save Connection Settings` 버튼을 추가한다.
- URL field는 `type="url"`, `name`, `autoComplete="off"`를 명시한다.
- 저장 전 draft와 persisted 값이 다르면 dirty state를 보여준다.
- admin token은 계속 local memory only를 유지한다.

### 수용 기준 (AC)

- [ ] URL 입력 중에는 health/admin API가 자동 호출되지 않음
- [ ] URL 저장은 explicit action에서만 발생
- [ ] operator availability check는 page entry + explicit refresh로만 동작
- [ ] URL field가 모바일 URL keyboard 등 올바른 affordance를 제공

## Plan (Review 대상)

1. 현재 persisted state와 입력 state를 분리한다.
2. availability effect dependency를 persisted 값으로 제한한다.
3. save/refresh UX를 명확한 verb-first button으로 정리한다.
4. URL form semantics를 보강한다.

## Review Checklist (Plan Review)

- [x] T603 manual-intent contract와 정확히 맞는가?
- [x] token persistence 금지 원칙을 깨지 않는가?
- [x] 입력 중 churn을 구조적으로 제거하는가?

## Self Review (Spec/Plan)

- [x] debounce보다 draft/save 분리가 더 명확하고 안전하다.
- [x] operator boundary wording을 유지하면서 interaction noise를 줄인다.
- [x] UX 개선과 네트워크 안정화가 동시에 된다.

## Implementation Log

- [ ] 구현 전

## Review Checklist (Implementation Review)

- [ ] 구현 후 spec drift가 없는지 확인
- [ ] regression risk를 점검
- [ ] verify 명령과 문서 역할이 일치하는지 확인

## Verify

- [ ] 구현 후 검증 명령 기록
