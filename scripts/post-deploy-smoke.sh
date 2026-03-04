#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://malsori.ancom.duckdns.org}"
INTERNAL_BASE_URL="${INTERNAL_BASE_URL:-}"
NAMESPACE="${NAMESPACE:-malsori}"
RELEASE_NAME="${RELEASE_NAME:-malsori}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"
BACKEND_ADMIN_TOKEN="${BACKEND_ADMIN_TOKEN:-}"
ALLOW_INSECURE_TLS="${ALLOW_INSECURE_TLS:-0}"
RUN_UI_SMOKE="${RUN_UI_SMOKE:-auto}"
UI_SMOKE_SCREENSHOT_DIR="${UI_SMOKE_SCREENSHOT_DIR:-/tmp/malsori-ui-smoke}"
EXPECT_RUNTIME_ERROR_PUBLIC_BLOCKED="${EXPECT_RUNTIME_ERROR_PUBLIC_BLOCKED:-1}"
DETAIL_SMOKE_ID="${DETAIL_SMOKE_ID:-}"

for cmd in curl kubectl helm python3 rg; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
done

mapfile -t DEPLOYMENTS < <(
  kubectl -n "${NAMESPACE}" get deploy \
    -l "app.kubernetes.io/instance=${RELEASE_NAME}" \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'
)

if [[ "${#DEPLOYMENTS[@]}" -eq 0 ]]; then
  echo "No deployment found for release ${RELEASE_NAME} in namespace ${NAMESPACE}" >&2
  exit 1
fi

http_get_expect_status_base() {
  local base_url="$1"
  local path="$2"
  local label="$3"
  local expected_status="$4"
  shift 4
  local out_file
  out_file="$(mktemp)"
  local status
  local -a extra_headers=()
  local -a curl_flags=(-sS)
  if [[ "${ALLOW_INSECURE_TLS}" == "1" ]]; then
    curl_flags+=(-k)
  fi
  while (($#)); do
    extra_headers+=("-H" "$1")
    shift
  done
  status="$(curl "${curl_flags[@]}" "${extra_headers[@]}" -o "${out_file}" -w '%{http_code}' "${base_url}${path}")"
  if [[ "${status}" != "${expected_status}" ]]; then
    echo "[FAIL] ${label}: expected HTTP ${expected_status}, got ${status} (${base_url}${path})" >&2
    sed -n '1,20p' "${out_file}" >&2 || true
    rm -f "${out_file}"
    exit 1
  fi
  printf '%s\n' "${out_file}"
}

http_get_expect_status() {
  local path="$1"
  local label="$2"
  local expected_status="$3"
  shift 3
  http_get_expect_status_base "${BASE_URL}" "${path}" "${label}" "${expected_status}" "$@"
}

http_get_expect_blocked() {
  local base_url="$1"
  local path="$2"
  local label="$3"
  shift 3
  local out_file
  out_file="$(mktemp)"
  local status
  local -a extra_headers=()
  local -a curl_flags=(-sS)
  if [[ "${ALLOW_INSECURE_TLS}" == "1" ]]; then
    curl_flags+=(-k)
  fi
  while (($#)); do
    extra_headers+=("-H" "$1")
    shift
  done

  status="$(curl "${curl_flags[@]}" "${extra_headers[@]}" -o "${out_file}" -w '%{http_code}' "${base_url}${path}")"
  if [[ "${status}" == "404" || "${status}" == "405" ]]; then
    printf '%s\n' "${out_file}"
    return
  fi
  if [[ "${status}" == "200" ]] && rg -qi '<!doctype html|<html' "${out_file}"; then
    # In split-ingress mode, unmatched API paths may be served by SPA fallback (200 HTML).
    printf '%s\n' "${out_file}"
    return
  fi

  echo "[FAIL] ${label}: expected blocked response (404/405 or SPA 200 HTML), got ${status} (${base_url}${path})" >&2
  sed -n '1,20p' "${out_file}" >&2 || true
  rm -f "${out_file}"
  exit 1
}

http_post_json_expect_status_base() {
  local base_url="$1"
  local path="$2"
  local label="$3"
  local expected_status="$4"
  local payload="$5"
  shift 5
  local out_file
  out_file="$(mktemp)"
  local status
  local -a extra_headers=("-H" "Content-Type: application/json")
  local -a curl_flags=(-sS -X POST --data "${payload}")
  if [[ "${ALLOW_INSECURE_TLS}" == "1" ]]; then
    curl_flags+=(-k)
  fi
  while (($#)); do
    extra_headers+=("-H" "$1")
    shift
  done
  status="$(curl "${curl_flags[@]}" "${extra_headers[@]}" -o "${out_file}" -w '%{http_code}' "${base_url}${path}")"
  if [[ "${status}" != "${expected_status}" ]]; then
    echo "[FAIL] ${label}: expected HTTP ${expected_status}, got ${status} (${base_url}${path})" >&2
    sed -n '1,20p' "${out_file}" >&2 || true
    rm -f "${out_file}"
    exit 1
  fi
  printf '%s\n' "${out_file}"
}

http_post_json_expect_status() {
  local path="$1"
  local label="$2"
  local expected_status="$3"
  local payload="$4"
  shift 4
  http_post_json_expect_status_base "${BASE_URL}" "${path}" "${label}" "${expected_status}" "${payload}" "$@"
}

http_post_json_expect_status_in() {
  local base_url="$1"
  local path="$2"
  local label="$3"
  local payload="$4"
  shift 4
  local out_file
  out_file="$(mktemp)"
  local status
  local -a extra_headers=("-H" "Content-Type: application/json")
  local -a curl_flags=(-sS -X POST --data "${payload}")
  if [[ "${ALLOW_INSECURE_TLS}" == "1" ]]; then
    curl_flags+=(-k)
  fi
  while (($#)); do
    extra_headers+=("-H" "$1")
    shift
  done
  status="$(curl "${curl_flags[@]}" "${extra_headers[@]}" -o "${out_file}" -w '%{http_code}' "${base_url}${path}")"

  local matched="0"
  for allowed in "${EXPECTED_STATUSES[@]}"; do
    if [[ "${status}" == "${allowed}" ]]; then
      matched="1"
      break
    fi
  done
  if [[ "${matched}" != "1" ]]; then
    echo "[FAIL] ${label}: expected one of [${EXPECTED_STATUSES[*]}], got ${status} (${base_url}${path})" >&2
    sed -n '1,20p' "${out_file}" >&2 || true
    rm -f "${out_file}"
    exit 1
  fi
  printf '%s\n' "${out_file}"
}

http_get_expect_200() {
  local path="$1"
  local label="$2"
  shift 2
  http_get_expect_status "${path}" "${label}" "200" "$@"
}

echo "[1/8] Verify rollout"
for deployment in "${DEPLOYMENTS[@]}"; do
  kubectl -n "${NAMESPACE}" rollout status "deployment/${deployment}" --timeout="${ROLLOUT_TIMEOUT}"
done

echo "[2/8] Snapshot release resources"
helm -n "${NAMESPACE}" status "${RELEASE_NAME}" >/dev/null
kubectl -n "${NAMESPACE}" get pods,svc,ingress

echo "[3/8] Verify SPA routes"
for route in / /settings /realtime; do
  body_file="$(http_get_expect_200 "${route}" "SPA route ${route}")"
  if ! rg -q 'id="root"' "${body_file}"; then
    echo "[FAIL] SPA route ${route}: root container not found in HTML" >&2
    sed -n '1,20p' "${body_file}" >&2 || true
    rm -f "${body_file}"
    exit 1
  fi
  rm -f "${body_file}"
done

echo "[cache] Verify service worker/cache asset contract"
service_worker_file="$(http_get_expect_200 "/service-worker.js" "SW /service-worker.js")"
if rg -q "__BUILD_HASH__" "${service_worker_file}"; then
  echo "[FAIL] service-worker.js still contains build placeholder (__BUILD_HASH__)" >&2
  sed -n '1,40p' "${service_worker_file}" >&2 || true
  rm -f "${service_worker_file}"
  exit 1
fi
if ! rg -q "malsori-app-cache-" "${service_worker_file}"; then
  echo "[FAIL] service-worker.js cache version marker not found" >&2
  sed -n '1,40p' "${service_worker_file}" >&2 || true
  rm -f "${service_worker_file}"
  exit 1
fi
rm -f "${service_worker_file}"

manifest_file="$(http_get_expect_200 "/manifest.webmanifest" "PWA /manifest.webmanifest")"
if ! rg -q '\?v=' "${manifest_file}"; then
  echo "[FAIL] manifest.webmanifest icons are not versioned with ?v= hash" >&2
  sed -n '1,40p' "${manifest_file}" >&2 || true
  rm -f "${manifest_file}"
  exit 1
fi
rm -f "${manifest_file}"

runtime_config_file="$(http_get_expect_200 "/config/malsori-config.js" "Runtime config /config/malsori-config.js")"
if ! rg -q "__MALSORI_CONFIG__" "${runtime_config_file}"; then
  echo "[FAIL] runtime config script does not expose __MALSORI_CONFIG__ contract" >&2
  sed -n '1,40p' "${runtime_config_file}" >&2 || true
  rm -f "${runtime_config_file}"
  exit 1
fi
rm -f "${runtime_config_file}"

echo "[4/8] Verify API health contract"
health_file="$(http_get_expect_200 "/v1/health" "API /v1/health")"
backend_admin_enabled="$(python3 - "${health_file}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
assert payload.get("status") == "ok", payload
assert payload.get("service") == "malsori-python-api", payload
assert payload.get("deployment") in {"cloud", "onprem"}, payload
assert payload.get("source") in {"default", "override"}, payload
backend_admin_enabled = payload.get("backend_admin_enabled")
assert isinstance(backend_admin_enabled, bool), payload
print(f"health: status={payload['status']} deployment={payload['deployment']} source={payload['source']} backend_admin_enabled={backend_admin_enabled}", file=sys.stderr)
print("1" if backend_admin_enabled else "0")
PY
)"
rm -f "${health_file}"

echo "[5/8] Verify broker status contract"
broker_file="$(http_get_expect_200 "/v1/cloud/google/status" "API /v1/cloud/google/status")"
python3 - "${broker_file}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
for key in ("enabled", "connected"):
    assert key in payload, payload
print(f"google-status: enabled={payload.get('enabled')} connected={payload.get('connected')}")
PY
rm -f "${broker_file}"

echo "[6/8] Verify observability public exposure policy"
if [[ "${EXPECT_RUNTIME_ERROR_PUBLIC_BLOCKED}" == "1" ]]; then
  EXPECTED_STATUSES=("404" "405")
  observability_public_file="$(http_post_json_expect_status_in \
    "${BASE_URL}" \
    "/v1/observability/runtime-error" \
    "API /v1/observability/runtime-error (public blocked)" \
    '{"kind":"error","message":"smoke-policy-check","route":"/smoke-policy"}')"
  rm -f "${observability_public_file}"
  echo "runtime-error: blocked on public ingress (404/405)"
else
  observability_public_file="$(http_post_json_expect_status \
    "/v1/observability/runtime-error" \
    "API /v1/observability/runtime-error (public allowed)" \
    "202" \
    '{"kind":"error","message":"smoke-policy-check","route":"/smoke-policy"}')"
  rm -f "${observability_public_file}"
  echo "runtime-error: publicly reachable (202)"
fi

echo "[7/8] Verify backend endpoint contract"
ADMIN_BASE_URL="${INTERNAL_BASE_URL:-${BASE_URL}}"
if [[ "${backend_admin_enabled}" == "1" ]]; then
  if [[ -n "${INTERNAL_BASE_URL}" ]]; then
    backend_public_file="$(http_get_expect_blocked "${BASE_URL}" "/v1/backend/endpoint" "API /v1/backend/endpoint (public blocked)")"
    rm -f "${backend_public_file}"
    backend_state_public_file="$(http_get_expect_blocked "${BASE_URL}" "/v1/backend/state" "API /v1/backend/state (public blocked)")"
    rm -f "${backend_state_public_file}"
    echo "backend-endpoint: blocked on public ingress"
  fi

  if [[ -n "${BACKEND_ADMIN_TOKEN}" ]]; then
    backend_file="$(http_get_expect_status_base "${ADMIN_BASE_URL}" "/v1/backend/endpoint" "API /v1/backend/endpoint (admin)" "200" "X-Malsori-Admin-Token: ${BACKEND_ADMIN_TOKEN}")"
    python3 - "${backend_file}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
required = ("deployment", "api_base_url", "transcribe_path", "streaming_path", "source")
missing = [key for key in required if key not in payload]
assert not missing, {"missing": missing, "payload": payload}
print(f"backend-endpoint: deployment={payload.get('deployment')} source={payload.get('source')}")
PY
    rm -f "${backend_file}"
  else
    unauthorized_file="$(http_get_expect_status_base "${ADMIN_BASE_URL}" "/v1/backend/endpoint" "API /v1/backend/endpoint (unauthorized)" "401")"
    rm -f "${unauthorized_file}"
    echo "backend-endpoint: protected (401 without BACKEND_ADMIN_TOKEN)"
  fi

  echo "[8/8] Verify backend state alias contract"
  if [[ -n "${BACKEND_ADMIN_TOKEN}" ]]; then
    backend_state_file="$(http_get_expect_status_base "${ADMIN_BASE_URL}" "/v1/backend/state" "API /v1/backend/state (admin)" "200" "X-Malsori-Admin-Token: ${BACKEND_ADMIN_TOKEN}")"
    python3 - "${backend_state_file}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
required = ("deployment", "api_base_url", "transcribe_path", "streaming_path", "source")
missing = [key for key in required if key not in payload]
assert not missing, {"missing": missing, "payload": payload}
print(f"backend-state: deployment={payload.get('deployment')} source={payload.get('source')}")
PY
    rm -f "${backend_state_file}"
  else
    unauthorized_state_file="$(http_get_expect_status_base "${ADMIN_BASE_URL}" "/v1/backend/state" "API /v1/backend/state (unauthorized)" "401")"
    rm -f "${unauthorized_state_file}"
    echo "backend-state: protected (401 without BACKEND_ADMIN_TOKEN)"
  fi
else
  backend_file_disabled="$(http_get_expect_blocked "${ADMIN_BASE_URL}" "/v1/backend/endpoint" "API /v1/backend/endpoint (disabled)")"
  rm -f "${backend_file_disabled}"
  echo "backend-endpoint: disabled or blocked"
  echo "[8/8] Verify backend state alias contract"
  backend_state_file_disabled="$(http_get_expect_blocked "${ADMIN_BASE_URL}" "/v1/backend/state" "API /v1/backend/state (disabled)")"
  rm -f "${backend_state_file_disabled}"
  echo "backend-state: disabled or blocked"
fi

echo "Smoke checks passed for ${BASE_URL}"

if [[ "${RUN_UI_SMOKE}" != "0" ]]; then
  if ! python3 -c 'import playwright' >/dev/null 2>&1; then
    if [[ "${RUN_UI_SMOKE}" == "auto" ]]; then
      echo "[skip] UI smoke: playwright module is not installed (RUN_UI_SMOKE=auto)"
      exit 0
    fi
    echo "[FAIL] RUN_UI_SMOKE=${RUN_UI_SMOKE} but playwright module is not installed" >&2
    exit 1
  fi

  echo "[9/9] Verify UI runtime contract"
  ui_smoke_args=(
    --base-url "${BASE_URL}"
    --screenshot-dir "${UI_SMOKE_SCREENSHOT_DIR}"
  )
  if [[ -n "${DETAIL_SMOKE_ID}" ]]; then
    ui_smoke_args+=(--detail-id "${DETAIL_SMOKE_ID}")
  fi
  python3 scripts/post-deploy-ui-smoke.py "${ui_smoke_args[@]}"
fi
