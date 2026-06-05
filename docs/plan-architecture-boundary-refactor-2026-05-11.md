# Architecture Boundary Refactor Plan (2026-05-11)

> Status: current execution plan for architecture boundary refactoring. Latest completed execution plan is `docs/plan-summary-backend-2026-03-11.md` and its board `docs/todo/2026-03-11-summary-backend-loop/README.md`.

## Goal

1. Identify the highest-risk design defects using Clean Architecture and refactoring-pattern review.
2. Reduce concrete duplication and boundary coupling without changing shipped STT, summary, translate, or operator behavior.
3. Establish a tested path for later backend/frontend decomposition.

## Progress

- 완료: architecture PRD and phase plan 등록 (`tasks/prd-architecture-boundary-refactor.md`).
- 완료: `T1301` provider runtime boundary extraction and backend verification.
- 완료: `T1302` feature binding target resolver extraction and backend verification.
- 현재 open work:
  - Phase 2 follow-up scoping: broader backend routers or another pure use-case module.

## Inputs

1. `tasks/prd-architecture-boundary-refactor.md`
2. `tasks/prd-architecture-boundary-refactor/context.md`
3. `docs/knowledge/architecture.md`
4. `docs/knowledge/operator-feature-activation-contract.md`
5. `python_api/api_server/main.py`
6. `webapp/src/domain/session.ts`

## Canonical Decisions

### 1. Refactor By Compatibility Boundary

- Preserve observable summary/translate behavior first.
- Keep route-level compatibility wrappers while moving duplicated provider runtime logic into a focused module.
- Do not add generic repository/interface scaffolding unless it removes concrete coupling in the current code.

### 2. Apply Clean Architecture Pragmatically

- Dependency direction matters most where feature growth is active: provider-backed summary/translate, future QA/TTS, and frontend domain/persistence boundaries.
- Later webapp refactors should introduce DTO seams before decomposing large UI pages.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T1301 | P0 | Provider runtime boundary | Done: shared, tested summary/translate provider runtime helpers with behavior preserved. |
| T1302 | P0 | Backend feature binding target resolver | Done: duplicated summary/translate binding target selection extracted into a tested helper. |
| T1303 | P1 | Backend route boundary | Planned follow-up to split route/use-case responsibilities after resolver extraction. |
| T1304 | P1 | Frontend domain boundary | Planned follow-up to remove domain imports from persistence/page layers. |
| T1305 | P2 | Page orchestration | Planned follow-up to decompose oversized pages after DTO seams exist. |

## Definition of Done

- `T1301` acceptance criteria are met and checked.
- Backend focused tests and full backend test suite pass.
- Todo board consistency and diff whitespace checks pass.
- Durable architecture conclusion is promoted to `docs/knowledge/architecture.md`.

## Self Review

- [x] scope가 구현 단위로 충분히 분해돼 있는가?
- [x] rollback / safe default / boundary가 명시돼 있는가?
- [x] active vs historical 문서 포인터가 맞는가?
