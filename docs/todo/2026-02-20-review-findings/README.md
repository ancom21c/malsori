# Malsori Review Findings Board (2026-02-20)

> Status: historical execution board. This loop is complete. The latest completed execution board is `docs/todo/2026-03-08-contract-ux-loop/README.md`. No active remediation loop is currently registered.

## 목적

코드베이스 리뷰에서 식별된 이슈를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰` 루프로 관리하고, 해결안을 명시적으로 추적한다.

## 루프 규칙

1. `Spec` 작성: 문제, 범위, 해결안, 수용 기준(AC) 명시
2. `Plan Review` 통과: 구현 접근/리스크/롤백 전략 확정
3. `Implement` 진행: 작은 단위 반영 + 중간 검증
4. `Implementation Review` 통과: 회귀/품질/운영 영향 점검
5. `Verify` 완료: 테스트/스모크/배포 검증 로그 기록

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T101 | P0 | Backend endpoint 관리자 보호/비공개화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T101-backend-admin-hardening.md` |
| T102 | P0 | Drive OAuth 상태/저장소 내구성 강화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T102-drive-oauth-durability.md` |
| T103 | P1 | 배포 스모크 스펙-구현 정렬 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T103-smoke-spec-implementation-alignment.md` |
| T104 | P1 | i18n 누락 키 차단 및 회귀 방지 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T104-i18n-missing-keys.md` |
| T105 | P1 | API 오류 계약/다국어 표준화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T105-api-error-contract-i18n.md` |
| T106 | P1 | Streaming ACK handshake 명확화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T106-streaming-ack-handshake.md` |
| T107 | P2 | SyncProvider 즉시 동기화 상태기계화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T107-syncprovider-state-clarity.md` |
| T108 | P2 | TODO 보드 상태-체크리스트 정합성 게이트 | Done | Done | Done | Done | Done | `docs/todo/2026-02-20-review-findings/T108-todo-board-consistency-gate.md` |

## 이번 사이클 우선순위

- P0(T101/T102): 보안/내구성 리스크를 먼저 차단
- P1(T103~T106): 운영 검증 신뢰도와 사용자 오류 경험 정렬
- P2(T107/T108): 모호성 제거와 문서-실행 일관성 자동화
