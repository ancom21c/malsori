# Realtime STT File Upload Loop Board (2026-04-30)

> Status: current execution board. Execution plan: `docs/plan-realtime-stt-file-upload-2026-04-30.md`. Latest completed execution board is `docs/todo/2026-03-11-summary-backend-loop/README.md`.

## 목적

Lab에만 있던 실시간 STT API 파일 업로드를 production file capture 모드로 승격하고, 결과를 기존 전사 목록/상세 저장 구조에 편입한다.

상위 설계 문서:

- `docs/plan-realtime-stt-file-upload-2026-04-30.md`
- `tasks/prd-realtime-stt-file-upload.md`
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md`
- `docs/plan-platform-expansion-rollout-2026-03-10.md`

## 루프 규칙

1. `Spec`: 문제/목표/범위/해결안/AC를 명시한다.
2. `Plan Review`: 접근 방식, boundary, rollback, safe default를 점검한다.
3. `Implement`: 작은 단위로 반영하고 로그를 남긴다.
4. `Implementation Review`: spec drift, regression, UX/ops risk를 점검한다.
5. `Verify`: lint/build/test/smoke/doc gate를 기록한다.

## Task Board

| ID | 우선순위 | 작업 | Spec | Plan Review | Implement | Impl Review | Verify | 문서 |
|---|---|---|---|---|---|---|---|---|
| T1201 | P0 | Shared realtime file-upload pipeline | Done | Done | Done | Done | Done | `docs/todo/2026-04-30-realtime-stt-file-upload-loop/T1201-shared-realtime-file-upload-pipeline.md` |
| T1202 | P0 | Production upload dialog mode | Done | Done | Done | Done | Done | `docs/todo/2026-04-30-realtime-stt-file-upload-loop/T1202-production-upload-dialog-mode.md` |
| T1203 | P1 | Saved record detail/list hardening | Done | Done | Done | Done | Done | `docs/todo/2026-04-30-realtime-stt-file-upload-loop/T1203-saved-record-detail-list-hardening.md` |

## 현재 상태 스냅샷

- 이미 landed:
  - Lab-only realtime upload proof of concept (`webapp/src/pages/LabPage.tsx`)
  - batch file upload persistence/polling
  - microphone realtime save/detail flow
  - production upload dialog realtime API mode
  - realtime transcription screen file input that simulates live streaming and shows live results
  - saved-row transport metadata and list/detail transport labels
  - local capture audio playback for streaming-upload file rows
  - cancellation, empty-final, validation-error, and nested-payload hardening for realtime file upload
  - streaming-upload retry routed back through realtime transport
- 현재 blocker:
  - target-server smoke for backend-specific `/v1/streaming` final close timing remains deploy evidence, not a local implementation blocker.

## 추천 실행 순서

1. `T1201`
2. `T1202`
3. `T1203`

## 의존성 메모

- `T1202` depends on `T1201` shared hook/service behavior.
- `T1203` depends on the metadata and saved-row shape introduced in `T1201`.

## 이번 루프 우선순위

- Now: deploy smoke evidence against the target realtime backend
- Next: close this loop after deploy evidence if needed
- Later: none
