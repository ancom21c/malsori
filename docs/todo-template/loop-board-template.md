# {{Loop Name}} Board ({{YYYY-MM-DD}})

> Status: current execution board. Execution plan: `{{plan-doc}}`. Latest completed execution board is `{{latest-completed-board}}`.

## 목적

{{이 loop의 목적}}

상위 설계 문서:

- `{{plan-doc}}`
- `{{supporting-doc-1}}`
- `{{supporting-doc-2}}`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, boundary, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: spec drift, regression, ops risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| {{Txxxx}} | P0 | {{task title}} | Pending | Pending | Pending | Pending | Pending | `docs/todo/{{loop-folder}}/{{Txxxx}}-{{slug}}.md` |

## 현재 상태 스냅샷

- 이미 landed:
  - {{foundation}}
- 현재 blocker:
  - {{blocker}}

## 추천 실행 순서

1. `{{Txxxx}}`
2. `{{Tyyyy}}`
3. `{{Tzzzz}}`

## 의존성 메모

- `{{Tyyyy}}`는 `{{Txxxx}}` 이후에 연다.

## 이번 루프 우선순위

- Now: `{{Txxxx}}`
- Next: `{{Tyyyy}}`
- Later: `{{Tzzzz}}`
