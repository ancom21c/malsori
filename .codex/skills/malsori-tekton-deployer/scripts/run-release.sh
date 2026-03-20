#!/usr/bin/env bash
set -euo pipefail

skill_name="malsori-tekton-deployer"
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "${repo_root}"

app_id="${RELEASE_BROKER_APP_ID:-malsori}"
target_name="${RELEASE_BROKER_TARGET:-default}"
broker_url="${RELEASE_BROKER_URL:-https://deployer.ancom.duckdns.org}"
token_file="${RELEASE_BROKER_TOKEN_FILE:-${HOME}/.config/release-broker/tokens/${app_id}.token}"
app_revision="${APP_REVISION:-$(git rev-parse HEAD)}"
image_tag_input="${IMAGE_TAG:-auto}"
wait_seconds="${WAIT_SECONDS:-1800}"
poll_seconds="${POLL_SECONDS:-5}"
request_timeout="${REQUEST_TIMEOUT:-60}"
check_only="${RELEASE_BROKER_CHECK_ONLY:-0}"
idempotency_key="${IDEMPOTENCY_KEY:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

api_request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local response
  local status

  if [ -n "${body}" ]; then
    response="$(
      curl -sS --max-time "${request_timeout}" \
        -X "${method}" \
        -H "Authorization: Bearer ${auth_token}" \
        -H "Content-Type: application/json" \
        --data "${body}" \
        -w $'\n%{http_code}' \
        "${broker_url}${path}"
    )"
  else
    response="$(
      curl -sS --max-time "${request_timeout}" \
        -X "${method}" \
        -H "Authorization: Bearer ${auth_token}" \
        -w $'\n%{http_code}' \
        "${broker_url}${path}"
    )"
  fi

  status="${response##*$'\n'}"
  response="${response%$'\n'*}"

  if [ "${status}" -lt 200 ] || [ "${status}" -ge 300 ]; then
    python3 - "${status}" <<'PYERR' <<<"${response}"
import json
import sys

status = sys.argv[1]
body = sys.stdin.read().strip()
try:
    payload = json.loads(body)
except json.JSONDecodeError:
    print(f"http {status}: {body}", file=sys.stderr)
    raise SystemExit(1)

code = payload.get("code", "error")
message = payload.get("message", body)
print(f"{code}: {message}", file=sys.stderr)
raise SystemExit(1)
PYERR
  fi

  printf '%s' "${response}"
}

assert_visible_target() {
  local apps_json="$1"

  python3 - "${app_id}" "${target_name}" <<'PYVIS' <<<"${apps_json}"
import json
import sys

app_id, target_name = sys.argv[1:]
payload = json.load(sys.stdin)
for item in payload.get("apps", []):
    if item.get("appId") == app_id and target_name in (item.get("targets") or []):
        raise SystemExit(0)

print(f"principal may not release {app_id}/{target_name}", file=sys.stderr)
raise SystemExit(1)
PYVIS
}

build_request_body() {
  python3 - "${app_id}" "${target_name}" "${app_revision}" "${image_tag_input}" "${idempotency_key}" <<'PYREQ'
import json
import sys

app_id, target_name, revision, image_tag, idempotency_key = sys.argv[1:]
payload = {
    "appId": app_id,
    "target": target_name,
    "revision": revision,
}
if image_tag not in {"", "auto"}:
    payload["imageTag"] = image_tag
if idempotency_key:
    payload["idempotencyKey"] = idempotency_key
print(json.dumps(payload, separators=(",", ":")))
PYREQ
}

summarize_record() {
  python3 - <<'PYREC' <<<"$1"
import json
import sys

payload = json.load(sys.stdin)
print(payload.get("requestId", ""))
print(payload.get("phase", ""))
print(payload.get("message", ""))
print(payload.get("resolvedCommitSha") or "")
print(payload.get("resolvedImageTag") or "")
print(payload.get("promotedGitopsSha") or "")
print(",".join(payload.get("observedAppRevisions") or []))
print(",".join(payload.get("pipelineRunNames") or []))
PYREC
}

require_cmd git
require_cmd curl
require_cmd python3

if [ -n "$(git status --porcelain)" ]; then
  echo "[${skill_name}] warning: working tree is dirty; deploy uses committed revision ${app_revision}" >&2
fi

auth_token="${RELEASE_BROKER_TOKEN:-}"
if [ -z "${auth_token}" ]; then
  if [ ! -f "${token_file}" ]; then
    echo "[${skill_name}] missing broker token; set RELEASE_BROKER_TOKEN or create ${token_file}" >&2
    exit 1
  fi
  auth_token="$(tr -d '\r\n' < "${token_file}")"
fi

echo "[${skill_name}] repo=${repo_root}"
echo "[${skill_name}] broker=${broker_url}"
echo "[${skill_name}] app=${app_id} target=${target_name}"
echo "[${skill_name}] revision=${app_revision} image_tag=${image_tag_input}"

visible_apps="$(api_request GET /v1/apps)"
assert_visible_target "${visible_apps}"

if [ "${check_only}" = "1" ]; then
  echo "[${skill_name}] broker access ok for ${app_id}/${target_name}"
  exit 0
fi

create_response="$(api_request POST /v1/releases "$(build_request_body)")"
mapfile -t create_fields < <(summarize_record "${create_response}")
request_id="${create_fields[0]}"

echo "[${skill_name}] request_id=${request_id}"

deadline="$(( $(date +%s) + wait_seconds ))"
while true; do
  record_json="$(api_request GET "/v1/releases/${request_id}")"
  mapfile -t record_fields < <(summarize_record "${record_json}")
  phase="${record_fields[1]}"
  message="${record_fields[2]}"
  resolved_commit="${record_fields[3]}"
  resolved_image_tag="${record_fields[4]}"
  promoted_gitops_sha="${record_fields[5]}"
  observed_app_revisions="${record_fields[6]}"
  pipeline_run_names="${record_fields[7]}"

  echo "[${skill_name}] request_id=${request_id} phase=${phase} message=${message}"

  case "${phase}" in
    Succeeded)
      echo "[${skill_name}] done request_id=${request_id} revision=${resolved_commit:-${app_revision}} image_tag=${resolved_image_tag:-${image_tag_input}} pipelines=${pipeline_run_names} promoted_gitops=${promoted_gitops_sha} observed=${observed_app_revisions}"
      exit 0
      ;;
    Failed|Cancelled)
      echo "[${skill_name}] terminal phase=${phase} request_id=${request_id} message=${message}" >&2
      exit 1
      ;;
  esac

  if [ "$(date +%s)" -ge "${deadline}" ]; then
    echo "[${skill_name}] timed out waiting for request ${request_id}" >&2
    exit 1
  fi

  sleep "${poll_seconds}"
done
