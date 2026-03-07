# T805 - Settings Guardrails

## Spec

### 문제

- connection settings draft는 dirty state를 가지지만 저장 전 이탈 시 경고가 없다.
- section navigation은 local state only라 deep-link/back-forward 복귀가 약하다.

### 목표

- settings draft 유실을 막고, section navigation을 URL 기반으로 복구 가능하게 만든다.

### 범위

- 포함:
  - unsaved change unload/route guard
  - section query param sync
  - scroll/active section 안정화
- 제외:
  - settings 전체 IA 재설계

### 해결방안

- dirty draft가 있을 때 `beforeunload`와 route leave guard를 추가한다.
- active section을 query param(`section=`)과 sync한다.

### 상세 설계

- section ids는 `transcription`, `permissions`, `backend`로 고정한다.
- invalid section query는 safe default로 `transcription`으로 돌린다.
- 사용자가 section tab을 누르면 query param과 scroll target을 같이 업데이트한다.

### 수용 기준 (AC)

- [ ] dirty draft 상태에서 새로고침/이탈 시 경고
- [ ] `/settings?section=backend` deep-link 지원
- [ ] invalid section query가 UI를 깨지 않음

## Plan (Review 대상)

1. active section query parser를 분리한다.
2. dirty draft guard를 추가한다.
3. section tab <-> URL <-> scroll sync를 정렬한다.

## Review Checklist (Plan Review)

- [x] dirty guard가 저장 완료 후 정상 해제되는가?
- [x] invalid query가 safe default로 돌아가는가?
- [x] scroll과 URL 변경이 루프를 만들지 않는가?

## Self Review (Spec/Plan)

- [x] settings UX의 두 문제를 같은 route-state task로 묶었다.
- [x] operator section 복귀 가능성이 실제 운영성에 중요하다.
- [x] guard는 connection draft에 한정해 과도한 경고를 피한다.

## Implementation Log

- [x] `settingsSectionModel`을 추가해 section query parse/normalize를 순수 함수로 분리했다.
- [x] `SettingsPage`가 `section` query를 source of truth로 사용하도록 바꿨다.
- [x] invalid section query는 `transcription`으로 normalize 하도록 연결했다.
- [x] dirty connection draft에 대해 `beforeunload`와 route leave blocker를 추가했다.
- [x] 같은 `/settings` 경로 안의 query-only 이동은 block하지 않도록 pathname 기준으로 제한했다.

## Review Checklist (Implementation Review)

- [x] browser unload와 route navigation 둘 다 커버하는가?
- [x] section query sync가 jitter 없이 동작하는가?
- [x] dirty draft 초기화/저장 후 가드가 해제되는가?

## Verify

- [x] `npm --prefix webapp run test -- settingsConnectionModel settingsSectionModel AppRouter`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `node scripts/check-todo-board-consistency.mjs`
