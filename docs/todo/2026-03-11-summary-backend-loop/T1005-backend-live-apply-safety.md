# T1005 - Backend Live Apply/Reset Safety

## Spec

### 문제

- current backend settings UI는 `Apply To Server`와 `Return To Server Default`를 즉시 실행한다.
- live backend endpoint/credential 반영은 operator error cost가 큰 destructive action인데 confirm/undo contract가 없다.

### 목표

- live backend runtime 변경을 operator-safe action flow로 바꾼다.
- 실행 전 impact와 rollback semantics를 UI에서 이해할 수 있게 만든다.

### 범위

- 포함:
  - apply/reset confirm 또는 undo-safe interaction
  - impact copy(어떤 endpoint/credential/deployment가 바뀌는지)
  - pending / success / rollback helper copy
  - draft-blocked 상태와 action safety 관계 정리
- 제외:
  - backend profile/binding structured inspector
  - credential secret storage 완결 구현

### 해결방안

- live server mutation은 confirm dialog 또는 명시적 undo window를 거치게 한다.
- action sheet/dialog에서 current vs next state를 비교해 보여준다.
- reset은 destructive action tone으로 분리한다.

### 상세 설계

#### A. Action Taxonomy

- `Apply To Server`
  - selected preset을 live runtime override로 반영
  - current vs next deployment/base URL/credential usage를 확인해야 함
- `Return To Server Default`
  - live runtime override를 제거
  - active preset selection과 live server state가 동시에 변할 수 있음

#### B. Confirmation Contract

- apply/reset 모두 immediate mutation 전에 explicit confirm step을 둔다.
- confirm dialog는 최소 다음 정보를 보여준다.
  - action type
  - current server state summary
  - next server state summary
  - impact helper copy
  - rollback hint
- reset은 warning/destructive tone으로, apply는 primary tone으로 구분한다.

#### C. Feedback Contract

- pending:
  - button loading state
  - duplicate submit 방지
- success:
  - live state refresh
  - updated active preset / server-default state 정렬
  - success copy에 what changed를 명시
- failure:
  - current server state를 유지한 채 error surface 노출
  - retry action 제공

#### D. Draft / Operator Boundary

- connection draft가 dirty일 때 live action이 막히면, disabled 이유와 필요한 다음 행동(save/reset)을 inline으로 보여준다.
- admin token 또는 internal admin URL 누락도 confirm 이전 단계에서 막고 이유를 노출한다.

#### E. Safe Default / Rollback

- explicit undo endpoint가 없으면 confirm-first를 기본으로 한다.
- apply 직전 snapshot을 UI memory에 보존할 수 있다면 post-success quick revert action을 추가 검토할 수 있다.
- rollback affordance가 없더라도 최소한 revert path(helper copy + current state visibility)는 보여준다.

### 수용 기준 (AC)

- [ ] `Apply To Server`와 `Return To Server Default`가 immediate destructive action이 아니게 된다.
- [ ] 실행 전 current/next state impact를 읽을 수 있다.
- [ ] success/failure/rollback helper copy가 action 의미를 분명히 설명한다.
- [ ] operator draft block 상태와 live action disable 이유가 일관되게 드러난다.

## Plan (Review 대상)

1. apply/reset action taxonomy와 risk level을 먼저 나눈다.
2. confirm dialog가 보여야 할 current/next state summary를 고정한다.
3. pending/success/failure feedback contract를 정한다.
4. draft/admin-token/internal-url missing state의 blocked reason을 inline helper로 연결한다.
5. explicit undo 미지원 환경의 safe default를 confirm-first로 확정한다.

## Review Checklist (Plan Review)

- [x] destructive action이 confirm 또는 undo 없이 실행되지 않는가?
- [x] current/next state 차이가 operator에게 충분히 보이는가?
- [x] reset tone과 apply tone이 구분되는가?
- [x] blocked reason과 rollback helper가 포함되는가?

## Self Review 1 - Scope Fit

- [x] operator error cost가 높아 P1이 타당하다.
- [x] review finding을 그대로 구현 task로 환원했다.

## Self Review 2 - Safety / UX

- [x] apply/reset을 동일한 destructive action family로 보되 tone을 분리했다.
- [x] confirm 이전 단계에서 blocked reason을 해결 가능하게 보여주도록 넣었다.
- [x] explicit undo가 없을 때도 confirm-first safe default를 문서에 고정했다.

## Self Review 3 - Executability

- [x] action taxonomy -> confirm dialog -> feedback -> blocked state 순으로 구현 순서가 명확하다.
- [x] 현재 `SettingsPage`의 버튼 위치에 그대로 끼워 넣을 수 있는 수준으로 범위를 잡았다.
- [x] verify 항목이 `SettingsPage` 테스트와 standard gates에 연결된다.

## Implementation Log

- [ ] apply/reset confirmation flow를 구현한다.
- [ ] current/next state impact copy를 추가한다.
- [ ] blocked reason inline helper와 confirm entry condition을 정리한다.
- [ ] success/failure/rollback feedback를 정리한다.

## Review Checklist (Implementation Review)

- [ ] accidental click으로 live backend가 바뀌지 않는가?
- [ ] disabled 상태의 이유가 inline helper로 드러나는가?
- [ ] reset 후 active preset/server default state가 일관되게 정렬되는가?

## Verify

- [ ] `npm --prefix webapp run test -- SettingsPage`
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run build`
