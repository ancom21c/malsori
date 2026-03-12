# Project Spec

## Summary

Malsori is a browser-based RTZR speech-to-text workstation. The repo currently ships a Vite/React SPA in `webapp/`, a FastAPI proxy in `python_api/`, and deployment assets under `infra/`.

## Goals

- Support reliable realtime recording/transcription and file transcription from the same operator-facing webapp.
- Keep the browser contract stable even as upstream RTZR integration, deployment topology, or storage details evolve.
- Preserve operator-grade boundaries for internal/admin functions, observability, and cloud sync credentials.
- Keep durable repo truth easy to find and separate from finished execution history.

## Non-goals

- Running the SPA as a direct RTZR client without the Malsori proxy boundary.
- Treating completed plans, task logs, or ad hoc work notes as current source of truth.

## Users / Stakeholders

- Operators using the workstation for realtime capture, job submission, playback, export, and settings management.
- Developers and maintainers shipping the SPA, the Python proxy, and the deployment/runtime policy together.

## Surfaces / Interfaces

- `webapp/`: Vite + React + TypeScript SPA served at `/`
- `python_api/`: FastAPI proxy exposing `/v1/*`, `/docs`, and optional internal admin/runtime-error endpoints
- `infra/`: Helm chart and deploy assets for ingress/runtime configuration

## Constraints

- The SPA talks only to the Python proxy. Same-origin `/v1/*` is the canonical public API boundary, and Vite dev proxies those calls to `http://localhost:8000`.
- Public and internal ingress surfaces must stay split. User routes stay public; `/v1/backend/*` and `/v1/observability/runtime-error` are internal-only by policy.
- Storage and auth flows assume server-side control for persisted audio artifacts and optional Google Drive refresh tokens.
- Node.js 20.19.0 or newer is required for the Vite frontend toolchain.

## Verification

- Docs and loop consistency: `node scripts/check-todo-board-consistency.mjs`
- Frontend quality gate: `npm --prefix webapp run lint`
- Frontend i18n gate: `npm --prefix webapp run i18n:check`
- Frontend build gate: `npm --prefix webapp run build`
- Frontend bundle gate: `npm --prefix webapp run bundle:check`
- Frontend tests: `npm --prefix webapp run test`
- Python syntax check: `python -m compileall python_api/api_server`
- Python tests: `PYTHONPATH=python_api pytest python_api/tests -q`
- Deployment smoke: `./scripts/post-deploy-smoke.sh`
