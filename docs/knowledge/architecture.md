# Architecture

## Overview

Malsori is a single-product repo with three runtime layers: a browser SPA, a FastAPI proxy, and deployment/runtime configuration. The browser-facing contract is intentionally mediated through the proxy so the UI does not need to encode RTZR-specific auth, upstream endpoint selection, or artifact persistence details.

## Components

- `webapp/`: operator SPA for transcription history, detail playback/export, realtime capture, presets, and runtime settings
- `python_api/`: FastAPI service handling `/v1/health`, `/v1/transcribe*`, `/v1/streaming`, `/v1/cloud/google/*`, and optional `/v1/backend/*` plus `/v1/observability/runtime-error`
- `infra/`: Helm chart and deployment assets that control ingress, runtime config injection, and environment policy

## Data / State

- Browser state is split between React state, Zustand store, TanStack Query caches, and Dexie/IndexedDB persistence for transcriptions, segments, presets, settings, and buffered audio chunks.
- Server-side persisted artifacts live under `STT_STORAGE_BASE_DIR`, including uploaded audio, cached transcript-related files, and optional Google Drive OAuth refresh tokens.
- Realtime sessions rely on a deterministic handshake: browser `start` payload, proxy `ready` ack, binary audio stream, then `final`/`EOS` completion handling.

## Failure Modes

- Realtime disconnects or handshake drift can corrupt capture unless buffering, reconnection, and finalization semantics stay aligned across SPA and proxy.
- Ingress misconfiguration can accidentally expose internal-only admin or observability surfaces.
- Frontend build, bundle, or service-worker regressions can produce blank screens or stale assets even when the API is healthy.
- Settings/state hydration bugs can silently overwrite operator draft values if normalized equality rules drift.

## Security Notes

- Backend admin endpoints are disabled by default and require token auth when enabled.
- Google Drive auth broker mode keeps refresh tokens server-side and gives the browser short-lived access tokens only.
- Never record secrets, tokens, or local-only infrastructure details in committed docs or templates.
