# T806 - List Navigation / Accessibility Hardening

## Spec

### 문제

- filter URL은 반영되지만 `replace: true`로 인해 back/forward history가 충분하지 않다.
- filter/menu trigger는 expanded state semantics가 부족하다.

### 목표

- list filter navigation을 browser history에 더 자연스럽게 맞추고, disclosure semantics를 보강한다.

### 범위

- 포함:
  - filter history sync policy 조정
  - trigger `aria-expanded` / `aria-controls`
  - 필요한 unit test 조정
- 제외:
  - filter IA의 대대적 재구성

### 해결방안

- state -> URL sync는 user-initiated filter change에서 history entry를 남길 수 있게 조정한다.
- collapse/popover trigger에는 열린 상태와 대상 id를 제공한다.

### 상세 설계

- filter reset/patch path에서 query update policy를 명시적으로 관리한다.
- advanced filter collapse button, menu button 등 disclosure control에 ARIA state를 넣는다.
- URL parser/serializer는 유지하되 sync strategy만 바꾼다.

### 수용 기준 (AC)

- [ ] filter 변경 후 browser back/forward가 의미 있게 동작
- [ ] advanced filter/menu trigger가 expanded state를 노출
- [ ] 기존 deep-link 동작은 유지

## Plan (Review 대상)

1. current sync strategy를 push/replace 기준으로 재정의한다.
2. disclosure trigger에 ARIA state를 추가한다.
3. filter parser tests를 필요 범위만 보강한다.

## Review Checklist (Plan Review)

- [x] history spam을 과도하게 만들지 않는가?
- [x] deep-link/share behavior를 깨지 않는가?
- [x] disclosure semantics가 실제 id/open state와 연결되는가?

## Self Review (Spec/Plan)

- [x] URL state와 ARIA disclosure를 같은 navigation/accessibility 축으로 묶었다.
- [x] 현재 구조를 유지하면서 behavior만 개선하는 방향이다.
- [x] history push 남용 위험을 review 항목에 포함했다.

## Implementation Log

- [ ] pending

## Review Checklist (Implementation Review)

- [ ] back/forward와 controlled state가 충돌하지 않는가?
- [ ] trigger id/open state가 정확히 대응하는가?
- [ ] reset/default path가 여전히 안정적인가?

## Verify

- [ ] `npm --prefix webapp run test -- transcriptionListFilterState AppRouter`
- [ ] `npm --prefix webapp run lint`
