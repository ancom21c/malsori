# Review Follow-up Remediation Loop Board (2026-03-07)

## 목적

2026-03-07 follow-up findings를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 정리한다.

상위 설계 문서: `docs/plan-review-followup-2026-03-07.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, 리스크, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: regression/spec drift/UX risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T801 | P0 | Documentation truth recovery | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-followup-remediation-loop/T801-documentation-truth-recovery.md` |
| T802 | P1 | Runtime error reporter hydration-safe init | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-followup-remediation-loop/T802-runtime-error-reporter-hydration-safe-init.md` |
| T803 | P1 | Realtime stop/finalize resilience | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-followup-remediation-loop/T803-realtime-stop-finalize-resilience.md` |
| T804 | P1 | Realtime accessibility recovery | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-followup-remediation-loop/T804-realtime-accessibility-recovery.md` |
| T805 | P1 | Settings guardrails | Done | Done | Done | Done | Done | `docs/todo/2026-03-07-followup-remediation-loop/T805-settings-guardrails.md` |
| T806 | P1 | List navigation/accessibility hardening | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-07-followup-remediation-loop/T806-list-navigation-accessibility-hardening.md` |
| T807 | P1 | Detail ergonomics recovery | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-07-followup-remediation-loop/T807-detail-ergonomics-recovery.md` |
| T808 | P2 | Large-list scalability v2 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-07-followup-remediation-loop/T808-large-list-scalability-v2.md` |

## 이번 루프 우선순위

- P0: `T801`
- P1: `T802` ~ `T807`
- P2: `T808`
