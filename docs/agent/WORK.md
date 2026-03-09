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
