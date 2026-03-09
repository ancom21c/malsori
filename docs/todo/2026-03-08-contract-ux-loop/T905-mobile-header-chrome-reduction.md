# T905 - Mobile Header Chrome Reduction

## Spec

### 문제

- 모바일 상단 바가 menu/title 외에 global status까지 계속 노출해 작업 화면보다 chrome이 무겁다.
- `CloudSyncStatus`는 유용하지만 작은 화면에서 항상 header에 둘 필요는 없다.

### 목표

- 모바일 top bar를 더 가볍게 만들어 page task를 우선한다.
- cloud sync 상태는 접근 가능하되, 상단 고정 chrome의 우선순위를 낮춘다.

### 범위

- 포함:
  - mobile header composition 조정
  - `CloudSyncStatus` 노출 위치/표현 재배치
  - 필요한 drawer/menu/settings entry 보강
- 제외:
  - desktop header 전면 재설계
  - cloud sync 기능 변경

### 해결방안

- 작은 화면에서는 `CloudSyncStatus`를 header에서 내리고 navigation drawer 또는 settings entry에서 확인 가능하게 한다.
- desktop/tablet 이상에서는 현재 compact status 표현을 유지하거나 약하게 축소한다.
- top bar는 `menu + title + language` 우선으로 정리한다.

### 상세 설계

- `MainLayout` breakpoint 기준으로 `CloudSyncStatus`의 owner를 분기한다.
- mobile에서는 drawer 내 status row 또는 settings quick link로 상태를 노출한다.
- header action spacing을 다시 조정해 title breathing room을 확보한다.

### 수용 기준 (AC)

- [ ] 모바일 header에서 global chrome 밀도가 줄어든다.
- [ ] cloud sync 상태는 여전히 discoverable 하다.
- [ ] desktop 동작은 불필요하게 깨지지 않는다.

## Plan (Review 대상)

1. breakpoint별 header owner를 정의한다.
2. mobile 대체 진입점(drawer 또는 settings quick entry)을 둔다.
3. title/action spacing과 tap target을 같이 점검한다.

## Review Checklist (Plan Review)

- [x] 상태 discoverability를 잃지 않는가?
- [x] desktop behavior를 불필요하게 흔들지 않는가?
- [x] mobile top bar priority가 더 명확해지는가?

## Self Review (Spec/Plan)

- [x] UX 문제를 기능 삭제가 아니라 owner 재배치로 풀도록 설계했다.
- [x] mobile-first 우선순위가 명확하다.
- [x] verification 기준이 시각 밀도와 discoverability 모두를 포함한다.

## Implementation Log

- [x] `CloudSyncStatus`에 header/menu variant를 추가해 owner를 옮길 수 있게 했다.
- [x] mobile header에서는 cloud sync status를 제거하고, navigation menu 상단에 menu variant로 재배치했다.
- [x] desktop/tablet에서는 기존 header status 노출을 유지했다.
- [x] menu variant에서 sign-in/sign-out과 연결 상태를 compact row로 정리했다.

## Review Checklist (Implementation Review)

- [x] mobile header가 실제로 더 가벼워졌는가?
- [x] cloud sync status에 도달하는 경로가 남아 있는가?
- [x] drawer/settings 대체 위치가 과도하게 숨겨지지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- AppRouter`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
