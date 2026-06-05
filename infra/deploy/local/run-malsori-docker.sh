#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../../.. && pwd)"
STAGE_HELPER="${ROOT_DIR}/scripts/stage-python-api-pip.sh"
DEFAULT_SOURCE_DIR="${HOME}/.local/share/malsori/python-api-pip"
STAGED_PIP_CONTEXT=0

cleanup() {
  if [[ "${STAGED_PIP_CONTEXT}" == "1" ]]; then
    "${STAGE_HELPER}" cleanup
  fi
}

trap cleanup EXIT

if [[ $# -eq 0 ]]; then
  set -- up -d --build
fi

if [[ -n "${PYTHON_API_PIP_SOURCE_DIR:-}" || -d "${DEFAULT_SOURCE_DIR}" ]]; then
  echo "Staging python-api pip context for docker compose"
  "${STAGE_HELPER}" stage
  STAGED_PIP_CONTEXT=1
else
  echo "No local python-api pip source dir detected; compose will rely on public pip resolution."
fi

docker compose -f "${ROOT_DIR}/infra/docker-compose/docker-compose.yml" "$@"
