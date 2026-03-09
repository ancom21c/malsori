# T902 - Documentation Truth Recovery v2

## Spec

### 문제

- current execution plan/board reference가 완료된 루프를 계속 가리킨다.
- README와 implementation notes가 stale한 entry point를 노출한다.
- implementation backlog에 이미 끝난 항목이 남아 있다.

### 목표

- current execution / historical execution / canonical spec의 역할을 다시 분명히 한다.
- 새 루프가 repo entry point에서 일관되게 보이도록 정리한다.

### 범위

- 포함:
  - `docs/plan-ui-remediation-2026-03-06.md`
  - `docs/plan-review-followup-2026-03-07.md`
  - `docs/todo/2026-03-07-followup-remediation-loop/README.md`
  - `README.md`
  - `webapp/docs/IMPLEMENTATION_NOTES.md`
- 제외:
  - 오래된 archive 문서 전체 재작성

### 해결방안

- 새 2026-03-08 loop를 current execution으로 승격한다.
- 2026-03-07 follow-up loop는 historical로 내린다.
- implementation notes backlog는 실제 남은 follow-up만 남긴다.
- canonical spec 문서의 role table/current status line을 현재 truth에 맞춘다.

### 상세 설계

- 문서 header status line에 `current`/`historical` 역할을 직접 명시한다.
- README의 current references와 Documentation 섹션을 새 loop로 갱신한다.
- `IMPLEMENTATION_NOTES`의 Current References와 backlog를 이번 루프 범위 기준으로 갱신한다.
- 완료된 task loop는 historical label만 유지하고 current 문구를 제거한다.

### 수용 기준 (AC)

- [ ] repo entry docs가 모두 동일한 current execution plan/board를 가리킨다.
- [ ] 완료된 loop 문서는 historical로 표시된다.
- [ ] implementation backlog에 이미 끝난 항목이 남아 있지 않다.
- [ ] todo board consistency gate가 통과한다.

## Plan (Review 대상)

1. 새 loop를 current로 올리고 이전 follow-up loop를 historical로 내린다.
2. canonical/status tables와 README entry points를 함께 갱신한다.
3. implementation notes backlog를 실제 남은 작업 기준으로 정리한다.

## Review Checklist (Plan Review)

- [x] current/canonical/historical 세 역할이 서로 중복되지 않는가?
- [x] 새 current plan/board 링크가 README와 webapp notes에 모두 반영되는가?
- [x] archive 문서를 불필요하게 많이 건드리지 않는가?

## Self Review (Spec/Plan)

- [x] 문서 truth drift 재발을 막으려면 entry point와 status line을 동시에 고쳐야 한다.
- [x] 범위를 현재 truth를 드러내는 문서로 제한해 과도한 rewrite를 피했다.
- [x] task acceptance가 checkable하다.

## Implementation Log

- [x] 새 2026-03-08 loop가 current execution plan/board로 유지되도록 canonical/entry docs를 정렬했다.
- [x] 완료된 2026-03-07 follow-up loop를 historical로 유지하고, stale current 포인터를 새 loop로 갱신했다.
- [x] `README.md`와 `webapp/docs/IMPLEMENTATION_NOTES.md`의 current references를 새 loop 기준으로 유지했다.
- [x] `IMPLEMENTATION_NOTES` backlog에서 이미 끝난 T901/T902 항목을 제거하고 실제 open work만 남겼다.
- [x] current execution plan(`docs/plan-review-remediation-2026-03-08.md`)에서 완료된 T901/T902를 progress로 내리고, open work를 T903~T905로 좁혔다.

## Review Checklist (Implementation Review)

- [x] current execution 문구가 완료된 loop에 남아 있지 않은가?
- [x] README / implementation notes / canonical plan이 같은 링크를 가리키는가?
- [x] backlog가 실제 남은 follow-up만 반영하는가?

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `npm --prefix webapp run lint`
