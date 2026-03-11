# Summary + Backend Settings Loop Board (2026-03-11)

> Status: current execution board. Current execution plan: `docs/plan-summary-backend-2026-03-11.md`. The latest completed execution board remains `docs/todo/2026-03-08-contract-ux-loop/README.md`.

## 목적

summary feature spec와 backend settings UI review findings를 구현 가능한 일감으로 분해해 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 관리한다.

상위 설계 문서:

- `docs/plan-summary-backend-2026-03-11.md`
- `docs/plan-summary-feature-2026-03-11.md`
- `docs/plan-feature-backend-binding-2026-03-10.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, 리스크, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: regression/spec drift/UX risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T1001 | P0 | Summary partition / artifact contract | Done | Done | Done | Done | Done | `docs/todo/2026-03-11-summary-backend-loop/T1001-summary-partition-artifact-contract.md` |
| T1002 | P1 | Summary preset library + auto-selection contract | Done | Done | Done | Done | Done | `docs/todo/2026-03-11-summary-backend-loop/T1002-summary-preset-selection-contract.md` |
| T1003 | P1 | Summary surface UX for realtime/detail | Done | Done | Done | Done | Done | `docs/todo/2026-03-11-summary-backend-loop/T1003-summary-surface-ux.md` |
| T1004 | P1 | Summary runtime freshness + regeneration lifecycle | Done | Done | Done | Done | Done | `docs/todo/2026-03-11-summary-backend-loop/T1004-summary-runtime-freshness-lifecycle.md` |
| T1005 | P1 | Backend live apply/reset safety | Done | Done | Done | Done | Done | `docs/todo/2026-03-11-summary-backend-loop/T1005-backend-live-apply-safety.md` |
| T1006 | P2 | Backend form semantics + credential affordance hardening | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-11-summary-backend-loop/T1006-backend-form-semantics-hardening.md` |
| T1007 | P1 | Backend binding operator inspector UX | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-11-summary-backend-loop/T1007-backend-binding-operator-inspector-ux.md` |

## 이번 루프 우선순위

- P0: `T1001`
- P1: `T1002`, `T1003`, `T1004`, `T1005`, `T1007`
- P2: `T1006`
