#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://malsori.ancom.duckdns.org}"
NAMESPACE="${NAMESPACE:-malsori}"
RELEASE_NAME="${RELEASE_NAME:-malsori}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"
BACKEND_ADMIN_TOKEN="${BACKEND_ADMIN_TOKEN:-}"
ALLOW_INSECURE_TLS="${ALLOW_INSECURE_TLS:-0}"

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

http_get_expect_status() {
  local path="$1"
  local label="$2"
  local expected_status="$3"
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
  status="$(curl "${curl_flags[@]}" "${extra_headers[@]}" -o "${out_file}" -w '%{http_code}' "${BASE_URL}${path}")"
  if [[ "${status}" != "${expected_status}" ]]; then
    echo "[FAIL] ${label}: expected HTTP ${expected_status}, got ${status} (${BASE_URL}${path})" >&2
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

echo "[1/7] Verify rollout"
for deployment in "${DEPLOYMENTS[@]}"; do
  kubectl -n "${NAMESPACE}" rollout status "deployment/${deployment}" --timeout="${ROLLOUT_TIMEOUT}"
done

echo "[2/7] Snapshot release resources"
helm -n "${NAMESPACE}" status "${RELEASE_NAME}" >/dev/null
kubectl -n "${NAMESPACE}" get pods,svc,ingress

echo "[3/7] Verify SPA routes"
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

echo "[4/7] Verify API health contract"
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

echo "[5/7] Verify broker status contract"
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

echo "[6/7] Verify backend endpoint contract"
if [[ "${backend_admin_enabled}" == "1" ]]; then
  if [[ -n "${BACKEND_ADMIN_TOKEN}" ]]; then
    backend_file="$(http_get_expect_200 "/v1/backend/endpoint" "API /v1/backend/endpoint (admin)" "X-Malsori-Admin-Token: ${BACKEND_ADMIN_TOKEN}")"
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
    unauthorized_file="$(http_get_expect_status "/v1/backend/endpoint" "API /v1/backend/endpoint (unauthorized)" "401")"
    rm -f "${unauthorized_file}"
    echo "backend-endpoint: protected (401 without BACKEND_ADMIN_TOKEN)"
  fi

  echo "[7/7] Verify backend state alias contract"
  if [[ -n "${BACKEND_ADMIN_TOKEN}" ]]; then
    backend_state_file="$(http_get_expect_200 "/v1/backend/state" "API /v1/backend/state (admin)" "X-Malsori-Admin-Token: ${BACKEND_ADMIN_TOKEN}")"
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
    unauthorized_state_file="$(http_get_expect_status "/v1/backend/state" "API /v1/backend/state (unauthorized)" "401")"
    rm -f "${unauthorized_state_file}"
    echo "backend-state: protected (401 without BACKEND_ADMIN_TOKEN)"
  fi
else
  backend_file_disabled="$(http_get_expect_status "/v1/backend/endpoint" "API /v1/backend/endpoint (disabled)" "404")"
  rm -f "${backend_file_disabled}"
  echo "backend-endpoint: disabled (404)"
  echo "[7/7] Verify backend state alias contract"
  backend_state_file_disabled="$(http_get_expect_status "/v1/backend/state" "API /v1/backend/state (disabled)" "404")"
  rm -f "${backend_state_file_disabled}"
  echo "backend-state: disabled (404)"
fi

echo "Smoke checks passed for ${BASE_URL}"
