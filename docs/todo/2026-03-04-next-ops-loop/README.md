# Malsori Next Ops Loop Board (2026-03-04)

## 목적

완료된 P0~P2 이후 운영 신뢰성과 배포 품질을 한 단계 올리기 위해, 다음 사이클 작업을 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 관리한다.

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 구현 접근과 리스크, 롤백 방식을 확정한다.
3. `Implement`: 작은 단위로 반영하고 중간 검증을 남긴다.
4. `Implementation Review`: 회귀/운영/보안/UX 영향을 점검한다.
5. `Verify`: 자동 테스트/스모크/문서 정합성 결과를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T301 | P1 | 프론트 런타임 오류 관측성 강화 | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-next-ops-loop/T301-frontend-runtime-observability.md` |
| T302 | P1 | 배포 UI 스모크 자동화 (Playwright) | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-next-ops-loop/T302-post-deploy-ui-smoke-automation.md` |
| T303 | P2 | 서비스워커/캐시 정책 문서화 및 검증 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-04-next-ops-loop/T303-service-worker-cache-policy.md` |
| T304 | P2 | Studio Console 디자인 확장 적용 계획 | Done | Done | Pending | Pending | Pending | `docs/todo/2026-03-04-next-ops-loop/T304-studio-console-rollout.md` |

## 이번 사이클 우선순위

- P1(T301/T302): 장애 탐지와 배포 회귀 차단을 먼저 강화한다.
- P2(T303/T304): 캐시 안정성과 디자인 시스템 확장을 정리한다.
