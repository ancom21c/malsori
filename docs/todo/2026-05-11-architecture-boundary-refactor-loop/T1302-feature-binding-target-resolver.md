# T1302 - Backend Feature Binding Target Resolver

## Spec

### 문제

- `python_api/api_server/main.py` still owns duplicated summary/translate binding target resolution after provider runtime extraction.
- The duplicated blocks mix feature policy, storage access, provider readiness, fallback selection, and FastAPI error mapping.

### 목표

- Extract feature binding target resolution into a framework-free helper module.
- Keep summary/translate public behavior and existing private wrapper imports stable.
- Add characterization tests for primary, fallback, missing binding, missing profile, capability mismatch, and runtime misconfiguration outcomes.

### 범위

- 포함:
  - New backend helper for resolving a feature binding to a ready backend profile.
  - `main.py` wrappers for `_resolve_summary_binding_target`, `_resolve_translate_binding_target`, and `_get_ready_fallback_profile`.
  - Focused backend tests for the helper.
  - PRD/task doc status updates.
- 제외:
  - FastAPI router file split.
  - STT transcribe queue or websocket streaming changes.
  - Frontend changes.

### 해결방안

- Use Introduce Parameter Object for feature-specific binding resolution strings and required capabilities.
- Use callable lookup ports for feature bindings and backend profiles so the helper does not depend on the file-backed store or FastAPI.
- Convert helper errors back into existing HTTPException envelopes only inside `main.py`.

### 상세 설계

- Add `api_server.feature_binding_runtime` with:
  - `FeatureBindingTargetSpec`
  - `FeatureBindingTargetError`
  - `ResolvedFeatureBindingTarget`
  - `resolve_feature_binding_target`
  - `get_ready_fallback_profile`
- Keep existing `main.py` helper names so existing route code and tests do not need broad churn.

### 수용 기준 (AC)

- [x] Summary and translate binding target wrappers still return `(binding, profile, used_fallback)`.
- [x] New helper tests cover primary ready, fallback ready, missing binding, missing primary profile, capability mismatch, and provider runtime misconfiguration.
- [x] Existing summary/translate execution tests still pass.
- [x] `main.py` no longer contains duplicate binding target resolution implementations.

## Plan (Review 대상)

1. Add feature binding runtime helper and tests.
2. Delegate `main.py` summary/translate binding wrappers to the helper.
3. Run focused tests, summary/translate tests, full backend tests, compileall, board consistency, and diff check.
4. Update PRD phase/task docs with verification evidence.

## Review Checklist (Plan Review)

- [x] Scope and rollback are explicit.
- [x] Risks are understood.
- [x] Verification commands are realistic.

## Self Review (Spec/Plan)

- [x] The task addresses a real repo or product need.
- [x] The approach is narrow enough to verify.
- [x] The AC matches the intended outcome.

## Implementation Log

- [x] Add shared feature binding target resolver module and tests.
- [x] Delegate duplicated summary/translate binding target wrappers from `main.py`.
- [x] Update PRD phase status and durable architecture notes if needed.

## Review Checklist (Implementation Review)

- [x] No obvious regression risk remains.
- [x] Spec and implementation still match.
- [x] Docs and tests were updated where needed.

## Verify

- [x] `PYTHONPATH=python_api pytest python_api/tests/test_feature_binding_runtime.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests/test_full_summary_execution.py python_api/tests/test_translate_final_turn_execution.py -q`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `python -m compileall python_api/api_server`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
