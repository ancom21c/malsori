---
name: malsori-tekton-deployer
description: "Submit Malsori releases to the live release broker API and wait for the broker to report terminal status. Use when the user wants to deploy the committed revision of this repository to the home k3s cluster through the standard shared-cluster release path."
---

# Malsori Release Broker Deployer

Use this skill for the normal cluster release path. The repo-local wrapper submits a `malsori/default` release request to `https://deployer.ancom.duckdns.org`, waits for the broker to reach a terminal phase, and reports the final release record.

## Use When

- You want to deploy the current committed repo state to the home k3s cluster.
- You want the standard GitOps path instead of ad-hoc manual cluster actions.

## Do Not Use When

- You only need a local build, local container run, or non-cluster verification.
- You need a break-glass manual intervention. That should stay exceptional and be followed by GitOps reconciliation.

## Workflow

1. Move to the repo root.
2. Resolve `APP_REVISION` from `git rev-parse HEAD` unless explicitly provided.
3. Warn if the worktree is dirty, because uncommitted changes are not included.
4. Submit the release request through the bundled broker wrapper.
5. Wait for the broker to drive Tekton, GitOps promotion, and Argo CD convergence.
6. Report the release outcome, resolved image tag, and final observed release record fields.

Use the bundled wrapper for the canonical path:

```bash
./.codex/skills/malsori-tekton-deployer/scripts/run-release.sh
```

## Inputs (Environment Variables)

- `APP_REVISION` (default: current `HEAD`)
- `IMAGE_TAG` (default: `auto`; omitted from the broker request unless explicitly set)
- `RELEASE_BROKER_URL` (default: `https://deployer.ancom.duckdns.org`)
- `RELEASE_BROKER_TOKEN`
- `RELEASE_BROKER_TOKEN_FILE` (default: `$HOME/.config/release-broker/tokens/malsori.token`)
- `RELEASE_BROKER_CHECK_ONLY` (default: `0`; set to `1` to validate token/app access without creating a release)
- `WAIT_SECONDS` (default: `1800`)
- `POLL_SECONDS` (default: `5`)

## Required Tools

- `git`
- `curl`
- `python3`

## Notes

- Uncommitted changes are ignored; the release broker deploys the committed revision from Gitea.
- The wrapper validates that the configured token may release `malsori/default` before it submits the request.

## Manual Fallback

```bash
cd /path/to/repo
APP_REVISION="${APP_REVISION:-$(git rev-parse HEAD)}"
RELEASE_BROKER_TOKEN="${RELEASE_BROKER_TOKEN:-$(tr -d '\r\n' < "$HOME/.config/release-broker/tokens/malsori.token")}"

curl -fsS \
  -H "Authorization: Bearer ${RELEASE_BROKER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"appId\":\"malsori\",\"target\":\"default\",\"revision\":\"${APP_REVISION}\"}" \
  https://deployer.ancom.duckdns.org/v1/releases
```

If you need a fixed image tag, include `"imageTag":"${IMAGE_TAG}"` in the JSON payload.

## Reporting

After execution, report:

1. Broker `requestId` and terminal phase
2. Deployed revision and resolved image tag
3. Promoted GitOps SHA and observed app revisions
