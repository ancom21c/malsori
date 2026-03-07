# Review Remediation Loop Board (2026-03-07)

> Status: historical execution board. This loop is complete. Current execution board lives in `docs/todo/2026-03-07-followup-remediation-loop/README.md`.

## 목적

2026-03-07 review findings를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 정리한다.

상위 설계 문서: `docs/plan-review-remediation-2026-03-07.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, 리스크, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: regression/spec drift/UX risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T701 | P0 | Bundle / CI gate recovery | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T701-bundle-ci-gate-recovery.md` |
| T702 | P1 | Local dev API contract alignment | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T702-local-dev-api-contract-alignment.md` |
| T703 | P1 | Settings manual intent hardening | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T703-settings-manual-intent-hardening.md` |
| T704 | P1 | List empty-state copy alignment | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T704-list-empty-state-copy-alignment.md` |
| T705 | P2 | Documentation hierarchy cleanup | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T705-documentation-hierarchy-cleanup.md` |
| T706 | P2 | List filter URL state | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T706-list-filter-url-state.md` |
| T707 | P2 | List rendering scalability | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-review-remediation-loop/T707-list-rendering-scalability.md` |

## 이번 루프 우선순위

- P0: `T701`
- P1: `T702` ~ `T704`
- P2: `T705` ~ `T707`
