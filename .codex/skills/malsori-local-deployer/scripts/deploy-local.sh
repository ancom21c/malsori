#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../../../.. && pwd)"
NAMESPACE="malsori"
RELEASE_NAME="malsori"
CHART_PATH="infra/charts/malsori"
VALUES_FILE="${VALUES_FILE:-infra/deploy/values.malsori.yaml}"

for cmd in docker kubectl helm git; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
done

if [[ -z "${REGISTRY:-}" ]]; then
  echo "REGISTRY is required (example: export REGISTRY=registry.cube.local:5000)" >&2
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/${VALUES_FILE}" ]]; then
  echo "Values file not found: ${ROOT_DIR}/${VALUES_FILE}" >&2
  exit 1
fi

pushd "${ROOT_DIR}" >/dev/null

echo "[1/4] Building and pushing images with DEV_BUILD=2"
DEV_BUILD=2 ./scripts/build-images.sh

echo "[2/4] Ensuring namespace ${NAMESPACE}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

echo "[3/4] Deploying Helm release ${RELEASE_NAME}"
helm upgrade --install "${RELEASE_NAME}" "./${CHART_PATH}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  -f "${VALUES_FILE}"

DEPLOYMENT_NAME="$(kubectl -n "${NAMESPACE}" get deploy -l "app.kubernetes.io/instance=${RELEASE_NAME}" -o jsonpath='{.items[0].metadata.name}')"
if [[ -z "${DEPLOYMENT_NAME}" ]]; then
  echo "No deployment found for release ${RELEASE_NAME} in namespace ${NAMESPACE}" >&2
  exit 1
fi

echo "[4/5] Restarting deployment to pick up new :dev images and secret changes"
kubectl -n "${NAMESPACE}" rollout restart "deployment/${DEPLOYMENT_NAME}"

echo "[5/5] Waiting for rollout and printing status"
kubectl -n "${NAMESPACE}" rollout status "deployment/${DEPLOYMENT_NAME}" --timeout=300s
helm -n "${NAMESPACE}" status "${RELEASE_NAME}"
kubectl -n "${NAMESPACE}" get pods,svc,ingress

popd >/dev/null
