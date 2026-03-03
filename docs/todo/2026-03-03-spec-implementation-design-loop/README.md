# Malsori Spec/Implementation/Design Loop Board (2026-03-03)

## 목적

RTZR 공식 문서 기준으로 식별된 `P0~P2` 이슈를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰` 루프로 정리하고, Studio Console 기반 디자인 적용 계획까지 동일 보드에서 추적한다.

## 루프 규칙

1. `Spec` 작성: 문제/목표/범위/해결방안/AC를 명시한다.
2. `Plan Review` 통과: 구현 접근, 리스크, 롤백 전략을 확정한다.
3. `Implement` 진행: 작은 단위로 반영하고 중간 검증을 남긴다.
4. `Implementation Review` 통과: 회귀/보안/UX 영향 점검을 완료한다.
5. `Verify` 완료: 테스트/스모크/문서 정합성 결과를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T201 | P0 | Cloud Realtime 계약 정렬 (RTZR spec) | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-03-spec-implementation-design-loop/T201-cloud-realtime-contract-alignment.md` |
| T202 | P0 | 웹 번들 예산 회복 및 CI 게이트 복구 | Done | Done | Done | Done | Done | `docs/todo/2026-03-03-spec-implementation-design-loop/T202-web-bundle-budget-recovery.md` |
| T203 | P1 | Backend Admin UI 내부망 운영 정책 정렬 | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-03-spec-implementation-design-loop/T203-backend-admin-internal-surface.md` |
| T204 | P1 | 접근성/키보드 조작성 정합성 보강 | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-03-spec-implementation-design-loop/T204-accessibility-keyboard-semantics.md` |
| T205 | P2 | 로케일 날짜/시간 표기 및 문서 lang 정렬 | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-03-spec-implementation-design-loop/T205-locale-formatting-html-lang.md` |
| T206 | P2 | README/API 계약 문구 모호성 제거 | Done | Done | Done | Done | Done | `docs/todo/2026-03-03-spec-implementation-design-loop/T206-doc-contract-clarity.md` |
| T207 | P1 | Studio Console 정보구조/비주얼 시스템 설계 | Done | Done | Done | Done | Done | `docs/todo/2026-03-03-spec-implementation-design-loop/T207-studio-console-ia-visual-system.md` |
| T208 | P2 | Connection HUD + Empty State 디자인 적용 | Done | Done | Done | Pending | Pending | `docs/todo/2026-03-03-spec-implementation-design-loop/T208-connection-hud-empty-state.md` |

## 이번 사이클 우선순위

- P0(T201/T202): 실시간 계약 불일치와 CI 실패를 먼저 해소한다.
- P1(T203/T204/T207): 운영 정책과 UX 핵심 사용성, 새 콘솔 구조를 정렬한다.
- P2(T205/T206/T208): i18n/문서 정합성과 고급 디자인 완성도를 마무리한다.
