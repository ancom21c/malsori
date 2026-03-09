# Contract + UX Remediation Loop Board (2026-03-08)

> Status: execution loop complete. No newer remediation loop is registered yet.

## 목적

2026-03-08 review findings를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 정리한다.

상위 설계 문서: `docs/plan-review-remediation-2026-03-08.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, 리스크, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: regression/spec drift/UX risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T901 | P1 | Settings connection contract hardening | Done | Done | Done | Done | Done | `docs/todo/2026-03-08-contract-ux-loop/T901-settings-connection-contract-hardening.md` |
| T902 | P1 | Documentation truth recovery v2 | Done | Done | Done | Done | Done | `docs/todo/2026-03-08-contract-ux-loop/T902-documentation-truth-recovery-v2.md` |
| T903 | P2 | Realtime transcript accessibility decoupling | Done | Done | Done | Done | Done | `docs/todo/2026-03-08-contract-ux-loop/T903-realtime-transcript-accessibility-decoupling.md` |
| T904 | P2 | Settings operator boundary polish | Done | Done | Done | Done | Done | `docs/todo/2026-03-08-contract-ux-loop/T904-settings-operator-boundary-polish.md` |
| T905 | P2 | Mobile header chrome reduction | Done | Done | Done | Done | Done | `docs/todo/2026-03-08-contract-ux-loop/T905-mobile-header-chrome-reduction.md` |

## 이번 루프 우선순위

- 완료: `T901` ~ `T905`
