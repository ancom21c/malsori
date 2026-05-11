# Phase 2: Backend Route Boundary

## Objective
Reduce `python_api/api_server/main.py` route/use-case coupling after Phase 1 by extracting backend route or use-case modules only where they lower real change risk.

## Phase Discovery Gate
- [ ] Re-check `main.py` sections for health/admin, transcribe queue, file artifact storage, and websocket streaming.
- [ ] Re-check backend tests for private helper imports.
- [ ] Decide whether to extract routers first or pure use-case helpers first.

## Implementation Checklist
- [ ] Split one coherent backend surface at a time.
- [ ] Keep FastAPI-specific exception mapping at route boundaries.
- [ ] Preserve `/v1/backend/*`, `/v1/transcribe*`, and `/v1/streaming` contracts.
- [ ] Add characterization tests before moving any fragile STT or websocket behavior.

## Validation Checklist
- [ ] Focused backend tests for the moved surface.
- [ ] `PYTHONPATH=python_api pytest python_api/tests -q`
- [ ] `python -m compileall python_api/api_server`

## Exit Criteria
- [ ] `main.py` has fewer responsibilities without introducing speculative interfaces.
- [ ] Moved behavior is covered by tests at the same or stronger level.
