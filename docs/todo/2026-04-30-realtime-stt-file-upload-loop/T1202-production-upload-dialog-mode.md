# T1202 - Production Upload Dialog Mode

## Spec

### 문제

- Production upload UI only exposes `/v1/transcribe` batch upload.
- Users cannot choose the realtime STT API for uploaded files outside Lab.

### 목표

- Add realtime API file upload as an explicit mode in the existing upload dialog.

### 범위

- 포함:
  - mode selector in `UploadDialog`
  - streaming preset/config selection for realtime mode
  - progress/cancel/error/completion UI
  - navigation to the saved record on completion
- 제외:
  - navigation redesign
  - Lab diagnostics redesign

### 해결방안

- Keep batch mode as the default-safe path.
- Use the new realtime upload hook only when the user explicitly selects realtime API mode.

### 수용 기준 (AC)

- [x] Batch upload mode remains usable without changed behavior.
- [x] Realtime mode requires a selected file and valid streaming config.
- [x] Completion opens or links to the saved detail route.

## Plan

1. Add mode state and selector to `UploadDialog`.
2. Wire streaming presets/config when realtime mode is selected.
3. Wire progress/cancel and completion handling.
4. Add component tests and i18n strings.

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

- [x] Upload dialog mode selector added
- [x] Streaming preset/config UI added
- [x] Realtime upload hook wired
- [x] Realtime-paced simulation toggle retained
- [x] Tests/i18n updated

## Review Checklist (Implementation Review)

- [x] regression / UX drift / ops risk가 없는가?
- [x] diff와 실제 구현이 spec을 벗어나지 않는가?

## Verify

- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
