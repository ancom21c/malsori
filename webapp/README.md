# RTZR STT Browser App

Next-generation RTZR speech-to-text client that runs entirely in the browser (desktop & Android Chrome).
Built with Vite + React + TypeScript, Material UI, Dexie, Zustand, and React Query.

## Getting Started

```bash
cd webapp
npm install
npm run dev
```

> **Node.js**: Vite 7 currently requires Node >= 20.19.0 (local toolchain may warn when using 20.18.0).

Open http://localhost:5173/ to view the app.

### Available Scripts

- `npm run dev` – start Vite dev server.
- `npm run build` – type-check and build production bundle.
- `npm run preview` – preview the production build.
- `npm run lint` – run ESLint with the flat config.
- `npm test` – run Vitest unit tests (jsdom + fake-indexeddb).

## Feature Overview

- **Transcription History** – Dexie-backed list of file and realtime sessions, sorted by newest first with delete support.
- **Realtime Session** – Countdown, microphone capture with PCM resampling, metadata handshake, keep-alive ping/pong, reconnect backoff, buffering while offline, and graceful finalization.
- **Streaming Decoder** – Converts recorder chunks into 16-bit PCM, sends them over WebSocket after handshake acknowledgement, and normalises incoming partial/final message shapes.
- **Audio Playback & Export** – Rebuild recorded PCM chunks into a WAV blob, expose download, stream remote audio, and provide per-segment seek/play controls in the detail view.
- **File Transcription Flow** – Upload dialog with preset selection, API submission, optimistic Dexie persistence, and status polling to import remote segments/audio URLs.
- **Settings & Presets** – Client-side storage for API base URL, token, client credentials, realtime autosave interval, and Dexie-backed preset CRUD with default enforcement.
- **App Infrastructure** – MUI theme, snackbar system, TanStack Query client, authenticated REST client, and recorder utilities.

## QA & Tooling

- Unit tests cover Dexie repositories (`transcriptionRepository`, `presetRepository`) and hooks (`usePresets`, `useTranscriptions`). Tests run in jsdom with `fake-indexeddb` seeded in `src/test/setup.ts`.
- GitHub Actions workflow (`../.github/workflows/ci.yml`) runs `npm ci`, lint, build, and tests on every push & PR.
- `vitest` coverage can be generated with `npm test -- --coverage`.

## Documentation

- `docs/IMPLEMENTATION_NOTES.md` – current milestone snapshot and backlog.
- `src/services/audio/` – Recorder, resampler, and WAV builder utilities.
- `src/services/api/rtzrStreamingClient.ts` – Resilient WebSocket client with handshake and reconnection logic.
