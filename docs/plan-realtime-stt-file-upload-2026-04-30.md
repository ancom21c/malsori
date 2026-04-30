# Realtime STT File Upload Plan (2026-04-30)

> Status: current execution plan for promoting the Lab realtime STT file upload path into a production file-capture mode.

Primary references:

- `tasks/prd-realtime-stt-file-upload.md`
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md`
- `docs/plan-platform-expansion-rollout-2026-03-10.md`
- `docs/plan-feature-backend-binding-2026-03-10.md`

## Goal

Promote the existing Lab-only "upload a file through the realtime STT API" flow into the production file upload experience, while saving results into the existing transcription list/detail model.

## Product Rule

Realtime API file upload is a file-capture mode with streaming transport. It must not be stored or presented as a microphone realtime session.

Realtime-paced file simulation is a realtime-screen input mode. It is not exposed from the standard upload dialog because users expect live partial/final results while the simulation is running.

## Preservation Contract

- Existing `/v1/transcribe` file upload stays available and remains the default-safe path.
- Existing microphone realtime capture at `/realtime` and `/capture/realtime` stays unchanged.
- Saved realtime-upload rows must open in the existing detail workspace and remain searchable from `/` and `/sessions`.
- Failure must stay isolated to the new upload mode and must not pollute existing processing rows indefinitely.

## Implementation Slices

1. Shared pipeline foundation
   - Extract realtime payload normalization.
   - Extract browser file decode-to-PCM utility.
   - Add durable transport/input metadata to local transcription records.
2. Production upload path
   - Add realtime API mode to the upload dialog.
   - Create/persist/finalize records from streaming API responses.
   - Show progress/cancel/error states.
3. First-class saved record behavior
   - Distinguish batch file, realtime file, and microphone realtime records in list/detail.
   - Load local audio for realtime-upload file records.
   - Add focused tests and run frontend gates.
4. Realtime-screen file simulation
   - Add a local file picker to the realtime transcription controls.
   - Decode the file to PCM and pace chunks through the existing live streaming session.
   - Keep standard upload-dialog realtime file upload on burst streaming only.

## Rollback

- Hide the upload-dialog realtime mode or feature flag it off.
- Existing stored rows remain readable because new metadata is additive.
- Existing batch file and microphone realtime paths do not depend on the new hook.

## Active Board

- `docs/todo/2026-04-30-realtime-stt-file-upload-loop/README.md`

## Completion Gate

- Targeted unit/component tests for the new pipeline and UI.
- `npm --prefix webapp run lint`
- `npm --prefix webapp run i18n:check`
- `npm --prefix webapp run build`
- `npm --prefix webapp run test`
- `node scripts/check-todo-board-consistency.mjs`
- `git diff --check`
