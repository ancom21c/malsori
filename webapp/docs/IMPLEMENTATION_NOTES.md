# RTZR STT Webapp Implementation Notes

## Current Milestone
- Vite + React + TypeScript SPA with Material UI, Zustand store, Dexie persistence, TanStack Query, and Notistack notifications.
- IndexedDB (Dexie) schemas for transcriptions, segments, audio chunks, presets, and settings hydrated on boot.
- File transcription flow:
  - Upload dialog submits to `/v1/transcribe`, persists local record, and surfaces progress/state.
  - Background polling (`useTranscriptionSync`) ingests remote status, segments, and audio URL updates.
  - Transcription detail page supports delete, remote audio streaming, WAV download/export, and per-segment playback.
- Realtime pipeline:
  - Countdown UX, recorder with PCM resampling, chunk buffering, autosave timer, and graceful finalize/abort cases.
  - `RtzrStreamingClient` handles WebSocket handshake (token subprotocol, metadata payload), keep-alive ping/pong, reconnection with backoff, pending chunk flushing, and handshake acknowledgement before streaming audio.
  - Incoming partial/final messages are normalised so heterogeneous API payloads surface consistent segments.
- Settings & presets: CRUD backed by Dexie with single-default enforcement, environment values (API base URL, token, client id/secret, autosave cadence).
- Audio utilities: PCM resampler, recorder manager, WAV builder for stitching PCM chunks, and UI playback controls for individual transcript segments.
- QA & Tooling: Vitest coverage for repositories & hooks, jsdom + `fake-indexeddb` test harness, ESLint flat config, and CI workflow running lint/build/tests on push/PR.

## Next Steps
- Waveform visualisation and timeline scrubbing (e.g., @ffmpeg/wasm or Wavesurfer integration) with loop markers per transcript segment.
- Advanced realtime UX: live latency indicators, reconnect toast with retry/abort affordances, and surfaced server error metadata.
- Offline-first enhancements: chunk compaction, storage quota monitoring, and ability to resume partially uploaded realtime sessions.
- Preset management polish: import/export presets as JSON, multi-default guardrails across file/streaming types, and validation helpers.
- Secure credential storage guidance (e.g., optional Web Crypto wrapping) and environment sanity checks before starting sessions.
- Broader automation: add mutation tests around recorder utilities, smoke tests for AppRouter, and visual regression hooks once UI stabilises.
