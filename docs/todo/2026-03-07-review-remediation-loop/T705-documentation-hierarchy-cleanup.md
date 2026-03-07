# T705 - Documentation Hierarchy Cleanup

## Spec

### 문제

- canonical/current/archive 문서 역할이 다시 섞였다.
- 완료된 loop plan이 여전히 다음 구현 target spec처럼 읽힌다.

### 목표

- current truth와 historical evidence를 문서 수준에서 즉시 구분 가능하게 만든다.

### 범위

- 포함:
  - plan 문서 role 문구 정리
  - completed loop 문서 archive 표기
  - perf docs role 표기 정리
- 제외:
  - task 문서 본문 전면 재작성

### 해결방안

- current canonical doc를 하나로 고정한다.
- completed loop 상위 문서에는 archive/historical label을 붙인다.
- perf notes는 `historical measurement`인지 `current constraint`인지 명시한다.

### 상세 설계

- `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md`는 title/subtitle에 archive role을 명시한다.
- `docs/plan-ui-remediation-2026-03-06.md`와 충돌하는 현재성 표현을 제거한다.
- 필요한 경우 docs index에 role map을 추가한다.

### 수용 기준 (AC)

- [ ] current canonical spec가 하나로 식별 가능
- [ ] completed loop plan이 future target spec처럼 읽히지 않음
- [ ] perf/doc evidence 문서의 role이 분명함

## Plan (Review 대상)

1. 현재 문서 role 충돌 지점을 정리한다.
2. archive/current 표기를 최소 수정으로 반영한다.
3. 관련 board/plan cross-link를 재점검한다.

## Review Checklist (Plan Review)

- [x] 문서량을 늘리지 않고 역할만 명확히 하는가?
- [x] historical evidence를 삭제하지 않고 보존하는가?
- [x] 이후 review 시 truth source를 빨리 찾을 수 있는가?

## Self Review (Spec/Plan)

- [x] spec ambiguity 질문에 직접 대응하는 task다.
- [x] 코드 변경 없이도 review 비용을 줄일 수 있다.
- [x] archive/current 혼선을 줄이는 방향이다.

## Implementation Log

- [x] `docs/plan-ui-remediation-2026-03-06.md`에 current canonical / current execution / historical loop 역할표를 다시 정리했다.
- [x] `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md`를 historical loop plan으로 명시하고 future-target tone을 걷어냈다.
- [x] 완료된 2026-03-06 board 두 개에 `historical execution board` status를 추가했다.
- [x] `docs/plan-review-remediation-2026-03-07.md`는 current execution plan으로 위치를 분명히 하고, T703 URL affordance 설명도 현재 구현 기준으로 고쳤다.

## Review Checklist (Implementation Review)

- [x] 구현 후 spec drift가 없는지 확인
- [x] regression risk를 점검
- [x] verify 명령과 문서 역할이 일치하는지 확인

### Self Review (Implementation)

- canonical 문서를 새로 만들지 않고 헤더와 역할표만 고쳐 source-of-truth를 바로 찾게 만들었다.
- completed loop 문서와 board를 삭제하지 않고 historical로 내려 evidence 보존 요구를 만족했다.
- `plan-review-remediation`까지 함께 만져 현재 execution plan과 canonical baseline의 경계를 문서 헤더만 읽어도 이해할 수 있게 했다.

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] role keyword re-scan (`current canonical`, `current execution`, `historical`) on touched docs
