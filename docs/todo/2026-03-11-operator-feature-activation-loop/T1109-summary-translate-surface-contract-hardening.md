# T1109 - Summary / Translate Surface Contract Hardening

## Spec

### 문제

- detail full summary surface가 transcript revision마다 자동으로 다시 실행돼 stale 후 explicit regenerate contract를 깨고 있다.
- published summary가 남아 있으면 최신 failed run이 surface에서 가려져 retry affordance가 사라진다.
- realtime session을 삭제해도 turn-level translation artifact가 남아 translate local state가 orphan 된다.
- webapp i18n gate도 `session` key 누락으로 현재 green이 아니다.

### 목표

- summary surface가 durable summary contract의 stale/failed semantics를 정확히 반영한다.
- translation artifact lifecycle이 session deletion과 함께 닫힌다.
- webapp i18n gate를 다시 green으로 만든다.

### 범위

- 포함:
  - detail full summary auto-run trigger 조건 보정
  - published content가 있어도 latest failed run을 surface에 드러내는 상태 모델 보정
  - translation artifact delete cascade
  - 누락된 i18n key 복구
- 제외:
  - operator live runtime sync
  - bundle budget recovery

### 해결방안

- full summary는 최초 empty state auto-run만 허용하고, transcript mutation 후에는 stale 상태와 explicit regenerate만 남긴다.
- summary surface view는 최신 run이 failed면 published content가 있어도 failed state와 preserved sections를 함께 보여준다.
- transcription delete transaction에 turnTranslations cleanup을 포함한다.
- `i18n:check` 실패 키를 translations에 추가한다.

### 수용 기준 (AC)

- [x] transcript mutation 후 full summary는 stale로 남고 자동 재실행되지 않는다.
- [x] latest failed run이 있으면 published content가 있어도 failed state/retry affordance가 유지된다.
- [x] transcription deletion 시 translation artifacts가 함께 제거된다.
- [x] `npm --prefix webapp run i18n:check`가 green이다.

## Plan

1. detail full summary auto-run 조건을 summary contract에 맞게 좁힌다.
2. summary surface view precedence를 failed/latest-run 기준으로 정렬한다.
3. translation persistence cleanup를 delete flow와 test에 반영한다.
4. 누락된 i18n key를 복구하고 관련 게이트를 재실행한다.

## Review Checklist (Plan Review)

- [x] initial empty-state auto-run과 stale-after-mutation explicit regenerate를 구분하는가?
- [x] failed state가 published content를 완전히 지우지 않고 retry 맥락을 유지하는가?
- [x] delete cascade가 summary/search/media cleanup과 같은 transaction boundary를 지키는가?
- [x] i18n fix가 ad-hoc string 추가로 흐르지 않는가?

## Implementation Log

- [x] detail full summary auto-run을 최초 empty-state bootstrap에만 제한했다.
- [x] summary surface failed precedence를 보강해 published content가 있어도 latest failed run을 숨기지 않도록 수정했다.
- [x] transcription delete flow에 translation artifact cleanup과 회귀 테스트를 추가했다.
- [x] 누락된 `session` translation key를 추가해 i18n gate를 복구했다.

## Review Checklist (Implementation Review)

- [x] stale/full summary regenerate contract가 detail UX와 맞는가?
- [x] failed state에서 helper copy와 preserved content가 동시에 읽히는가?
- [x] translation cleanup이 unrelated session records를 지우지 않는가?
- [x] summary/translation regression tests가 새 precedence를 보장하는가?

## Verify

- [x] `npm --prefix webapp run test -- src/components/summary/summarySurfaceModel.test.ts src/services/data/transcriptionRepository.test.ts`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run lint`
