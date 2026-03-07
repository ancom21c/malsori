# T807 - Detail Ergonomics Recovery

## Spec

### 문제

- detail page global shortcut이 페이지 탐색을 과도하게 가로챈다.
- title edit가 더블클릭 hidden affordance에 의존한다.

### 목표

- detail interaction을 explicit하고 예측 가능하게 만든다.

### 범위

- 포함:
  - shortcut scope 축소 또는 guard 강화
  - visible title edit affordance 추가
  - 관련 copy/a11y 보강
- 제외:
  - detail 전체 layout 재설계

### 해결방안

- shortcut은 transcript/player scope 또는 명시적 focus context에서만 동작시킨다.
- title은 edit button/icon을 노출하고 keyboard path를 제공한다.

### 상세 설계

- global `window` listener를 줄이거나 더 엄격한 target/scope guard를 둔다.
- Media header에 `Edit Title` button/icon을 추가한다.
- hidden double-click hint는 보조 affordance로만 남기거나 제거한다.

### 수용 기준 (AC)

- [ ] page-level arrow/hjkl hijack이 사라짐 또는 강하게 scope 제한됨
- [ ] title edit에 visible, focusable affordance 존재
- [ ] keyboard-only로 title edit 진입 가능

## Plan (Review 대상)

1. 현재 global shortcut scope를 분석해 최소 수정으로 축소한다.
2. title edit CTA를 media header에 추가한다.
3. helper copy를 새 affordance 기준으로 정리한다.

## Review Checklist (Plan Review)

- [x] power-user shortcut을 완전히 없애지 않고 scope만 안전하게 줄일 수 있는가?
- [x] title edit CTA가 compact/non-compact layout 둘 다에 맞는가?
- [x] keyboard path가 명시적인가?

## Self Review (Spec/Plan)

- [x] operator efficiency와 일반 탐색 안전성 사이 균형을 목표로 했다.
- [x] hidden affordance 제거는 usability 개선 효과가 크다.
- [x] detail page write scope가 제한적이라 commit 단위가 선명하다.

## Implementation Log

- [ ] pending

## Review Checklist (Implementation Review)

- [ ] shortcut regression 없이 player/transcript 조작이 가능한가?
- [ ] title edit CTA가 compact layout에서도 접근 가능한가?
- [ ] copy와 actual interaction이 일치하는가?

## Verify

- [ ] `npm --prefix webapp run test -- AppRouter`
- [ ] `npm --prefix webapp run lint`
