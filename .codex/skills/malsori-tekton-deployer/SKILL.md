---
name: malsori-tekton-deployer
description: "Trigger the Tekton release pipeline for Malsori and wait for Argo CD to converge. Use when the user wants to deploy the committed revision of this repository to the home k3s cluster via Tekton and Argo CD, specifically pipeline `malsori-release` and app `malsori`."
---

# Malsori Tekton Deployer

Use this skill for the normal cluster release path. Tekton builds and pushes the image to `registry.cube.local:5000`, updates `cluster-administrator`, and Argo CD applies the resulting desired state.

## Use When

- You want to deploy the current committed repo state to the home k3s cluster.
- You want the standard GitOps path instead of ad-hoc `helm upgrade`.

## Do Not Use When

- You only need a local dev server or non-cluster verification.
- You need a break-glass manual Helm intervention. That should stay exceptional and be followed by GitOps reconciliation.

## Workflow

1. Move to the repo root.
2. Resolve `APP_REVISION` from `git rev-parse HEAD` unless explicitly provided.
3. Warn if the worktree is dirty, because uncommitted changes are not included.
4. Create a `PipelineRun` for `malsori-release`.
5. Wait for the Tekton run to finish and surface `PipelineRun` and `TaskRun` status on failure.
6. Wait for Argo CD app `malsori` to return to `Synced` and `Healthy`.
7. Report the deployed revision, resolved image tag, `PipelineRun` name, and final Argo CD status.

Use the bundled script for the canonical path:

```bash
./.codex/skills/malsori-tekton-deployer/scripts/run-release.sh
```

## Inputs (Environment Variables)

- `APP_REVISION` (default: current `HEAD`)
- `IMAGE_TAG` (default: `auto`, resolved by Tekton to `git-<12-char-sha>`)
- `TEKTON_NAMESPACE` (default: `tekton-pipelines`)
- `ARGOCD_NAMESPACE` (default: `argocd`)
- `WAIT_SECONDS` (default: `1800`)
- `POLL_SECONDS` (default: `5`)

## Required Tools

- `git`
- `kubectl`

## Manual Fallback

If the script cannot be used, create the same `PipelineRun` manually and watch both systems:

```bash
cd /path/to/malsori
APP_REVISION="${APP_REVISION:-$(git rev-parse HEAD)}"

kubectl create -f - <<EOF
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: malsori-release-
  namespace: tekton-pipelines
spec:
  pipelineRef:
    name: malsori-release
  params:
    - name: app-revision
      value: ${APP_REVISION}
    - name: image-tag
      value: ${IMAGE_TAG:-auto}
  workspaces:
    - name: app-source
      emptyDir: {}
    - name: gitops-source
      emptyDir: {}
EOF

kubectl get pipelineruns -n tekton-pipelines
kubectl get application malsori -n argocd
```

## Reporting

After execution, report:

1. `PipelineRun` name and final Tekton result
2. Deployed revision and resolved image tag
3. Final Argo CD app status
