# Malsori UI Remediation Loop Board (2026-03-06)

## 목적

현재 Studio Console branch에서 식별된 `P0~P2` 결함을 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 재정리하고, 웹 디자인 수정 방향까지 같은 보드에서 통제한다.

상위 설계 문서: `docs/plan-ui-remediation-2026-03-06.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 구현 접근, 리스크, 롤백 전략, 디자인 원칙을 셀프 리뷰한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: 기능 회귀/접근성/문서 정합성을 점검한다.
5. `Verify`: lint/build/test/smoke 및 문서 게이트 결과를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T501 | P0 | Studio UI release gate 복구 (`lint/build/i18n/temp artifact`) | Done | Done | Done | Done | Done | `docs/todo/2026-03-06-ui-remediation-loop/T501-release-gate-recovery.md` |
| T502 | P0 | Realtime 세션 정확성 복구 (route/fallback/audio meter) | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-06-ui-remediation-loop/T502-realtime-correctness-recovery.md` |
| T503 | P1 | 모바일 action ownership/IA 정렬 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-06-ui-remediation-loop/T503-mobile-action-ownership.md` |
| T504 | P1 | 접근성/모션/다크모드 브라우저 정합성 보강 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-06-ui-remediation-loop/T504-a11y-motion-darkmode-guardrails.md` |
| T505 | P1 | Studio Console 스펙/문서 canonical 재정의 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-06-ui-remediation-loop/T505-studio-console-spec-realignment.md` |
| T506 | P2 | Dark Studio Console visual refinement v4 설계/적용 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-06-ui-remediation-loop/T506-visual-refinement-v4.md` |

## 이번 사이클 우선순위

- P0(T501/T502): 출하 게이트와 realtime correctness를 먼저 복구한다.
- P1(T503/T504/T505): 모바일 IA, 접근성/모션, canonical 문서화를 정렬한다.
- P2(T506): 디자인 완성도를 task clarity 우선 원칙으로 다듬는다.
