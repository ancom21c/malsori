# Malsori Execution Loop Board (2026-02-19)

## 목적

다음 작업들을 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰` 루프로 운영하기 위한 실행 보드.

## 루프 규칙

1. `Spec` 작성: 문제, 범위, 수용 기준(AC) 명시
2. `Plan Review` 통과: 구현 접근/리스크/롤백 전략 확인
3. `Implement` 진행: 작은 단위 커밋, 중간 검증 포함
4. `Implementation Review` 통과: 회귀/품질/운영 영향 점검
5. `Verify` 완료: 테스트/스모크/배포 확인 로그 남김

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T001 | P0 | 운영 API 계약 점검/정렬 | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T001-api-contract.md` |
| T002 | P0 | 배포 후 스모크 자동화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T002-post-deploy-smoke.md` |
| T003 | P1 | CI 품질 게이트 강화 | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T003-ci-quality-gates.md` |
| T004 | P1 | Realtime 지연/재연결 UX | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T004-realtime-latency-reconnect.md` |
| T006 | P1 | Safe chunking + runtime gate | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T006-safe-chunking-runtime.md` |
| T005 | P2 | Waveform/Timeline UX | Done | Done | Done | Done | Done | `docs/todo/2026-02-19-execution-loop/T005-waveform-timeline.md` |

## 이번 사이클 원칙

- T001, T002를 먼저 닫아 운영 안정성과 배포 신뢰도를 확보한다.
- T003은 T001/T002 산출물을 기준으로 CI 파이프라인에 품질 게이트를 추가한다.
- T004, T005는 UX 개선 2차 라운드로 분리해 단계적으로 배포한다.
