# T603 - Operator Settings Safe Default / Manual Intent / Boundary UX

## Spec

### 문제

- operator settings는 서버 응답에 `backendAdminEnabled`가 없을 때도 열리는 쪽으로 기본값이 잡혀 있다.
- admin token 입력 중에도 health/admin 조회가 반복 실행될 수 있다.
- internal-only operator 영역의 경계와 사용 조건이 지금보다 더 명확해야 한다.

### 목표

- operator settings를 safe default 기준으로 잠근다.
- operator API 호출은 explicit intent 기반으로만 실행한다.
- internal-only boundary와 필요한 조건을 UI에서 즉시 이해할 수 있게 만든다.

### 범위

- 포함:
  - `backendAdminEnabled` safe default 정정
  - auto-refresh 제거와 manual refresh flow 정리
  - admin token / internal host / health 상태의 gating UX
  - boundary copy/label 정리
- 제외:
  - base URL 구조 자체는 T601에서 도입

### 해결방안

- `backendAdminEnabled ?? false`로 기본값을 안전하게 바꾼다.
- health fetch는 page entry 또는 explicit refresh로 제한한다.
- admin state fetch/apply/reset은 button click에서만 실행한다.
- operator card 상단에 `Internal only`, `Requires admin token`, `Uses adminApiBaseUrl` 정보를 모은다.

### 상세 설계

- public settings와 operator settings를 별도 section/group으로 나눈다.
- operator group 진입 조건이 만족되지 않으면 disabled explanation card만 보여준다.
- admin token helper text는 "왜 필요한지"와 "어디에 저장되지 않는지"를 함께 설명한다.
- error copy는 "무엇이 막혔는지 + 다음에 무엇을 해야 하는지" 형식으로 통일한다.

### 수용 기준 (AC)

- [ ] `backendAdminEnabled`가 누락되면 operator section은 기본적으로 닫힌다.
- [ ] admin token 입력만으로 operator API가 자동 호출되지 않는다.
- [ ] internal-only 조건과 admin token 조건이 한 화면에서 이해 가능하다.

## Plan (Review 대상)

1. 현재 settings fetch trigger와 gating 조건을 정리한다.
2. safe default와 manual intent flow를 code path 기준으로 분리한다.
3. operator boundary copy/card를 wireframe 수준으로 먼저 반영한다.
4. button-triggered fetch/apply/reset만 남기고 effect-driven 호출을 줄인다.

## Review Checklist (Plan Review)

- [x] operator 기능을 "숨기기"가 아니라 "조건을 드러낸 뒤 잠그기"로 설계했는가?
- [x] token이 local component state를 넘어서 저장되지 않도록 의도를 유지했는가?
- [x] T601과 겹치는 구조 변경 대신 UX/policy hardening에 집중했는가?

## Self Review (Spec/Plan)

- [x] 내부망 전제 정책을 safe default와 UI boundary 양쪽에서 반영했다.
- [x] 호출 빈도 문제와 안내 문구 문제를 함께 해결하도록 묶었다.
- [x] 구현 단위가 비교적 작아 T601 직후 바로 이어서 처리하기 좋다.

## Implementation Log

- [x] fetch trigger inventory 작성
- [x] safe default / manual refresh 로직 반영
- [x] operator boundary card/copy 반영
- [x] settings interaction smoke note 작성

### 구현 메모

- backend 탭을 숨기지 않고 항상 노출하되, 내부망/operator 조건을 먼저 설명하는 boundary card를 추가했다.
- health 기반 operator availability 조회는 `handleRefreshBackendAvailability()`로 분리하고 page entry / explicit refresh에만 연결했다.
- admin state 조회는 `handleRefreshBackendState()` button click에서만 실행되도록 분리했다.
- admin token helper를 "메모리만 사용 / 로컬 미저장" 기준으로 강화했다.

## Review Checklist (Implementation Review)

- [x] token 입력 중 네트워크 요청이 재발하지 않는지 확인
- [x] disabled/operator-unavailable 상태가 misleading 하지 않은지 확인
- [x] internal-only wording이 실제 routing/host contract와 맞는지 확인

## Self Review (Implementation)

- [x] `backendAdminToken`은 더 이상 effect dependency에 포함되지 않으며, server state fetch는 button onClick 경로에만 남겼다.
- [x] backend section은 항상 보이지만, operator availability가 false일 때는 explanation alert만 먼저 노출되도록 정리했다.
- [x] T601의 `adminApiBaseUrl` 분리 계약을 UX wording과 disabled logic에 그대로 맞췄다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] settings operator smoke note 작성
