# Malsori Admin Boundary + Reconnect Resilience Loop Board (2026-03-06)

> Status: historical execution board. This loop is complete. Current execution board lives in `docs/todo/2026-03-07-followup-remediation-loop/README.md`.

## 목적

public/internal 운영 경계, realtime reconnect 복원력, operator UX, Studio Console 경계 표현을 다음 루프에서 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 방식으로 통제한다.

상위 설계 문서: `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, 리스크, 롤백, safe default를 셀프 리뷰한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: 기능 회귀/운영 경계/UX 정합성을 점검한다.
5. `Verify`: lint/build/test/smoke와 문서 게이트를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T601 | P0 | Public/Internal API boundary split + default base 정리 | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T601-public-internal-api-boundary.md` |
| T602 | P0 | Realtime reconnect resilience + degraded signaling | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T602-realtime-reconnect-resilience.md` |
| T603 | P1 | Operator settings safe default / manual intent / boundary UX | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T603-operator-settings-hardening.md` |
| T604 | P1 | Realtime media capture source-of-truth hardening | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T604-realtime-media-capture-hardening.md` |
| T605 | P1 | Status normalization and failure surfacing hardening | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T605-status-normalization-hardening.md` |
| T606 | P2 | Studio Console boundary/copy/header polish | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-admin-boundary-reconnect-loop/T606-studio-console-boundary-polish.md` |

## 이번 사이클 우선순위

- P0(T601/T602): 운영 경계와 realtime transport correctness를 먼저 복구한다.
- P1(T603/T604/T605): operator UX, capture pipeline, status surfacing을 정리한다.
- P2(T606): boundary 표현과 카피/글로벌 chrome를 다듬는다.
