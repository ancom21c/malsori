# T1204 - Bulk Batch File Upload Queue

## Spec

### 문제

- Production upload dialog only accepts one file per batch STT request.
- Submitting many files manually can burst upstream `/v1/transcribe` calls without server-side backpressure.
- Bulk work should not use realtime-paced file simulation.

### 목표

- Let users select multiple files for standard batch STT upload.
- Show a per-file queue/submission state in the upload dialog.
- Add server-side queueing/backpressure for `/v1/transcribe` upstream submissions.

### 범위

- 포함:
  - batch upload multi-file selection and queue UI
  - dialog-managed batch queue that creates one local row per file through the existing request hook
  - server-side concurrency-limited queue around upstream batch submissions
  - focused frontend/Python tests and durable docs
- 제외:
  - realtime-screen file simulation bulk mode
  - realtime API upload bulk mode
  - upstream transcription status polling redesign

### 해결방안

- Keep batch upload as the bulk-capable path.
- Keep realtime API file upload single-file only.
- Submit selected batch files through the existing local record + `/v1/transcribe` pipeline, with client-visible queue state.
- Wrap the FastAPI `/v1/transcribe` upstream submit call in an in-memory semaphore queue controlled by environment variables.

### 수용 기준 (AC)

- [x] Batch mode can select and submit multiple audio/video files.
- [x] Realtime API upload remains single-file and does not expose bulk or realtime simulation behavior.
- [x] Each selected file gets its own local processing row and normal status sync.
- [x] The upload dialog shows selected/queued/submitting/submitted/failed state per file.
- [x] Server `/v1/transcribe` limits concurrent upstream submissions and returns a clear timeout error if queue wait exceeds its budget.

## Plan

1. Add server queue settings and a queued submit helper around `/v1/transcribe`.
2. Add notification suppression to the existing batch upload hook so dialog-managed bulk queues do not spam per-file snackbars.
3. Extend `UploadDialog` to support multi-select only in batch mode and render queue state.
4. Update i18n/docs/tests.

## Review Checklist (Plan Review)

- [x] boundary / safe default / rollback이 맞는가?
- [x] scope가 다른 task와 겹치지 않는가?
- [x] verify 경로가 미리 정리돼 있는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current loop 목표와 직접 연결되는가?

## Self Review 2 - Safety

- [x] failure가 core flow에 전이되지 않는가?

## Self Review 3 - Executability

- [x] 구현 단위와 verify 명령을 바로 적을 수 있는가?

## Implementation Log

- [x] Server queue helper and settings added
- [x] Existing batch upload hook reused with per-file notification suppression
- [x] Upload dialog multi-file queue UI added
- [x] Tests/i18n/docs updated
- [x] Bundle total JS budget re-baselined for the additive bulk upload queue surface

## Review Checklist (Implementation Review)

- [x] regression / UX drift / ops risk가 없는가?
- [x] diff와 실제 구현이 spec을 벗어나지 않는가?

## Verify

- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `python -m compileall python_api/api_server`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run test`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
