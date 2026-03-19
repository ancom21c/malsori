#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "${repo_root}"

tekton_namespace="${TEKTON_NAMESPACE:-tekton-pipelines}"
argocd_namespace="${ARGOCD_NAMESPACE:-argocd}"
pipeline_name="${PIPELINE_NAME:-malsori-release}"
argocd_app_name="${ARGOCD_APP_NAME:-malsori}"
app_revision="${APP_REVISION:-$(git rev-parse HEAD)}"
image_tag_input="${IMAGE_TAG:-auto}"
wait_seconds="${WAIT_SECONDS:-1800}"
poll_seconds="${POLL_SECONDS:-5}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_cmd git
require_cmd kubectl

if [ -n "$(git status --porcelain)" ]; then
  echo "[malsori-tekton-deployer] warning: working tree is dirty; deploy uses committed revision ${app_revision}" >&2
fi

resolved_tag="${image_tag_input}"
if [ -z "${resolved_tag}" ] || [ "${resolved_tag}" = "auto" ]; then
  resolved_tag="git-$(printf '%.12s' "${app_revision}")"
fi

echo "[malsori-tekton-deployer] repo=${repo_root}"
echo "[malsori-tekton-deployer] pipeline=${pipeline_name} app=${argocd_app_name}"
echo "[malsori-tekton-deployer] revision=${app_revision} image_tag=${resolved_tag}"

kubectl get pipeline "${pipeline_name}" -n "${tekton_namespace}" >/dev/null
kubectl get application "${argocd_app_name}" -n "${argocd_namespace}" >/dev/null

pipeline_run_name="$(kubectl create -f - -o jsonpath='{.metadata.name}' <<EOF
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: ${pipeline_name}-
  namespace: ${tekton_namespace}
spec:
  pipelineRef:
    name: ${pipeline_name}
  params:
    - name: app-revision
      value: ${app_revision}
    - name: image-tag
      value: ${image_tag_input}
  workspaces:
    - name: app-source
      emptyDir: {}
    - name: gitops-source
      emptyDir: {}
EOF
)"

echo "[malsori-tekton-deployer] created PipelineRun ${pipeline_run_name}"

deadline=$((SECONDS + wait_seconds))
while :; do
  reason="$(kubectl get pipelinerun "${pipeline_run_name}" -n "${tekton_namespace}" -o jsonpath='{.status.conditions[?(@.type=="Succeeded")].reason}')"
  case "${reason}" in
    Succeeded)
      break
      ;;
    Failed|PipelineRunCancelled|Cancelled|StoppedRunFinally|PipelineRunTimeout|TaskRunTimeout)
      echo "[malsori-tekton-deployer] PipelineRun failed with reason=${reason}" >&2
      kubectl get pipelinerun "${pipeline_run_name}" -n "${tekton_namespace}" -o wide >&2 || true
      kubectl get taskruns -n "${tekton_namespace}" -l tekton.dev/pipelineRun="${pipeline_run_name}" >&2 || true
      exit 1
      ;;
  esac

  if [ "${SECONDS}" -ge "${deadline}" ]; then
    echo "[malsori-tekton-deployer] timed out waiting for PipelineRun ${pipeline_run_name}" >&2
    kubectl get pipelinerun "${pipeline_run_name}" -n "${tekton_namespace}" -o wide >&2 || true
    exit 1
  fi

  sleep "${poll_seconds}"
done

echo "[malsori-tekton-deployer] PipelineRun succeeded; waiting for Argo CD app ${argocd_app_name}"

deadline=$((SECONDS + wait_seconds))
while :; do
  sync_status="$(kubectl get application "${argocd_app_name}" -n "${argocd_namespace}" -o jsonpath='{.status.sync.status}')"
  health_status="$(kubectl get application "${argocd_app_name}" -n "${argocd_namespace}" -o jsonpath='{.status.health.status}')"
  echo "[malsori-tekton-deployer] argocd sync=${sync_status} health=${health_status}"

  if [ "${sync_status}" = "Synced" ] && [ "${health_status}" = "Healthy" ]; then
    break
  fi

  if [ "${SECONDS}" -ge "${deadline}" ]; then
    echo "[malsori-tekton-deployer] timed out waiting for Argo CD app ${argocd_app_name}" >&2
    kubectl get application "${argocd_app_name}" -n "${argocd_namespace}" -o wide >&2 || true
    exit 1
  fi

  sleep "${poll_seconds}"
done

echo "[malsori-tekton-deployer] done revision=${app_revision} image_tag=${resolved_tag}"
