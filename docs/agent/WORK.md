## 2026-03-12: Fallback admin API base to public API in local operator flows

### Goal
- Stop the Settings operator UI from blocking local docker users on a blank admin API base when the public API base should be reused.

### Done (acceptance)
- Operator/admin API calls fall back to the public API base when no separate admin base is configured.
- Local docker webapp builds receive both `VITE_API_BASE` and `VITE_ADMIN_API_BASE`.
- Copy explains that leaving the admin base blank reuses the Python API base.

### Plan
- Add a shared admin-base fallback helper and use it in the Settings/operator client path.
- Wire local docker build args so the webapp starts with `/api` for both public/admin bases.
- Validate targeted frontend tests, lint/types, shell syntax, compose rendering, and diff sanity.

### Validation (commands to run)
- `npm --prefix webapp test -- src/services/api/rtzrApiClient.test.ts src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts src/services/observability/runtimeErrorReporter.test.ts`
- `npm run lint -- src/pages/SettingsPage.tsx src/services/api/ApiClientProvider.tsx src/utils/baseUrl.ts src/i18n/translations.ts src/services/observability/runtimeErrorReporter.ts`
- `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false`
- `bash -n infra/deploy/run-malsori-docker.sh`
- `BACKEND_ADMIN_ENABLED=1 BACKEND_ADMIN_TOKEN_REQUIRED=0 VITE_API_BASE=/api VITE_ADMIN_API_BASE=/api docker compose -f infra/docker-compose/docker-compose.yml config`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `infra/deploy/run-malsori-docker.sh`
- `infra/docker-compose/docker-compose.yml`
- `webapp/Dockerfile`
- `webapp/src/i18n/translations.ts`
- `webapp/src/pages/SettingsPage.tsx`
- `webapp/src/services/api/ApiClientProvider.tsx`
- `webapp/src/utils/baseUrl.ts`

### Self-review
- Diff reviewed: yes
- Validation: `npm --prefix webapp test -- src/services/api/rtzrApiClient.test.ts src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts src/services/observability/runtimeErrorReporter.test.ts` -> PASS
- Validation: `npm run lint -- src/pages/SettingsPage.tsx src/services/api/ApiClientProvider.tsx src/utils/baseUrl.ts src/i18n/translations.ts src/services/observability/runtimeErrorReporter.ts` (from `webapp/`) -> PASS
- Validation: `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false` -> PASS
- Validation: `bash -n infra/deploy/run-malsori-docker.sh` -> PASS
- Validation: `BACKEND_ADMIN_ENABLED=1 BACKEND_ADMIN_TOKEN_REQUIRED=0 VITE_API_BASE=/api VITE_ADMIN_API_BASE=/api docker compose -f infra/docker-compose/docker-compose.yml config` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: the operator UI was using a separate admin base value with no fallback, while the local docker webapp build also wasn't receiving Vite API base args. Blank admin settings now reuse the Python API base at runtime, and the local docker build now seeds both public/admin bases to `/api`.

## 2026-03-12: Normalize Settings page panel curvature

### Goal
- Fix the Settings page panel/card curvature so nested blocks stop inheriting oversized rounded corners from the global console theme.

### Done (acceptance)
- Settings page section wrappers, cards, and inset panels use explicit pixel radii instead of theme-multiplied numeric radii.
- The overview/context blocks no longer render as oversized rounded pills.
- Validation confirms the updated page compiles and passes targeted frontend checks.

### Plan
- Identify Settings page containers still using numeric `borderRadius` values under the global 20px theme radius.
- Replace them with a tighter page-local radius scale and keep the existing layout/hierarchy intact.
- Run targeted Vitest/lint/type checks and record the result.

### Validation (commands to run)
- `npm --prefix webapp test -- src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts`
- `npm run lint -- src/pages/SettingsPage.tsx src/components/studio/ContextCard.tsx src/components/BackendBindingOperatorPanel.tsx`
- `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `webapp/src/components/BackendBindingOperatorPanel.tsx`
- `webapp/src/components/studio/ContextCard.tsx`
- `webapp/src/pages/SettingsPage.tsx`

### Self-review
- Diff reviewed: yes
- Validation: `npm --prefix webapp test -- src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts` -> PASS
- Validation: `npm run lint -- src/pages/SettingsPage.tsx src/components/studio/ContextCard.tsx src/components/BackendBindingOperatorPanel.tsx` (from `webapp/`) -> PASS
- Validation: `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: the page was relying on numeric `borderRadius` values while the global console theme sets `shape.borderRadius=20`, so those numbers expanded to very large radii. This change fixes the Settings surface by pinning explicit pixel radii, but other screens using numeric radii under the same theme may still need the same audit later.

## 2026-03-12: Enable backend operator API without token in local docker deploy

### Goal
- Make `infra/deploy/run-malsori-docker.sh` bring up the local docker stack with backend operator APIs enabled and admin token auth disabled by default.

### Done (acceptance)
- The local deploy script exports backend admin env vars for docker compose.
- The docker compose Python API service forwards those env vars into the container.
- Validation confirms the shell script and compose config remain valid.

### Plan
- Add the local deploy defaults in `run-malsori-docker.sh`.
- Wire the Python API compose service to consume `BACKEND_ADMIN_ENABLED` and `BACKEND_ADMIN_TOKEN_REQUIRED`.
- Validate with shell syntax, compose config rendering, and diff sanity checks.

### Validation (commands to run)
- `bash -n infra/deploy/run-malsori-docker.sh`
- `docker compose -f infra/docker-compose/docker-compose.yml config`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `infra/deploy/run-malsori-docker.sh`
- `infra/docker-compose/docker-compose.yml`

### Self-review
- Diff reviewed: yes
- Validation: `bash -n infra/deploy/run-malsori-docker.sh` -> PASS
- Validation: `docker compose -f infra/docker-compose/docker-compose.yml config` -> PASS
- Validation: `BACKEND_ADMIN_ENABLED=1 BACKEND_ADMIN_TOKEN_REQUIRED=0 docker compose -f infra/docker-compose/docker-compose.yml config` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: `infra/deploy/run-malsori-docker.sh` is gitignored local-only deploy glue, so the repo diff tracks the compose/documentation side but not the script itself. Compose still defaults to secure values (`0/1`) when those env vars are absent; the local deploy script overrides them to `1/0`.

## 2026-03-12: Optional backend admin token mode

### Goal
- Implement an option that lets backend operator APIs run without `X-Malsori-Admin-Token` when the server is explicitly configured to allow it.

### Done (acceptance)
- Python API exposes a `BACKEND_ADMIN_TOKEN_REQUIRED` option and skips token validation when it is disabled.
- `/v1/health` reports whether backend admin token auth is required.
- Settings operator UI/API flow only blocks on an admin token when the server says the token is required.
- Regression tests cover backend guard behavior and frontend health parsing/header behavior.

### Plan
- Add the backend config flag and thread it through the admin guard + health response.
- Update frontend health types, API client, and Settings gating/copy to support optional admin tokens.
- Add focused Python/Vitest tests, validate, and leave the change uncommitted because the worktree is already dirty.

### Validation (commands to run)
- `python -m compileall python_api/api_server`
- `PYTHONPATH=python_api pytest python_api/tests -q`
- `npm --prefix webapp test -- src/services/api/rtzrApiClient.test.ts src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts`
- `npm run lint -- src/pages/SettingsPage.tsx src/pages/settingsBackendRuntimeModel.ts src/pages/settingsBackendRuntimeModel.test.ts src/services/api/rtzrApiClient.ts src/services/api/rtzrApiClient.test.ts src/services/api/types.ts src/i18n/translations.ts`
- `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false`
- `npm --prefix webapp run i18n:check`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `README.md`
- `python_api/api_server/config.py`
- `python_api/api_server/main.py`
- `python_api/api_server/models.py`
- `python_api/tests/test_backend_admin.py`
- `webapp/src/i18n/translations.ts`
- `webapp/src/pages/SettingsPage.tsx`
- `webapp/src/services/api/rtzrApiClient.ts`
- `webapp/src/services/api/rtzrApiClient.test.ts`
- `webapp/src/services/api/types.ts`

### Self-review
- Diff reviewed: yes
- Validation: `python -m compileall python_api/api_server` -> PASS
- Validation: `PYTHONPATH=python_api pytest python_api/tests -q` -> PASS
- Validation: `npm --prefix webapp test -- src/services/api/rtzrApiClient.test.ts src/pages/settingsBackendRuntimeModel.test.ts src/pages/settingsBackendFormModel.test.ts` -> PASS
- Validation: `npm run lint -- src/pages/SettingsPage.tsx src/pages/settingsBackendRuntimeModel.ts src/pages/settingsBackendRuntimeModel.test.ts src/services/api/rtzrApiClient.ts src/services/api/rtzrApiClient.test.ts src/services/api/types.ts src/i18n/translations.ts` (from `webapp/`) -> PASS
- Validation: `./webapp/node_modules/.bin/tsc -p webapp/tsconfig.json --noEmit --pretty false` -> PASS
- Validation: `npm --prefix webapp run i18n:check` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: rebased `feature/update-rtzr-library` onto `main` after fast-forwarding local `main` to `origin/main` (`ddbe777` on 2026-03-12) and reapplied the optional-token work against the updated operator UI/runtime model. `ruff` is not installed in the current shell, so Python linting could not be executed here. `python_api/tests/test_backend_admin.py` stubs FastAPI's multipart dependency check at import time so the guard logic can be tested without changing the local Python environment.

## 2026-03-12: Local pip injection for dockerized private RTZR packages

### Goal
- Let `infra/deploy/run-malsori-docker.sh` build the Python API image with local `~/.pip` configuration so private `rtzr-internal` installs can resolve during Docker builds.

### Done (acceptance)
- The dockerized Python API build can see a temporary copy of local `~/.pip` when launched through `run-malsori-docker.sh`.
- The copied pip config stays out of git and is cleaned up after the script exits.
- Dockerfile changes remain safe when the helper script is not used.

### Plan
- Add a gitignored placeholder directory inside the Docker build context for temporary pip config.
- Update the Python API Dockerfile to copy that directory into `/root/.pip/` before `pip install .`.
- Update `run-malsori-docker.sh` to stage `~/.pip` into the temp directory for the duration of the compose build, then validate the script and compose file.

### Validation (commands to run)
- `bash -n infra/deploy/run-malsori-docker.sh`
- `docker compose -f infra/docker-compose/docker-compose.yml config`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `.gitignore`
- `infra/deploy/run-malsori-docker.sh`
- `infra/docker-compose/docker-build/python-api-pip/.gitkeep`
- `python_api/Dockerfile`

### Self-review
- Diff reviewed: yes
- Validation: `bash -n infra/deploy/run-malsori-docker.sh` -> PASS
- Validation: `docker compose -f infra/docker-compose/docker-compose.yml config` -> PASS
- Validation: `docker compose -f infra/docker-compose/docker-compose.yml build python-api` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: compose emits an existing warning that `version:` in `infra/docker-compose/docker-compose.yml` is obsolete. The temporary pip staging directory was cleaned back down to `.gitkeep` after the build. The worktree already had unrelated modified/untracked files before or during this task, so this change is intentionally left uncommitted.

## 2026-03-12: RTZR SDK package migration for Python API

### Goal
- Update the Python RTZR client path to use `rtzr` for public cloud endpoints and `rtzr-internal` for dev/sandbox endpoints without breaking the current browser-facing API contract.

### Done (acceptance)
- `python_api` declares `rtzr` and `rtzr-internal` dependencies.
- Cloud batch/status/streaming auth + endpoint resolution are routed through the RTZR SDK packages.
- Dev/sandbox cloud endpoints select `rtzr-internal`, while existing `onprem` gRPC bridging remains intact.
- Python-side validation covers SDK target selection and request shaping without hitting the network.

### Plan
- Add the SDK dependencies and document the package selection behavior.
- Refactor `python_api/api_server/stt_client.py` to wrap the official SDK clients for cloud traffic and keep the existing on-prem bridge.
- Add focused Python tests for SDK routing and request normalization, then run validation and review the diff.

### Validation (commands to run)
- `python -m compileall python_api/api_server`
- `PYTHONPATH=python_api pytest python_api/tests -q`
- `git diff --check`

### Expected changes
- `docs/agent/WORK.md`
- `README.md`
- `python_api/pyproject.toml`
- `python_api/api_server/stt_client.py`
- `python_api/tests/test_stt_client.py`

### Self-review
- Diff reviewed: yes
- Validation: `python -m compileall python_api/api_server` -> PASS
- Validation: `PYTHONPATH=python_api pytest python_api/tests -q` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: `ruff` is not installed in the current shell, so linting could not be executed here. Pytest emits one existing `pydub`/`audioop` deprecation warning from the installed dependency stack.

## 2026-03-09: Reset history with local-only deploy assets removed

### Goal
- Remove local-only deploy helpers from tracked history and reinitialize upstream with a single clean commit.

### Done (acceptance)
- `.codex/skills/malsori-local-deployer/` is ignored and removed from tracked files.
- `infra/deploy/values.malsori.example.yaml` uses generic example placeholders instead of `malsori.ancom.duckdns.org`.
- A local-only Docker helper lives at `infra/deploy/run-malsori-docker.sh` and stays gitignored.
- `main` history is rewritten to a single root commit and pushed to `origin/main`.

### Plan
- Update ignore rules and deployment example values.
- Remove tracked local-only helper files.
- Create the ignored local deploy script copy under `infra/deploy/`.
- Validate Helm values and shell syntax, review the diff, then rewrite and force-push history.

### Validation (commands to run)
- `helm lint infra/charts/malsori -f infra/deploy/values.malsori.example.yaml`
- `bash -n infra/deploy/run-malsori-docker.sh`
- `git diff --check`

### Expected changes
- `.gitignore`
- `infra/deploy/values.malsori.example.yaml`
- `docs/agent/WORK.md`
- `.codex/skills/malsori-local-deployer/*`

### Self-review
- Diff reviewed: yes
- Validation: `helm lint infra/charts/malsori -f infra/deploy/values.malsori.example.yaml` -> PASS
- Validation: `bash -n infra/deploy/run-malsori-docker.sh` -> PASS
- Validation: `git diff --check` -> PASS
- Notes/Risks: `build/run-malsori-docker.sh` was already untracked, so the commit only adds ignore coverage and the local-only replacement path.
