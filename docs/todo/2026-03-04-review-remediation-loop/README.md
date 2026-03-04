# Malsori Review Remediation Loop Board (2026-03-04)

## 목적

코드베이스 리뷰에서 식별된 `P0~P2` 이슈를 정책 정렬(내부망 전제), 스펙-구현 정합성, 오류 내성, UX/디자인 개선 관점으로 재정리해 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 관리한다.

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/수용기준(AC)을 명시한다.
2. `Plan Review`: 구현 접근, 리스크, 롤백 전략을 확정한다.
3. `Implement`: 작은 단위로 반영하고 중간 검증을 남긴다.
4. `Implementation Review`: 회귀/보안/UX 영향을 점검한다.
5. `Verify`: 테스트/스모크/문서 정합성 결과를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T401 | P0 | 권장안 확정: public/internal ingress 분리 (`/v1/backend/*`, `/v1/observability/runtime-error` internal) | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T401-internal-ingress-segmentation.md` |
| T402 | P1 | Settings/Detail 신규 카피 i18n 정합성 복구 | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T402-settings-detail-i18n-hardening.md` |
| T403 | P1 | Settings 저장값 이상치 방어 (`realtimeAutoSaveSeconds`) | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T403-settings-hydration-guardrails.md` |
| T404 | P1 | UI 스모크 S3(detail route) 커버리지 확장 | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T404-ui-smoke-detail-route-coverage.md` |
| T405 | P2 | Studio Console 스펙/증적 문서 범위 모호성 해소 | Done | Pending | Pending | Pending | Pending | `docs/todo/2026-03-04-review-remediation-loop/T405-studio-console-spec-doc-alignment.md` |
| T406 | P2 | Backend endpoint URL 입력/저장 검증 강화 | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T406-backend-endpoint-url-validation.md` |
| T407 | P2 | 모바일 배경 렌더링 비용 최적화 | Done | Pending | Pending | Pending | Pending | `docs/todo/2026-03-04-review-remediation-loop/T407-mobile-background-performance.md` |
| T408 | P2 | Studio Shell 공통 컴포넌트화 + 비주얼 시스템 고도화 | Done | Pending | Pending | Pending | Pending | `docs/todo/2026-03-04-review-remediation-loop/T408-studio-shell-design-system.md` |
| T409 | P1 | Detail route 스모크 실효성 강화(실데이터/빈데이터 분리 검증) | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-04-review-remediation-loop/T409-detail-smoke-realistic-coverage.md` |
| T410 | P2 | 접근성 시맨틱 정합성 보강(landmark/heading/skip-link) | Done | Pending | Pending | Pending | Pending | `docs/todo/2026-03-04-review-remediation-loop/T410-a11y-landmark-heading-semantics.md` |
| T411 | P1 | Helm webapp 런타임 설정 게이트 해소(apiBaseUrl 의존 제거) | Done | Done | Done | Done | Done | `docs/todo/2026-03-04-review-remediation-loop/T411-helm-runtime-config-gating-fix.md` |

## 이번 사이클 우선순위

- P0(T401): 내부망 전제 정책을 네트워크 경계로 강제한다.
- P1(T402/T403/T404): 다국어 완결성, 데이터 이상치 방어, 배포 회귀 검출 범위를 우선 보강한다.
- P1(T409/T411): Detail 회귀 탐지 실효성과 운영 런타임 설정 적용 실패 리스크를 먼저 제거한다.
- P2(T405/T406/T407/T408/T410): 문서 정합성/입력 검증/성능/디자인 시스템/접근성 시맨틱을 단계적으로 마무리한다.
