# Plan: P0 Service Error Strings (i18n)

## Goal
- Remove remaining hardcoded Korean error strings in service-layer code paths that surface to users.
- Keep changes minimal: translate at error creation time via a lightweight, non-React translator.

## Scope
- `webapp/src/services/api/rtzrStreamingClient.ts`
- `webapp/src/services/api/rtzrApiClient.ts`
- `webapp/src/services/audio/recorderManager.ts`

## Approach
- Add `webapp/src/i18n/static.ts` exporting `tStatic(key, options)`.
  - Locale source: `localStorage(malsori.language)` then `navigator.languages`, fallback `en`.
  - Template formatting: `{{token}}` replacement matching the existing i18n provider.
- Replace hardcoded error message literals with `tStatic(...)`.
- Add translation keys in `webapp/src/i18n/translations.ts`:
  - `aValidApiBaseUrlIsRequired`
  - `requestFailedWithStatus`
  - `responseIsMissingTranscribeId`
  - `anErrorOccurredWhileProcessingAudioFrames`
  - `failedToInitializeRecordingDevice`
  - `anErrorOccurredWhileFinalizingAudioChunks`

## Success Criteria
- `rg '[가-힣]' webapp/src/services` no longer shows user-facing error strings in these files.
- `cd webapp && npm test && npm run lint && npm run build` pass.
