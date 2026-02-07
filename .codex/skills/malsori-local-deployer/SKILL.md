---
name: malsori-local-deployer
description: "Build and deploy this malsori repository to a local Kubernetes cluster in one fixed workflow. Use when the user asks to run local/prod-like deployment for this repo: execute `DEV_BUILD=2 ./scripts/build-images.sh`, then `helm upgrade --install malsori` into namespace `malsori` using a values file under `infra/deploy/`."
---

# Malsori Local Deployer

Run the repository-local deployment workflow with minimal variation.

## Workflow

1. Move to repository root.
2. Run `DEV_BUILD=2 ./scripts/build-images.sh`.
3. Ensure namespace `malsori` exists.
4. Deploy chart `./infra/charts/malsori` with the selected values file in `infra/deploy`.
5. Wait for rollout and report status.

Use the bundled script for consistency:

```bash
./.codex/skills/malsori-local-deployer/scripts/deploy-local.sh
```

## Required Inputs

- `REGISTRY` must be set before running (required by `scripts/build-images.sh`).
- `VALUES_FILE` can be optionally set; default is `infra/deploy/values.malsori.yaml`.

## Required Tools

Ensure these commands are available before running:

- `docker`
- `kubectl`
- `helm`
- `git`

## Manual Fallback

If script execution is blocked, run this exact sequence:

```bash
cd /path/to/malsori
DEV_BUILD=2 ./scripts/build-images.sh
kubectl create namespace malsori --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install malsori ./infra/charts/malsori \
  --namespace malsori \
  --create-namespace \
  -f infra/deploy/values.malsori.yaml
kubectl -n malsori rollout status deployment/malsori-malsori --timeout=300s
helm -n malsori status malsori
kubectl -n malsori get pods,svc,ingress
```

## Reporting

After execution, report:

1. Build/push success 여부
2. Helm release 결과 (`helm status`)
3. `malsori` 네임스페이스 리소스 상태 (`pods`, `svc`, `ingress`)
