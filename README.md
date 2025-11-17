# malsori

A browser-based RTZR speech-to-text workstation that records audio, streams it to the RTZR realtime API, and manages file transcription jobs. The project currently ships a single Vite + React webapp located in `webapp/`.

## Current Capabilities

- Realtime recorder pipeline with countdown, PCM resampling, resilient WebSocket handshake (token subprotocol, metadata, keep-alive, backoff) and offline recovery.
- Automatic chunk buffering while reconnecting plus finalization request when stopping a session.
- IndexedDB (Dexie) persistence for transcriptions, segments, PCM audio chunks, presets, and environment settings.
- Audio playback & export: assemble realtime PCM chunks into a WAV blob, stream remote audio, and play/seek per-segment within the detail view.
- File transcription flow with upload dialog, preset selection, status polling, and history list.
- Settings management for API base URL, credentials, realtime autosave interval, and preset CRUD.

See `webapp/docs/IMPLEMENTATION_NOTES.md` for milestone details and remaining backlog.

## Development

```bash
cd webapp
npm install
npm run dev
```

Open http://localhost:5173 to launch the app. Vite 7 requires Node.js ≥ 20.19.0.

### Python API (FastAPI proxy)

Install [uv](https://docs.astral.sh/uv/) once (supports macOS, Linux, Windows). Then set up the proxy:

```bash
cd python_api
uv sync     # creates .venv with the declared dependencies
. .venv/bin/activate
```

Configure the proxy with environment variables before starting it. At minimum you must set a writable storage directory for cached audio/logs and the credentials or token issued by RTZR:

- `STT_STORAGE_BASE_DIR` – directory where raw audio and transcripts are archived.
- `PRONAIA_CLIENT_ID` / `PRONAIA_CLIENT_SECRET` – RTZR app credentials used to mint access tokens. Required unless you provide a token manually.
- `PRONAIA_ACCESS_TOKEN` – optional bearer token to reuse instead of minting via client ID/secret.
- `PRONAIA_API_BASE` – upstream RTZR API base URL (defaults to `https://dev-openapi.vito.ai`).
- `STT_DEPLOYMENT` – `cloud` (default) or `onprem`, adjusts the upstream endpoint paths.
- `STT_VERIFY_SSL` – set to `0` to ignore TLS verification when connecting to on-prem deployments.

Example launch:

```bash
export STT_STORAGE_BASE_DIR=$HOME/malsori-data
export PRONAIA_CLIENT_ID=your-client-id
export PRONAIA_CLIENT_SECRET=your-client-secret
uvicorn api_server.main:app --host 0.0.0.0 --port 8000
```

The FastAPI app exposes `/docs` for interactive testing, `/v1/transcribe` for batch jobs, and `/v1/streaming` for realtime WebSocket relay.

### Connecting the webapp to the Python API

The React app talks only to the Python proxy. When you run `npm run dev`, open the app (default http://localhost:5173) and visit **설정 → 환경 설정** to confirm the “Python API Base URL” points to the proxy (default `http://localhost:8000`). Update the field if the proxy runs elsewhere, then start a realtime session or upload flow—the browser will stream audio to `/v1/streaming` on the FastAPI server, which in turn relays to RTZR.  
Helm deployments can override this default by writing `/config/malsori-config.js` (via ConfigMap) so the SPA automatically targets the ingress-exposed API host.

### Useful Scripts

- `npm run lint` – ESLint over the entire project.
- `npm run build` – Type-check and bundle the production output.
- `npm test` – Vitest unit tests (repositories, hooks, audio utilities).

## QA & CI

- Vitest runs with a jsdom environment and `fake-indexeddb` so Dexie code can be exercised.
- New unit tests cover preset repository default handling and `useTranscriptions` ordering in addition to existing repository specs.
- GitHub Actions workflow (`.github/workflows/ci.yml`) now has distinct jobs for the React frontend (npm install/lint/build/test) and the FastAPI proxy (uv sync + `python -m compileall`) so both deliverables are exercised on every push/PR.

## Repository Layout

- `webapp/` – main SPA source code, configuration, and tests.
- `.github/workflows/ci.yml` – project CI pipeline.
- `AGENTS.MD`, `LICENSE` – auxiliary metadata.

## Documentation

- `webapp/README.md` – application overview and local usage instructions.
- `webapp/docs/IMPLEMENTATION_NOTES.md` – implementation notes and backlog.
