# PRD: Architecture Boundary Refactor

## Document Status
- Status: In Progress
- File Mode: Split
- Current Phase: Phase 1 (Complete)
- Active Phase File: [Phase 1](./prd-architecture-boundary-refactor/phase-01-provider-runtime-boundary.md)
- Context File: [context.md](./prd-architecture-boundary-refactor/context.md)
- Last Updated: 2026-05-11
- PRD File: `tasks/prd-architecture-boundary-refactor.md`
- Purpose: Living PRD for reducing architectural coupling and duplication without changing shipped STT, summary, translate, or operator behavior.

## Problem
Malsori has accumulated feature growth around STT, summary, translate, and operator controls faster than the backend/frontend boundaries have been consolidated. The most visible risks are large orchestration files, duplicated provider runtime policy, and frontend domain modules that depend on persistence or page-layer types. These flaws raise the cost of adding QA/TTS and increase regression risk in core transcription flows.

## Goals
- G-1: Preserve current observable behavior while moving repeated policy and adapter code behind narrower boundaries.
- G-2: Make summary/translate provider runtime rules testable outside FastAPI route handlers.
- G-3: Record the current design defects and phase an incremental remediation path.
- G-4: Keep core file transcription, realtime capture, detail playback, and operator backend controls stable.

## Non-Goals
- NG-1: Do not redesign product UX, route structure, or backend operator contracts in this refactor.
- NG-2: Do not replace the file-backed backend binding store or IndexedDB schema as part of Phase 1.
- NG-3: Do not introduce broad Clean Architecture scaffolding for layers that do not yet have a real second implementation.

## Success Criteria
- SC-1: Provider-backed summary and translate keep their existing response, fallback, auth, timeout, and retry behavior.
- SC-2: Shared provider runtime logic is covered by focused tests that do not require a live upstream provider.
- SC-3: The architecture review findings and remediation plan are committed as durable repo docs.
- SC-4: Repo verification passes for backend tests and doc board consistency.

## Key Scenarios
### Scenario 1: Provider Runtime Failure
- Actor: Operator-configured summary or translate backend.
- Trigger: Primary provider times out, returns a retryable error, or is misconfigured.
- Expected outcome: Existing error codes and fallback behavior remain stable while shared runtime helpers handle the duplicated policy.

### Scenario 2: Future Additive Provider
- Actor: Developer adding QA or TTS provider-backed execution.
- Trigger: New feature needs model, auth, timeout, retry, chat path, and fallback rules.
- Expected outcome: Developer extends a shared provider runtime boundary instead of copying summary/translate helper blocks.

## Discovery Summary
- Reviewed: [context.md](./prd-architecture-boundary-refactor/context.md)
- Current system: `python_api/api_server/main.py` owns FastAPI routes, binding policy, provider HTTP calls, STT polling, gRPC streaming, storage, and response normalization. `webapp/src/domain/*` mostly holds domain logic but some domain modules import persistence DTOs or adapter/page types.
- Validation surface: Python tests under `python_api/tests`, frontend Vitest tests, lint/build/i18n/bundle gates, `node scripts/check-todo-board-consistency.mjs`, and `git diff --check`.
- Design implications: First refactor should extract duplicated provider runtime policy because it has narrow behavior, existing tests, and clear summary/translate duplication.
- Confidence / gaps: Confidence is high for Phase 1. Later frontend page decomposition needs separate UI-focused discovery before editing.

## Requirements
### Functional Requirements
- FR-1: Shared provider runtime helpers must support `artifact.summary` and `translate.turn_final` without changing their public API behavior.
- FR-2: Auth header resolution must preserve `none`, `bearer_secret_ref`, and `header_token` semantics.
- FR-3: Provider readiness must continue rejecting unsupported transports, auth strategies, and credential kinds before runtime use.
- FR-4: Retry/backoff behavior must remain binding-driven and deterministic in tests.
- FR-5: Fallback selection must continue preferring a ready fallback when the primary is unhealthy or fails with eligible provider errors.

### Non-Functional Requirements
- NFR-1: Refactors must be small, reversible, and characterization-tested.
- NFR-2: Route handlers should keep framework-specific HTTP exception mapping at the boundary.
- NFR-3: Domain/policy helpers should avoid direct dependency on route handlers or UI components.
- NFR-4: Documentation and todo board state must stay consistent with repo workflow checks.

## Assumptions
- A-1: The current summary/translate behavior is the compatibility contract until a feature spec explicitly changes it.
- A-2: Clean Architecture is applied pragmatically: extract boundaries where they reduce concrete duplication or coupling, not as blanket folder churn.
- A-3: Phase 1 can be completed without touching webapp behavior.

## Dependencies / Constraints
- Existing operator feature activation contract keeps summary/translate additive and internal backend controls operator-only.
- Backend tests currently import some private helpers from `api_server.main`; wrappers may remain during migration to avoid a breaking test/application churn spike.
- Network access is not required for focused provider runtime tests.

## Risks / Edge Cases
- Generic provider helpers can erase feature-specific error codes if not designed carefully.
- Moving helper functions may break tests or monkeypatch paths that intentionally patch `api_server.main`.
- Over-abstraction would make future QA/TTS harder if Phase 1 hides too many feature-specific decisions.

## Execution Rules
- Complete phases in order unless this PRD is revised.
- Keep route-level compatibility wrappers when external tests or app code depend on them.
- Preserve current error codes and user/operator-facing messages unless a phase explicitly changes them.
- End each phase with diff review, focused tests, and task doc status updates.

## Phase Index
| Phase | File | Objective | Status |
|---|---|---|---|
| 1 | [Provider Runtime Boundary](./prd-architecture-boundary-refactor/phase-01-provider-runtime-boundary.md) | Extract shared summary/translate provider runtime policy from `main.py`. | Complete |
| 2 | [Backend Route Boundary](./prd-architecture-boundary-refactor/phase-02-backend-route-boundary.md) | Split backend route adapters from STT/streaming orchestration where it reduces risk. | Not Started |
| 3 | [Frontend Domain Boundaries](./prd-architecture-boundary-refactor/phase-03-frontend-domain-boundaries.md) | Remove domain dependencies on persistence/page-layer types through DTO boundaries. | Not Started |
| 4 | [Page Orchestration Decomposition](./prd-architecture-boundary-refactor/phase-04-page-orchestration-decomposition.md) | Decompose oversized page controllers into tested models/hooks/components. | Not Started |

## Final Multi-Pass Review After All Phases
- [ ] Requirements coverage review: every FR/NFR is satisfied or explicitly deferred.
- [ ] Dependency rule review: inner domain/policy modules no longer import outer adapters where avoidable.
- [ ] Regression review: STT, realtime, summary, translate, settings, and operator flows remain stable.
- [ ] Simplicity review: no abstraction exists only for speculative future use.
- [ ] Validation review: tests match the risk of each changed boundary.
- [ ] Documentation review: durable conclusions are promoted to `docs/knowledge/`.

## Open Questions
- OQ-1: Should Phase 2 extract FastAPI routers by domain or first extract pure backend use-case modules while leaving route registration in `main.py`?
- OQ-2: Should frontend persistence DTO aliases move into `domain/session.ts` or should domain models become the canonical source and repositories map to storage records?

## Change Log
- 2026-05-11: Initial PRD created from Clean Architecture and refactoring discovery.
- 2026-05-11: Phase 1 completed; provider runtime policy extracted and backend tests passed.
