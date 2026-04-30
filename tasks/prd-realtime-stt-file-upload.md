# PRD: Realtime STT File Upload Promotion

## Document Status
- Status: In Progress
- File Mode: Single
- Current Phase: Phase 3
- Last Updated: 2026-04-30
- PRD File: `tasks/prd-realtime-stt-file-upload.md`
- Purpose: Promote the Lab realtime-STT file upload path into a production file-capture option whose results are saved in the transcription list.

## Problem
The Lab page can decode an uploaded audio/video file, stream PCM chunks to `/v1/streaming`, and render realtime STT responses. It does not create a durable transcription record, persist segments, support detail playback/export/share, or participate in list filters/search/cloud sync. Users need the same realtime API upload path as a normal product feature without regressing the existing `/v1/transcribe` file upload or microphone realtime capture.

## Goals
- G-1: Add a production file upload mode that sends uploaded media through the realtime STT API.
- G-2: Save completed realtime-upload results into the existing transcription list and detail workspace.
- G-3: Preserve the current batch file upload, realtime microphone capture, list, detail, and settings behavior.
- G-4: Reuse existing transcription persistence, segment normalization, search indexing, and audio playback/export contracts.

## Non-Goals
- NG-1: Do not replace `/v1/transcribe` batch file transcription.
- NG-2: Do not create a new public per-feature endpoint setting; use existing settings now and backend binding architecture later.
- NG-3: Do not promote the whole `/lab` page as production UI.
- NG-4: Do not redesign realtime microphone capture.

## Success Criteria
- SC-1: A user can choose realtime API upload from the production file upload entry point. Implemented locally.
- SC-2: Starting the realtime upload creates a local transcription row with progress/error state. Implemented locally.
- SC-3: Final realtime segments are persisted with transcript text and search index updates. Implemented locally.
- SC-4: Completion navigates to, or clearly links to, the saved detail record. Implemented locally.
- SC-5: The saved record is visible in `/` and `/sessions`, searchable by title/content, and distinguishable from batch file upload and microphone realtime sessions. Implemented locally.
- SC-6: Existing batch file upload and microphone realtime golden paths remain green. Local tests/build are green; target backend smoke remains recommended.

## Key Scenarios
### Scenario 1: Realtime API File Upload
- Actor: User with an audio/video file.
- Trigger: User selects realtime API mode in the file upload flow and starts upload.
- Expected outcome: The app decodes media, streams PCM chunks to `/v1/streaming`, saves final segments, marks the row completed, and opens the saved detail view.

### Scenario 2: Streaming Upload Failure
- Actor: User with invalid config, unsupported media, or streaming server failure.
- Trigger: Decode, connect, stream, or finalization fails.
- Expected outcome: The local row is marked failed when one exists, error copy is shown, and existing file/realtime flows continue to work.

## Discovery Summary
- Reviewed:
  - `docs/plan-stt-value-preservation-baseline-2026-03-10.md`
  - `docs/plan-platform-expansion-rollout-2026-03-10.md`
  - `docs/plan-feature-backend-binding-2026-03-10.md`
  - `webapp/docs/IMPLEMENTATION_NOTES.md`
  - `webapp/src/pages/LabPage.tsx`
  - `webapp/src/components/UploadDialog.tsx`
  - `webapp/src/hooks/useRequestFileTranscription.ts`
  - `webapp/src/pages/RealtimeSessionPage.tsx`
  - `webapp/src/pages/TranscriptionListPage.tsx`
  - `webapp/src/pages/TranscriptionDetailPage.tsx`
  - `webapp/src/services/data/transcriptionRepository.ts`
  - `webapp/src/data/app-db.ts`
- Current system:
  - Batch file upload uses `useRequestFileTranscription`, creates a `kind: "file"` local row, calls `/v1/transcribe`, stores source-file chunks for retry, then polling updates status/segments.
  - Microphone realtime creates a `kind: "realtime"` local row, streams chunks via `RtzrStreamingClient`, persists capture chunks and final segments, then finalizes/navigates to detail.
  - Lab realtime upload currently decodes a file and streams it through `RtzrStreamingClient`, but keeps segments in component state only.
- Validation surface:
  - Existing gates: `npm --prefix webapp run lint`, `i18n:check`, `build`, `bundle:check`, `test`.
  - Targeted tests should cover repository persistence, realtime-upload hook/model, upload UI mode selection, list/detail rendering, and route smoke.
- Design implications:
  - Treat this as a file-capture feature with streaming transport, not as a microphone realtime session.
  - Keep `LocalTranscriptionKind` user-facing and avoid overloading `kind: "realtime"` for uploaded files.
  - Add metadata such as `sttTransport: "batch" | "streaming"` or equivalent unindexed fields, then update list/detail labels around that metadata.
  - Extract duplicated realtime message normalization and file-to-PCM decoding from Lab/realtime pages before wiring production UI.
- Confidence / gaps:
  - Confidence is high for frontend storage and UX shape.
  - Backend-specific finalization behavior for `/v1/streaming` should be verified with the target RTZR/on-prem server before enabling by default.

## Requirements
### Functional Requirements
- FR-1: The production file upload entry point must offer batch upload and realtime API upload as explicit modes.
- FR-2: Realtime API upload must use streaming presets/config, not batch `/v1/transcribe` request config.
- FR-3: Realtime API upload must create a durable local transcription row before streaming audio begins.
- FR-4: The saved row must be user-classified as file capture and must record streaming transport metadata.
- FR-5: The implementation must persist source file metadata and enough audio data for detail playback/export/retry decisions.
- FR-6: Final streaming messages must be normalized into existing `LocalSegment` records via `replaceSegments`.
- FR-7: `transcriptText`, status, duration, model, preset, backend endpoint snapshot, and error fields must be updated through existing repository helpers.
- FR-8: Detail view must load playable audio for realtime-upload file records even when no `remoteAudioUrl` exists.
- FR-9: List and detail UI must distinguish batch file upload, realtime API file upload, and microphone realtime capture.
- FR-10: The Lab implementation must either be removed from primary navigation or clearly remain non-production after the production path exists.

### Non-Functional Requirements
- NFR-1: Existing batch file upload, polling, detail retry, and realtime microphone save behavior must not regress.
- NFR-2: Changes must be additive to IndexedDB schema and tolerate old records without backfill.
- NFR-3: Decode/stream/finalize errors must be isolated to the created row and must not leave indefinite processing records.
- NFR-4: User-facing strings must use i18n keys.
- NFR-5: Large files must show progress and cancellation; cancellation must finalize as failed/aborted or delete an unstarted row deterministically.

## Assumptions
- A-1: The correct product semantics are `file capture + streaming transport`; uploaded-file records should remain discoverable with file transcription history.
- A-2: The first production version can use existing same-origin `apiBaseUrl` and streaming presets before a full `capture.file` binding split is introduced.
- A-3: If the original media is browser-playable, detail playback may use stored source-file chunks; otherwise it may use stored PCM capture chunks converted to WAV.

## Dependencies / Constraints
- Existing no-regression baseline requires `/`, `/realtime`, `/settings`, and `/transcriptions/:id` to remain stable.
- Backend settings/operator boundary should not gain a new public endpoint control for this feature.
- The current detail page only builds local WAV playback for `kind: "realtime"`, so file rows with streaming transport need explicit detail support.
- `useTranscriptionSync` polls rows with `remoteId`; realtime-upload rows should complete locally and avoid the polling path unless a backend job id is actually returned.

## Risks / Edge Cases
- Browser decode support may reject some video/audio containers.
- Huge files can exceed IndexedDB quota if both original media and PCM chunks are stored.
- A server may close before final segments arrive; finalization needs a safety timeout like microphone realtime.
- Storing records as plain `kind: "realtime"` would be easier but would confuse list filters and detail mode labels.
- Source-file retry semantics differ between `/v1/transcribe` and `/v1/streaming`; retry must select the original transport.

## Execution Rules
- Complete phases in order unless this PRD is revised.
- Keep the feature behind explicit UI choice and, if needed, an env flag until smoke evidence is green.
- Prefer shared helpers over copying Lab and realtime page parsing logic a third time.
- Preserve existing code patterns and repository helpers.
- At the end of each phase, update this PRD if implementation discoveries change later work.

## Phase Plan
### Phase 1: Domain And Shared Pipeline
Objective: Extract reusable streaming-upload primitives and add durable metadata without surfacing production UI yet.

Discovery gate:
- [ ] Re-check `LabPage.tsx`, `RealtimeSessionPage.tsx`, `rtzrStreamingClient.ts`, `transcriptionRepository.ts`, `app-db.ts`, and `TranscriptionDetailPage.tsx`.
- [ ] Re-check tests for streaming client, realtime session model, repository, list, and detail.

Implementation checklist:
- [ ] Extract realtime payload normalization into a shared module used by Lab and realtime pages.
- [ ] Extract file decode-to-PCM logic into a testable audio utility.
- [ ] Add unindexed local transcription metadata for streaming transport and source input, for example `sttTransport` and `captureInput`.
- [ ] Add a `useRequestRealtimeFileTranscription` hook or equivalent service that creates a local row, streams chunks, persists segments, and finalizes status.
- [ ] Persist source file chunks and/or PCM chunks according to the chosen playback/quota policy.
- [ ] Ensure cancellation and permanent failure update or delete rows deterministically.

Validation checklist:
- [ ] Unit tests for normalization helper with final/partial/error payload shapes.
- [ ] Unit tests for repository updates and search index behavior after realtime-upload finalization.
- [ ] Targeted hook/service tests for success, decode failure, streaming failure, cancellation, and final timeout.

Exit criteria:
- [ ] Realtime-upload can be exercised through a non-production harness and creates correct local records.
- [ ] No production UI path is changed yet.

### Phase 2: Production File Upload UX
Objective: Add realtime API upload as an official mode in the existing file upload entry point.

Discovery gate:
- [ ] Re-check `UploadDialog.tsx`, list page quick actions, route aliases `/capture/file`, settings presets, and i18n strings.
- [ ] Confirm whether a feature flag is needed for initial rollout.

Implementation checklist:
- [ ] Add a mode selector to the upload dialog: batch file STT and realtime API STT.
- [ ] Switch config selector/editor between file presets and streaming presets based on mode.
- [ ] Show progress, cancellation, and error states for streaming upload without disrupting batch upload mutation state.
- [ ] On completion, navigate to the saved detail record or provide one clear action to open it.
- [ ] Update list row badges/metadata so realtime API file uploads are recognizable.
- [ ] Keep `/lab` available only as a diagnostics page or remove it from primary navigation after parity is reached.

Validation checklist:
- [ ] Component tests for mode selection, disabled states, missing config, missing file, and completion action.
- [ ] i18n check for all new user-facing strings.
- [ ] Browser smoke for batch upload path still opening unchanged and streaming mode rendering correctly.

Exit criteria:
- [ ] Production users can launch realtime API file upload from file capture UX.
- [ ] Existing upload and realtime capture CTAs still route to their previous flows.

### Phase 3: Detail, Sync, Rollout, And Regression Gates
Objective: Make saved realtime-upload records first-class in detail, search, share/export, sync, and smoke gates.

Discovery gate:
- [ ] Re-check `TranscriptionDetailPage.tsx`, `useShareLink.ts`, cloud sync manager, post-deploy smoke, and list filter tests.
- [ ] Verify server behavior for final message timing and close semantics on `/v1/streaming`.

Implementation checklist:
- [ ] Teach detail playback to load audio for file records with streaming transport and no `remoteAudioUrl`.
- [ ] Ensure export/share use the correct audio source when available.
- [ ] Ensure retry uses the original transport: batch rows call `/v1/transcribe`, streaming rows call realtime-upload.
- [ ] Update list/detail mode labels to show `File transcription` plus `Realtime API` transport where appropriate.
- [ ] Update smoke evidence or automated smoke to include the new mode when enabled.
- [ ] Update durable docs under `docs/knowledge/` or relevant plan docs if this becomes a stable product contract.

Validation checklist:
- [ ] Detail tests for playback source selection across batch file, realtime-upload file, and microphone realtime records.
- [ ] List filter/search tests for realtime-upload rows.
- [ ] Cloud/share/export tests or manual evidence for audio availability decisions.
- [ ] Full gate: lint, i18n, build, bundle check, test, and post-deploy smoke.

Exit criteria:
- [ ] Saved realtime-upload records behave like first-class transcriptions across list/detail/search/share/export.
- [ ] Rollback can hide the mode without breaking stored records.

## Final Multi-Pass Review After All Phases
Complete in order:
- [ ] 1. Requirements coverage review: every FR, NFR, and success criterion is satisfied or explicitly deferred.
- [ ] 2. Cross-phase integration review: phase outputs work together without gaps or duplicated ownership.
- [ ] 3. Correctness review: happy paths, edge cases, errors, empty states, permissions, and state transitions are handled.
- [ ] 4. Simplicity/refactor review: the final design is no more complex than necessary.
- [ ] 5. Duplication/cleanup review: repeated Lab/realtime parsing logic is consolidated.
- [ ] 6. Security/privacy review: source media storage, credentials, and backend boundary remain safe.
- [ ] 7. Performance/load review: decode, chunk storage, and IndexedDB quota behavior are acceptable.
- [ ] 8. Validation review: automated and manual checks match the risk.
- [ ] 9. Documentation/operability review: stable product and operator contracts are promoted to `docs/` when final.
- [ ] 10. PRD closeout review: status, change log, and follow-ups are current.

## Open Questions
- OQ-1: Should the first rollout store both original source chunks and PCM chunks, or choose one by default to reduce IndexedDB quota pressure?
- OQ-2: Should this mode be hidden behind a new env flag for one release, or enabled whenever realtime capture capability is available?

## Change Log
- 2026-04-30: Initial PRD created from current docs/code discovery.
- 2026-04-30: Local implementation completed; target backend smoke evidence remains before production rollout closeout.
