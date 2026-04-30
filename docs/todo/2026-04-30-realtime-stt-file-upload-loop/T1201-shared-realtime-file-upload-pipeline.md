# T1201 - Shared Realtime File-Upload Pipeline

## Spec

### 문제

- Lab realtime upload keeps decoded file streaming and final transcript segments in component state only.
- Realtime payload normalization is duplicated between Lab and microphone realtime capture.

### 목표

- Reuse the realtime streaming parser and browser decode pipeline in a production persistence hook.
- Save realtime-upload results into existing `transcriptions`, `segments`, and `audioChunks` tables.

### 범위

- 포함:
  - shared realtime payload normalization
  - shared browser file decode-to-PCM utility
  - local transcription metadata for streaming upload transport
  - hook/service that creates, streams, persists, and finalizes a local row
- 제외:
  - backend endpoint redesign
  - replacing `/v1/transcribe`

### 해결방안

- Extract the reusable logic from `LabPage.tsx`/`RealtimeSessionPage.tsx`.
- Implement a realtime file-upload hook that creates a `kind: "file"` row with streaming transport metadata and uses repository helpers for all persistence.

### 수용 기준 (AC)

- [x] Realtime upload success creates a completed local row with transcript text and segments.
- [x] Failure/cancel paths do not leave indefinite processing rows.
- [x] Existing batch file upload and microphone realtime capture code can keep using their current contracts.

## Plan

1. Add shared realtime payload normalizer.
2. Add shared file-to-PCM decoder.
3. Add local metadata fields and repository-safe updates.
4. Add realtime file-upload hook with progress/cancel support.
5. Add focused tests.

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

- [x] Shared normalizer added
- [x] Shared audio decoder added
- [x] Realtime upload hook added
- [x] Cancellation, empty-final, and pre-row validation paths hardened
- [x] Burst streaming supported for upload-dialog realtime file upload
- [x] Realtime-paced file simulation moved to the realtime transcription screen
- [x] Nested payload text/timing selection hardened
- [x] Tests added

## Review Checklist (Implementation Review)

- [x] regression / UX drift / ops risk가 없는가?
- [x] diff와 실제 구현이 spec을 벗어나지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- realtimeStreamingPayload decodeAudioFile transcriptionRepository`
- [x] `npm --prefix webapp run test -- realtimeStreamingPayload useRequestRealtimeFileTranscription`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run test`
