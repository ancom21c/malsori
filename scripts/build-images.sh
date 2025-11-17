#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
REGISTRY="${REGISTRY:?Set REGISTRY to the target container registry (e.g. ghcr.io/your-org)}"
DEV_BUILD="${DEV_BUILD:-0}"
NEXT_PUBLIC_API_BASE="${NEXT_PUBLIC_API_BASE:-https://miminance.ancom.duckdns.org}"

pushd "${ROOT_DIR}" >/dev/null

SHORT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "workspace")"
FULL_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo "workspace")"

if [[ "${DEV_BUILD}" == "1" ]]; then
  USER_PART="${USER:-local}"
  TIMESTAMP="$(date -u +"%Y%m%d")"
  if git rev-parse HEAD >/dev/null 2>&1; then
    DIFF_HASH="$( { git diff --binary HEAD; git diff --binary --cached HEAD; git ls-files --others --exclude-standard | sort; } | sha1sum | awk '{print substr($1,1,8)}' )"
  else
    DIFF_HASH="$( { git diff --binary; git diff --binary --cached; git ls-files --others --exclude-standard | sort; } | sha1sum | awk '{print substr($1,1,8)}' )"
  fi
  [[ -z "${DIFF_HASH}" ]] && DIFF_HASH="clean"
  [[ -z "${TAG:-}" ]] && TAG="dev-${USER_PART}-${TIMESTAMP}"
  BUILD_TOKEN="${SHORT_COMMIT}-${DIFF_HASH}-${TIMESTAMP}"
else
  [[ -z "${TAG:-}" ]] && TAG="${SHORT_COMMIT}"
  BUILD_TOKEN="${FULL_COMMIT}"
fi

NEXT_PUBLIC_APP_VERSION="${NEXT_PUBLIC_APP_VERSION:-${TAG}}"

PYTHON_IMAGE="${REGISTRY}/malsori/api-server:${TAG}"
PYTHON_LATEST="${REGISTRY}/malsori/api-server:latest"
WEBAPP_IMAGE="${REGISTRY}/malsori/webapp:${TAG}"
WEBAPP_LATEST="${REGISTRY}/malsori/webapp:latest"

echo "Building python_api image -> ${PYTHON_IMAGE}"
docker build \
  --build-arg BUILD_SHA="${BUILD_TOKEN}" \
  -f python_api/Dockerfile \
  -t "${PYTHON_IMAGE}" \
  .

echo "Building webapp image -> ${WEBAPP_IMAGE}"
docker build \
  --build-arg NEXT_PUBLIC_API_BASE="${NEXT_PUBLIC_API_BASE}" \
  --build-arg NEXT_PUBLIC_APP_VERSION="${NEXT_PUBLIC_APP_VERSION}" \
  --build-arg BUILD_SHA="${BUILD_TOKEN}" \
  -f webapp/Dockerfile \
  -t "${WEBAPP_IMAGE}" \
  webapp

popd >/dev/null

echo "Pushing ${PYTHON_IMAGE}"
docker push "${PYTHON_IMAGE}"
echo "Pushing ${WEBAPP_IMAGE}"
docker push "${WEBAPP_IMAGE}"

if [[ "${DEV_BUILD}" != "1" ]]; then
  echo "Tagging latest images"
  docker tag "${PYTHON_IMAGE}" "${PYTHON_LATEST}"
  docker tag "${WEBAPP_IMAGE}" "${WEBAPP_LATEST}"
  docker push "${PYTHON_LATEST}"
  docker push "${WEBAPP_LATEST}"
  echo "Tagged and pushed ${PYTHON_LATEST} and ${WEBAPP_LATEST}"
else
  echo "DEV_BUILD=1 detected; skipping latest tag."
fi
