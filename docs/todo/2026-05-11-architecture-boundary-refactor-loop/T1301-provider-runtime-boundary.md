# T1301 - Backend Provider Runtime Boundary

## Spec

### 문제

- `python_api/api_server/main.py` owns duplicated provider runtime policy for summary and translate: binding readiness, auth headers, model/timeout/retry/chat-path resolution, and provider HTTP request retry/error mapping.
- This violates SRP and makes future provider-backed QA/TTS features likely to copy another private helper block.

### 목표

- Extract shared provider runtime policy into a focused module while preserving summary/translate behavior.
- Add characterization tests that prove auth, readiness, retry, and invalid-response behavior without a live provider.

### 범위

- 포함:
  - New backend provider runtime helper module.
  - `main.py` summary/translate helper wrappers delegated to the new module.
  - Focused backend tests for the new module.
  - Architecture docs/PRD/task updates.
- 제외:
  - FastAPI router splitting.
  - Frontend domain/page refactors.
  - Provider API behavior changes.

### 해결방안

- Use Extract Module plus Introduce Parameter Object for feature-specific provider runtime settings.
- Keep existing private helper names in `main.py` where tests or route logic depend on them.
- Convert shared helper failures back into existing FastAPI error responses at the route boundary.

### 상세 설계

- Add `api_server.provider_runtime` with:
  - `ProviderRuntimeSpec`
  - `ProviderRuntimeError`
  - profile readiness helpers
  - auth/model/timeout/retry/chat-path helpers
  - async chat provider request helper with injectable client factory for tests
- `main.py` keeps `_request_summary_provider_payload` and `_request_translate_provider_payload` wrappers so existing monkeypatch tests remain stable.

### 수용 기준 (AC)

- [x] Summary and translate execution tests still pass.
- [x] New provider runtime tests cover at least auth header construction, missing credential readiness, retry-after-transient response, and non-JSON response mapping.
- [x] `main.py` no longer contains separate summary/translate implementations for provider auth/model/timeout/retry/chat-path/request execution.
- [x] Docs board and task status reflect implementation and verification evidence.

## Plan (Review 대상)

1. Add provider runtime module and focused tests.
2. Replace summary/translate duplicated helpers with wrappers around shared helpers.
3. Run focused tests, backend tests, compileall, todo board consistency, and diff check.
4. Update PRD/task docs and architecture knowledge.

## Review Checklist (Plan Review)

- [x] Scope and rollback are explicit.
- [x] Risks are understood.
- [x] Verification commands are realistic.

## Self Review (Spec/Plan)

- [x] The task addresses a real repo or product need.
- [x] The approach is narrow enough to verify.
- [x] The AC matches the intended outcome.

## Implementation Log

- [x] Add shared provider runtime module and tests.
- [x] Delegate duplicated summary/translate helpers from `main.py`.
- [x] Update durable architecture note.

## Review Checklist (Implementation Review)

- [x] No obvious regression risk remains.
- [x] Spec and implementation still match.
- [x] Docs and tests were updated where needed.

## Verify

- [x] `PYTHONPATH=python_api pytest python_api/tests/test_provider_runtime.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_full_summary_execution.py python_api/tests/test_translate_final_turn_execution.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `python -m compileall python_api/api_server`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
