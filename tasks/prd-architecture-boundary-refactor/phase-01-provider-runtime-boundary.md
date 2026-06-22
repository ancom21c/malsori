# Phase 1: Provider Runtime Boundary

## Objective
Extract shared summary/translate provider runtime policy from `python_api/api_server/main.py` into a focused backend module with characterization tests.

## Phase Discovery Gate
- [x] Re-check `python_api/api_server/main.py` provider readiness, summary, and translate helper sections.
- [x] Re-check `python_api/tests/test_full_summary_execution.py` and `python_api/tests/test_translate_final_turn_execution.py` monkeypatch expectations.
- [x] Re-check operator feature activation contract for provider readiness/fallback rules.

## Implementation Checklist
- [x] Add a shared provider runtime module for profile readiness, auth headers, model/timeout/retry/chat path, and provider HTTP request execution.
- [x] Keep route-level wrappers in `api_server.main` for existing private helper imports and monkeypatch paths.
- [x] Replace summary/translate duplicated helper bodies with calls into the shared module.
- [x] Preserve feature-specific error code prefixes and messages.
- [x] Add focused tests for auth headers, readiness, retry/backoff behavior, and non-JSON provider responses.

## Validation Checklist
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_provider_runtime.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_full_summary_execution.py python_api/tests/test_translate_final_turn_execution.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `python -m compileall python_api/api_server`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`

## Exit Criteria
- [x] Shared provider runtime logic is tested without a live provider.
- [x] Summary and translate execution tests remain green.
- [x] `main.py` no longer owns duplicate provider runtime implementation details.

## Phase-End Review
- [x] Dependency boundary improved without broad framework churn.
- [x] No observable summary/translate behavior changed.
- [x] Future phases remain valid or have been revised.
