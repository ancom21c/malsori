# Architecture Boundary Refactor Context

## Reviewed Inputs
- `AGENTS.md`
- `webapp/AGENTS.md`
- `docs/todo-workflow.md`
- `docs/knowledge/architecture.md`
- `docs/knowledge/operator-feature-activation-contract.md`
- `python_api/api_server/main.py`
- `python_api/api_server/models.py`
- `python_api/api_server/backend_bindings_store.py`
- `python_api/tests/test_full_summary_execution.py`
- `python_api/tests/test_translate_final_turn_execution.py`
- `python_api/tests/test_backend_admin.py`
- `webapp/src/domain/session.ts`
- `webapp/src/domain/backendProfile.ts`
- `webapp/src/domain/sttBackendCompatibility.ts`
- `webapp/src/components/summary/summarySurfaceModel.ts`

## Clean Architecture Review Report

### Summary
- Overall Assessment: Needs Improvement
- The repo has useful domain/service/page separation in the webapp and a clear proxy boundary in docs, but backend route orchestration is over-centralized and several frontend domain seams depend on outer data/page types.

### Dependency Rule Analysis
- Backend violation: `python_api/api_server/main.py` combines framework routes, application use cases, provider HTTP adapters, storage path decisions, STT polling, gRPC streaming, and provider response normalization in one module.
- Backend duplication smell: summary and translate duplicate binding target resolution, auth header construction, model/timeout/retry/chat path resolution, and HTTP request retry/error mapping.
- Frontend violation: `webapp/src/domain/session.ts` imports `LocalSegment` and `LocalTranscription` from the Dexie persistence module.
- Frontend violation: `webapp/src/domain/sttBackendCompatibility.ts` imports `BackendEndpointPreset` from Dexie persistence types.
- Frontend adapter inversion: `webapp/src/components/summary/summarySurfaceModel.ts` imports `ArtifactBindingPresentation` from `pages/artifactBindingModel`, which points a reusable component model toward a page adapter.

### Layer Structure Review
- Entities: Needs Improvement. Domain types exist, but some are tied to persistence records instead of owning stable domain DTOs.
- Use Cases: Needs Improvement. Backend use cases are mostly private functions inside a FastAPI route module; frontend page files still own substantial workflow orchestration.
- Interface Adapters: Needs Improvement. FastAPI, HTTP provider calls, and storage helpers are not consistently isolated.
- Infrastructure: Needs Improvement. File storage and upstream provider details leak into high-level route/use-case helpers.

### Refactoring Findings
- Long Module: `python_api/api_server/main.py` is 3,446 lines and has multiple reasons to change.
- Duplicated Code: provider runtime helper blocks are near-identical for summary and translate.
- Long Components/Controllers: `SettingsPage.tsx`, `RealtimeSessionPage.tsx`, and `TranscriptionDetailPage.tsx` are each over 2,800 lines and mix UI layout with workflow orchestration.
- Data Clumps: provider runtime values travel together repeatedly: feature key, required capabilities, model, timeout, retry policy, chat path, auth strategy, and error code prefix.

## Current Validation Surface
- Backend syntax: `python -m compileall python_api/api_server`
- Backend tests: `PYTHONPATH=python_api pytest python_api/tests -q`
- Docs gate: `node scripts/check-todo-board-consistency.mjs`
- Frontend gates when webapp files change: lint, i18n check, build, bundle check, tests.

## Design Implications
- Phase 1 should use "extract module" and "introduce parameter object" around provider runtime policy.
- Keep `api_server.main` compatibility wrappers during Phase 1 to avoid broad route/test churn.
- Avoid creating repository interfaces solely for one file-backed implementation; focus first on reducing concrete duplication and framework coupling.
- Later frontend phases should introduce stable DTO boundaries before decomposing large pages.
