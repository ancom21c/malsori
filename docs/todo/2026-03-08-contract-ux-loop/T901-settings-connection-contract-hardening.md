# T901 - Settings Connection Contract Hardening

## Spec

### 문제

- dirty state는 raw string 비교를 사용하고, 실제 저장 계획은 normalized URL 비교를 사용한다.
- persisted setting 값이 변하면 사용자의 editing draft가 무조건 덮어써질 수 있다.

### 목표

- draft/change/save contract를 하나의 deterministic 기준으로 통일한다.
- 편집 중 draft가 hydration 또는 후속 store update에 의해 조용히 유실되지 않도록 한다.

### 범위

- 포함:
  - `settingsConnectionModel` dirty 판단 로직 정렬
  - `SettingsPage` draft seed/reset/save lifecycle 정리
  - 필요한 테스트 보강
- 제외:
  - cross-tab conflict resolution
  - settings 전체 IA 변경

### 해결방안

- dirty 판단에도 public/admin base URL normalizer를 동일하게 적용한다.
- draft는 `lastCommitted` snapshot 또는 `seeded` contract를 기준으로 관리한다.
- persisted 값 반영 effect는 `dirty === false`일 때만 draft를 동기화하거나, explicit save/reset 직후에만 draft를 재seed한다.
- save 성공 후 committed snapshot과 draft를 함께 갱신해 false dirty를 방지한다.

### 상세 설계

- `hasConnectionSettingsDraftChanges()`는 saved/draft 양쪽을 normalize해서 비교한다.
- `SettingsPage`는 초기 hydrate 이후 한 번만 draft seed를 허용하거나, committed snapshot ref/state를 별도로 둔다.
- 외부 persisted 값 변화 감지는 dirty 상태일 때 draft를 그대로 두고, saved baseline만 갱신할지 여부를 명시적으로 선택한다.
- 테스트는 다음 시나리오를 포함한다.
  - whitespace/default slash 차이만 있는 경우 dirty false
  - dirty 편집 중 persisted 값 변경 시 draft 보존
  - save/reset 직후 dirty false

### 수용 기준 (AC)

- [ ] semantically 동일한 URL 값은 dirty로 보이지 않는다.
- [ ] dirty 편집 중 store 값 변화가 draft를 덮어쓰지 않는다.
- [ ] save/reset 후 dirty state가 즉시 false로 정렬된다.
- [ ] 관련 unit test가 추가되거나 갱신된다.

## Plan (Review 대상)

1. model 수준에서 normalize contract를 먼저 고친다.
2. page에서 draft seed/reset 조건을 explicit state machine처럼 정리한다.
3. unit test로 whitespace/default/overwrite edge case를 고정한다.

## Review Checklist (Plan Review)

- [x] dirty 판단과 save 판단이 동일한 normalizer를 쓰는가?
- [x] hydrate/save 직후와 user editing 중 상태 전이가 구분되는가?
- [x] 후속 store update를 막기보다, draft overwrite만 방지하는 안전한 범위인가?

## Self Review (Spec/Plan)

- [x] correctness 중심 문제라 P1 우선순위가 맞다.
- [x] UI repaint보다 state transition contract를 먼저 고치는 방향이 적절하다.
- [x] save/reset/hydrate edge case가 AC에 포함돼 있다.

## Implementation Log

- [x] `settingsConnectionModel`에 normalized equality / draft normalization / persisted sync helper를 추가했다.
- [x] dirty 판단과 update plan이 동일한 normalized contract를 사용하도록 정리했다.
- [x] `SettingsPage`에 committed connection baseline을 도입하고, clean 상태에서만 persisted 값으로 draft를 reseed하도록 바꿨다.
- [x] save/reset 시 draft와 committed snapshot을 함께 갱신하도록 정리했다.
- [x] whitespace/default/overwrite-safe reseed 시나리오 unit test를 보강했다.

## Review Checklist (Implementation Review)

- [x] false dirty/false leave warning이 제거됐는가?
- [x] save 성공 후 baseline/draft가 동시에 정렬되는가?
- [x] 기존 operator actions 차단 contract가 유지되는가?

## Verify

- [x] `npm --prefix webapp run test -- settingsConnectionModel AppRouter`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
