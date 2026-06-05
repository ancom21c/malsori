#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
STAGE_DIR="${ROOT_DIR}/infra/docker-compose/docker-build/python-api-pip"
DEFAULT_SOURCE_DIR="${HOME}/.local/share/malsori/python-api-pip"
SOURCE_DIR="${PYTHON_API_PIP_SOURCE_DIR:-${DEFAULT_SOURCE_DIR}}"

usage() {
  cat <<'EOF'
Usage: stage-python-api-pip.sh [stage|cleanup|status]

Commands:
  stage    Copy local pip config + wheels into the docker build context.
  cleanup  Remove staged files from the docker build context.
  status   Print source/staging paths and currently staged files.

Environment:
  PYTHON_API_PIP_SOURCE_DIR
      Override the default source dir (~/.local/share/malsori/python-api-pip).
EOF
}

ensure_stage_dir() {
  mkdir -p "${STAGE_DIR}/wheels"
  touch "${STAGE_DIR}/.gitkeep" "${STAGE_DIR}/wheels/.gitkeep"
}

cleanup_stage_dir() {
  ensure_stage_dir
  find "${STAGE_DIR}" -mindepth 1 ! -path "${STAGE_DIR}/.gitkeep" ! -path "${STAGE_DIR}/wheels/.gitkeep" -exec rm -rf {} +
  mkdir -p "${STAGE_DIR}/wheels"
  touch "${STAGE_DIR}/.gitkeep" "${STAGE_DIR}/wheels/.gitkeep"
}

print_status() {
  ensure_stage_dir
  echo "SOURCE_DIR=${SOURCE_DIR}"
  echo "STAGE_DIR=${STAGE_DIR}"
  if [[ -d "${SOURCE_DIR}" ]]; then
    echo "SOURCE_EXISTS=1"
    find "${SOURCE_DIR}" -maxdepth 3 \( -type f -o -type d \) | sort
  else
    echo "SOURCE_EXISTS=0"
  fi
  echo "STAGED_FILES:"
  find "${STAGE_DIR}" -maxdepth 3 \( -type f -o -type d \) | sort
}

stage_source_dir() {
  if [[ ! -d "${SOURCE_DIR}" ]]; then
    echo "python-api pip source dir not found: ${SOURCE_DIR}" >&2
    exit 1
  fi
  if [[ ! -f "${SOURCE_DIR}/pip.conf" && ! -f "${SOURCE_DIR}/pip.ini" ]]; then
    echo "expected pip.conf or pip.ini in ${SOURCE_DIR}" >&2
    exit 1
  fi
  ensure_stage_dir
  cleanup_stage_dir
  shopt -s dotglob nullglob
  local entries=("${SOURCE_DIR}"/*)
  shopt -u dotglob nullglob
  if [[ ${#entries[@]} -eq 0 ]]; then
    echo "python-api pip source dir is empty: ${SOURCE_DIR}" >&2
    exit 1
  fi
  cp -R "${entries[@]}" "${STAGE_DIR}/"
  mkdir -p "${STAGE_DIR}/wheels"
  touch "${STAGE_DIR}/.gitkeep"
  if [[ ! -f "${STAGE_DIR}/wheels/.gitkeep" ]]; then
    touch "${STAGE_DIR}/wheels/.gitkeep"
  fi
  echo "Staged python-api pip context from ${SOURCE_DIR} -> ${STAGE_DIR}"
}

COMMAND="${1:-stage}"

case "${COMMAND}" in
  stage)
    stage_source_dir
    ;;
  cleanup)
    cleanup_stage_dir
    echo "Cleaned staged python-api pip context in ${STAGE_DIR}"
    ;;
  status)
    print_status
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
