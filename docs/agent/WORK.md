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
