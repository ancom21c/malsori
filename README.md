# malsori

A browser-based RTZR speech-to-text workstation that records audio, streams it to the RTZR realtime API, and manages file transcription jobs. The project currently ships a single Vite + React webapp located in `webapp/`.

## Current Capabilities

- Realtime recorder pipeline with countdown, PCM resampling, resilient WebSocket handshake (`start` -> proxy `ready` ack -> binary audio -> `final`), keep-alive, backoff, and offline recovery.
- Automatic chunk buffering while reconnecting plus finalization request when stopping a session.
- IndexedDB (Dexie) persistence for transcriptions, segments, PCM audio chunks, presets, and environment settings.
- Audio playback & export: assemble realtime PCM chunks into a WAV blob, stream remote audio, and play/seek per-segment within the detail view.
- File transcription flow with upload dialog, preset selection, status polling, and history list.
- Settings management for API base URL, credentials, realtime autosave interval, and preset CRUD.

Current canonical/UI references:

- `docs/README.md` - docs role/lifecycle index for canonical, active, and historical records
- `docs/plan-ui-remediation-2026-03-06.md` - current canonical UI/spec baseline
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` - no-regression baseline for file/realtime/detail/settings while workspace features expand
- `docs/plan-platform-expansion-rollout-2026-03-10.md` - additive platform expansion / rollout / rollback baseline
- `docs/plan-feature-backend-binding-2026-03-10.md` - backend profile / feature binding architecture baseline for summary, translate, QA, and future TTS
- `docs/plan-summary-feature-2026-03-11.md` - realtime/full summary feature spec baseline
- `docs/plan-operator-feature-activation-2026-03-11.md` - current execution plan for internal operator activation and summary/translate vertical slices
- `docs/knowledge/README.md` - durable knowledge index and current documentation entry points
- `docs/todo-workflow.md` - repo-local todo lifecycle, completion policy, and plan/review/verify rules
- Current active execution plan: `docs/plan-operator-feature-activation-2026-03-11.md`
- Current active execution board: `docs/todo/2026-03-11-operator-feature-activation-loop/README.md`
- `docs/plan-summary-backend-2026-03-11.md` - latest completed execution plan for summary/backend settings work
- `docs/todo/2026-03-11-summary-backend-loop/README.md` - latest completed execution board
- `docs/plan-review-remediation-2026-03-08.md` - previous completed execution plan
- `docs/todo/2026-03-08-contract-ux-loop/README.md` - previous completed execution board
- `webapp/docs/IMPLEMENTATION_NOTES.md` - implementation snapshot and code-level notes

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
- `PRONAIA_API_BASE` – upstream RTZR API base URL (defaults to `https://openapi.vito.ai`).
  - The Python API now routes cloud traffic through the official SDK packages: `rtzr` for the public endpoint and `rtzr-internal` when `PRONAIA_API_BASE` points at `dev-openapi.vito.ai` or `sandbox-openapi.vito.ai`.
- `STT_DEPLOYMENT` – `cloud` (default) or `onprem`, adjusts the upstream endpoint paths.
- `STT_VERIFY_SSL` – set to `0` to ignore TLS verification when connecting to on-prem deployments.
- `BACKEND_ADMIN_ENABLED` – set to `1` to enable `/v1/backend/*` runtime override endpoints.
- `BACKEND_ADMIN_TOKEN` – required when backend admin is enabled; callers must send `X-Malsori-Admin-Token`.
- `STT_STORAGE_PERSISTENT` – set to `1` when `STT_STORAGE_BASE_DIR` is backed by persistent storage (PVC).

Example launch:

```bash
export STT_STORAGE_BASE_DIR=$HOME/malsori-data
export PRONAIA_CLIENT_ID=your-client-id
export PRONAIA_CLIENT_SECRET=your-client-secret
uvicorn api_server.main:app --host 0.0.0.0 --port 8000
```

The FastAPI app exposes `/docs` for interactive testing, `/v1/health` for operational health checks, `/v1/transcribe` for batch jobs, `/v1/streaming` for realtime WebSocket relay, and `/v1/observability/runtime-error` for browser runtime error telemetry.  
For cloud deployment, the relay consumes the browser `start` payload, opens upstream with query parameters from `decoder_config`, returns a local `ready` ack, streams binary audio, and maps browser `final` to upstream `EOS`. Backend override endpoints under `/v1/backend/*` are intended for internal-network operations, are disabled by default, and require admin token auth when enabled.
Production ingress should split public/internal surfaces: keep user routes (`/v1/health`, `/v1/transcribe*`, `/v1/streaming`, `/v1/cloud/google/*`) public, and expose `/v1/backend/*` + `/v1/observability/runtime-error` on internal ingress only.

#### Proxy Contract Mapping

| Browser call (to Python API) | Malsori proxy behavior | Upstream RTZR target |
|---|---|---|
| `POST /v1/transcribe` (file + `config`) | Forwards multipart request, normalizes `id/transcribe_id`, persists uploaded audio artifact | Cloud/onprem transcribe endpoint (`transcribe_path`) |
| `GET /v1/transcribe/{id}` | Forwards status lookup, normalizes segment payloads | Cloud/onprem status endpoint (`transcribe_status_path`) |
| `GET /v1/transcribe/{id}/audio` | Returns **Malsori-local stored artifact** from `STT_STORAGE_BASE_DIR`; does not proxy RTZR download on demand | N/A (local file serving route) |
| `WS /v1/streaming` (cloud) | Consumes first browser `start`, converts `decoder_config` to query params, sends local `ready`, relays binary audio, maps browser `final/stop/eos` to upstream `EOS` | RTZR websocket streaming path (`streaming_path`) |
| `WS /v1/streaming` (onprem) | Consumes first browser `start`, opens gRPC decoder stream, sends local `ready`, relays binary audio, half-closes on `final/stop/eos` | On-prem gRPC `OnlineDecoder.Decode` |

`/v1/transcribe/{id}/audio` and RTZR upstream `/download` are intentionally different contracts: the former is Malsori's local artifact endpoint for playback/export stability.

#### Google Drive OAuth (Auth Broker)

If you run the Python API, the repo supports an optional **Google Drive auth broker** mode for cloud sync. In this mode the backend stores the Google **refresh token** under `STT_STORAGE_BASE_DIR` and issues short-lived **access tokens** to the SPA (so the refresh token never lands in the browser).

The broker scopes stored tokens per browser session using an HttpOnly cookie (`malsori_gdrive_session`). Refresh tokens are stored under `STT_STORAGE_BASE_DIR/google_drive_oauth/`.

Environment variables:

- `GOOGLE_OAUTH_CLIENT_ID` – OAuth client ID (Google Cloud Console).
- `GOOGLE_OAUTH_CLIENT_SECRET` – OAuth client secret.
- `GOOGLE_OAUTH_REDIRECT_URI` – must point to the API callback URL, e.g. `https://<host>/v1/cloud/google/oauth/callback`.
- `GOOGLE_OAUTH_SCOPES` – optional space-delimited scopes (defaults to `drive.file openid email profile`).
- `GOOGLE_OAUTH_STATE_SECRET` – optional HMAC secret for stateless OAuth state signing (defaults to client secret).
- `GOOGLE_OAUTH_ALLOW_EPHEMERAL_STORAGE` – optional (`1`) dev-only bypass for non-persistent storage.

Once configured, use the “Connect Google Drive” button in the webapp; the API endpoints live under `/v1/cloud/google/*`.

### Connecting the webapp to the Python API

The React app talks only to the Python proxy. The canonical public API base is same-origin root (`/`), which means the SPA requests endpoints such as `/v1/health`, `/v1/transcribe`, and `/v1/streaming`.

When you run `npm run dev`, Vite proxies `/v1/*` to `http://localhost:8000` by default, so the “Python API Base URL” can be left at its default value `/` (**설정 → 환경 설정**). If the proxy runs elsewhere, set the value to a full URL or adjust the Vite proxy target. The `/api/*` dev proxy remains only as a legacy alias for older local settings.

Helm deployments provide `/config/malsori-config.js` (via ConfigMap) for runtime webapp settings. Set `webapp.apiBaseUrl` when you want the SPA to target an ingress API host, and use flags like `webapp.runtimeErrorReportingEnabled` for runtime behavior control.

### Useful Scripts

- `npm run lint` – ESLint over the entire project.
- `npm --prefix webapp run i18n:check` – translation key usage/definition consistency check.
- `npm run build` – Type-check and bundle the production output.
- `npm test` – Vitest unit tests (repositories, hooks, audio utilities).
- `npm --prefix webapp run bundle:check` – web bundle gate (chunk/entry/total size thresholds + chunk import cycle detection).
- `node scripts/check-todo-board-consistency.mjs` – todo board 상태와 task 문서 체크리스트 정합성 게이트.
- `./scripts/post-deploy-smoke.sh` – deployment smoke checks (rollout + SPA routes + cache/service-worker contract + API contract + optional UI smoke). Use `INTERNAL_BASE_URL` to validate internal admin routes, `EXPECT_RUNTIME_ERROR_PUBLIC_BLOCKED=1` (default) to enforce public block policy for runtime-error ingestion, `EXPECT_TRANSLATE_ROUTE_MODE=redirect|enabled|skip` to validate `/translate`, and `EXPECT_SESSION_ARTIFACTS_MODE=hidden|visible|skip` to validate additive detail rails. When backend admin is enabled, the smoke also checks `/v1/backend/profiles`, `/v1/backend/bindings`, and `/v1/backend/capabilities` on the internal surface. UI smoke verifies detail empty/ready states for both legacy and additive routes by default (seeded fixture); set `DETAIL_SMOKE_ID=<id>` to override with a real record id.

## QA & CI

- Vitest runs with a jsdom environment and `fake-indexeddb` so Dexie code can be exercised.
- New unit tests cover preset repository default handling and `useTranscriptions` ordering in addition to existing repository specs.
- GitHub Actions workflow (`.github/workflows/ci.yml`) now has distinct jobs for todo-board consistency, the React frontend (npm install/lint/build/test + bundle budget check), and the FastAPI proxy (uv sync + `python -m compileall`) so board/doc workflow and both deliverables are exercised on every push/PR.

## Repository Layout

- `webapp/` – main SPA source code, configuration, and tests.
- `docs/knowledge/` – durable product and architecture knowledge.
- `.github/workflows/ci.yml` – project CI pipeline.
- `AGENTS.md`, `LICENSE` – auxiliary metadata.

## Documentation

- `docs/README.md` – docs role/lifecycle index for canonical, active, and historical records.
- `docs/todo-workflow.md` – repo-local todo lifecycle, completion policy, and entry-doc sync rules.
- `docs/todo-template/README.md` – templates for new plan/board/task docs.
- `webapp/README.md` – application overview and local usage instructions.
- `docs/ops-service-worker-cache-playbook.md` – 서비스워커 캐시 정책/릴리즈 검증/장애 대응 절차.
- `docs/plan-ui-remediation-2026-03-06.md` – current canonical UI/spec baseline.
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` – no-regression baseline for core file/realtime/detail/settings flows.
- `docs/plan-platform-expansion-rollout-2026-03-10.md` – additive platform expansion rollout / migration / rollback baseline.
- `docs/plan-feature-backend-binding-2026-03-10.md` – backend profile / feature binding architecture baseline.
- `docs/plan-summary-feature-2026-03-11.md` – summary feature spec for realtime/full summary, contiguous partitioning, presets, and UX.
- `docs/plan-operator-feature-activation-2026-03-11.md` – current execution plan for operator-managed backend activation and summary/translate implementation.
- `docs/knowledge/README.md` – durable knowledge index.
- `docs/knowledge/operator-feature-activation-contract.md` – durable operator activation order and boundary rules.
- `docs/knowledge/summary-feature-contract.md` – stable summary terminology and invariants.
- Current active execution plan: `docs/plan-operator-feature-activation-2026-03-11.md`.
- Current active execution board: `docs/todo/2026-03-11-operator-feature-activation-loop/README.md`.
- `docs/plan-summary-backend-2026-03-11.md` – latest completed execution plan for summary/backend settings work.
- `docs/todo/2026-03-11-summary-backend-loop/README.md` – latest completed execution board.
- `docs/plan-review-remediation-2026-03-08.md` – previous completed execution plan.
- `docs/todo/2026-03-08-contract-ux-loop/README.md` – previous completed execution board.
- `webapp/docs/IMPLEMENTATION_NOTES.md` – implementation snapshot, current references, and code-level notes.

### Agent Workloop Policy

- Stable product/ops/spec docs stay under `docs/`.
- Agent execution notes, temporary TODO loops, self-review logs, and implementation scratch plans are local-only and live under `.codex/workloops/`.
- `.codex/workloops/` is gitignored by default; promote only stable conclusions into committed docs when they become part of the repo's long-lived truth.
