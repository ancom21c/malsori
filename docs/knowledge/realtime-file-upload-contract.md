# Realtime File Upload Contract

Realtime STT file upload is a file-capture mode with streaming transport.

## Durable Rules

- Upload-dialog realtime file rows stay `kind: "file"` even when they use `/v1/streaming`.
- Realtime-screen file simulation sessions stay `kind: "realtime"` because they are live-session inputs, not background file uploads.
- Transport is represented with additive metadata:
  - `sttTransport: "batch"` for `/v1/transcribe`
  - `sttTransport: "streaming"` for `/v1/streaming`
  - `captureInput: "uploaded_file"` for file uploads
  - `captureInput: "microphone"` for live microphone sessions
- Microphone realtime sessions remain `kind: "realtime"`.
- List/detail UI distinguishes batch file upload, realtime API file upload, and microphone realtime capture without changing legacy filters.
- Realtime-upload file rows load local capture audio chunks for playback/export because they do not rely on a remote batch `remoteAudioUrl`.
- Realtime-upload finalization only completes a row after at least one non-empty final segment is received; cancellation and empty-final responses leave the row failed with an explicit reason.
- Upload-dialog realtime file upload uses burst streaming for faster completion and saves the completed result into transcription history.
- Realtime-paced simulation belongs on the realtime transcription screen. The screen accepts a local file as its input source, paces PCM chunks at roughly 0.1-0.2 seconds, and renders partial/final results through the existing live transcript surface.
- Detail retry follows the original transport: batch rows call `/v1/transcribe`, and realtime-upload rows run the realtime upload path again using stored source chunks when available or a user-selected replacement file.
- Bulk upload is batch-only. The upload dialog may select multiple files for `sttTransport: "batch"`, creating one local `kind: "file"` row per file.
- Realtime API file upload remains single-file in the upload dialog; realtime-paced file simulation remains only on the realtime transcription screen.
- Server `/v1/transcribe` applies bounded in-memory queueing before upstream submission so browser bulk uploads do not burst upstream concurrency.
- The Lab realtime upload page is diagnostics-only in development builds once the production upload mode exists.

## Rollback

- Hide or remove the upload-dialog realtime mode.
- Existing stored records remain readable because the added metadata is optional and unindexed.
- Existing batch file upload and microphone realtime flows do not depend on realtime file upload.
