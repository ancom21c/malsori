# Architecture Boundary Refactor Loop Board (2026-05-11)

> Status: current execution board for architecture boundary refactoring. Execution plan: `docs/plan-architecture-boundary-refactor-2026-05-11.md`.

## 목적

Clean Architecture와 refactoring-patterns review 결과를 PRD로 고정하고, 가장 작은 안전 단위부터 설계 결함을 줄인다.

상위 설계 문서:

- `tasks/prd-architecture-boundary-refactor.md`
- `docs/plan-architecture-boundary-refactor-2026-05-11.md`
- `docs/knowledge/architecture.md`
- `docs/knowledge/operator-feature-activation-contract.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, boundary, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: spec drift, regression, UX/ops risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T1301 | P0 | Backend provider runtime boundary | Done | Done | Done | Done | Done | `docs/todo/2026-05-11-architecture-boundary-refactor-loop/T1301-provider-runtime-boundary.md` |
| T1302 | P0 | Backend feature binding target resolver | Done | Done | Done | Done | Done | `docs/todo/2026-05-11-architecture-boundary-refactor-loop/T1302-feature-binding-target-resolver.md` |

## 현재 상태 스냅샷

- 발견됨:
  - `python_api/api_server/main.py` is a long module with framework, use-case, provider adapter, STT polling, storage, and websocket responsibilities.
  - summary/translate provider runtime policy is duplicated.
  - some frontend domain modules import persistence/page-layer types.
- 현재 작업:
  - `T1301` is complete with provider runtime extraction and backend verification evidence.
  - `T1302` is complete with feature binding target resolver extraction and backend verification evidence.

## 추천 실행 순서

1. `T1301`
2. `T1302`

## 의존성 메모

- Later backend route extraction should wait until provider runtime behavior is characterized by tests.
- Frontend domain/page work should not start in this loop unless the PRD phase is explicitly advanced.

## 이번 루프 우선순위

- Now: no open implementation task in this loop.
- Next: reassess whether broader Phase 2 should continue with backend routers or another pure use-case module.
