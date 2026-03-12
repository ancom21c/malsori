# T1110 - Live Activation Runtime / Release Gate Recovery

## Spec

### 문제

- operator binding/profile 변경이 현재 SPA에서는 build-time runtime constant에 고정돼 `/translate` route와 summary/translate visibility가 live wiring처럼 반영되지 않는다.
- 현재 dirty worktree 기준으로 `bundle:check`가 다시 실패해 webapp release gate가 green이 아니다.

### 목표

- operator live runtime state와 app surface visibility가 같은 truth를 사용하도록 정렬한다.
- webapp release gate(`lint`, `i18n:check`, `build`, `bundle:check`, `test`)를 다시 green으로 만든다.

### 범위

- 포함:
  - shared live runtime state 설계/도입
  - router/layout/summary/translate surface의 static runtime dependency 제거
  - bundle overage 재측정과 recovery
  - perf note / release gate truth 정렬
- 제외:
  - deploy smoke evidence

### 해결방안

- static env bootstrap은 initial snapshot으로만 쓰고, operator refresh/save 결과를 surface들이 읽는 shared runtime state를 둔다.
- route visibility와 artifact readiness를 live runtime state에 연결한다.
- bundle overage는 code split 또는 disabled-feature exclusion을 측정 기반으로 조정하고, threshold 완화는 마지막 수단으로 남긴다.

### 수용 기준 (AC)

- [x] live activation runtime/release gate 문제와 범위가 고정된다.
- [x] static runtime dependency 제거와 bundle recovery가 task 범위에 포함된다.
- [ ] operator 변경이 reload 없이 현재 SPA surface에 반영된다.
- [ ] `npm --prefix webapp run bundle:check`가 green이다.

## Plan

1. live runtime state 소유권과 update path를 정한다.
2. AppRouter/MainLayout/summary/translate surface의 static dependency를 제거한다.
3. bundle overage를 현재 build 산출물 기준으로 다시 측정한다.
4. 필요한 split/exclusion/doc update를 적용한 뒤 release gate를 재검증한다.

## Review Checklist (Plan Review)

- [x] public surface가 internal admin token 의존성을 새로 갖지 않는가?
- [x] shared runtime state가 build-time bootstrap과 충돌하지 않는가?
- [x] bundle recovery가 단순 threshold 완화로 끝나지 않도록 제한했는가?
- [x] perf note와 actual gate 결과를 함께 맞출 계획인가?

## Implementation Log

- [ ] shared live runtime state와 route/surface update path를 구현한다.
- [ ] bundle overage 측정과 recovery를 적용한다.

## Review Checklist (Implementation Review)

- [ ] operator 변경이 현재 SPA surface visibility와 충돌 없이 반영되는가?
- [ ] bundle recovery가 disabled-feature truth와 perf note를 함께 만족하는가?

## Verify

- [ ] `npm --prefix webapp run build`
- [ ] `npm --prefix webapp run bundle:check`
- [ ] `npm --prefix webapp run test`
