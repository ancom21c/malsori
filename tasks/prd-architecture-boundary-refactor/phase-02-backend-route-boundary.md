# Phase 2: Backend Route Boundary

## Objective
Reduce `python_api/api_server/main.py` route/use-case coupling after Phase 1 by extracting backend route or use-case modules only where they lower real change risk.

## Phase Discovery Gate
- [x] Re-check `main.py` sections for summary/translate binding resolution and request-time fallback.
- [x] Re-check backend tests for private helper imports.
- [x] Decide whether to extract routers first or pure use-case helpers first.

## Implementation Checklist
- [x] Split one coherent backend surface at a time.
- [x] Keep FastAPI-specific exception mapping at route boundaries.
- [x] Extract summary/translate feature binding target resolution into a framework-free helper module.
- [x] Keep `api_server.main` compatibility wrappers for existing tests and route code.
- [ ] Preserve `/v1/backend/*`, `/v1/transcribe*`, and `/v1/streaming` contracts.
- [x] Add characterization tests before moving any fragile STT or websocket behavior.

## Validation Checklist
- [x] Focused backend tests for the moved surface.
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_feature_binding_runtime.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_full_summary_execution.py python_api/tests/test_translate_final_turn_execution.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `python -m compileall python_api/api_server`

## Exit Criteria
- [x] `main.py` has fewer responsibilities without introducing speculative interfaces.
- [x] Moved behavior is covered by tests at the same or stronger level.
