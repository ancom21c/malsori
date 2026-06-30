# Deployment Notes (Helm)

This folder contains environment-specific Helm values files for deploying Malsori.

`infra/deploy/values.malsori.yaml` is local-only and gitignored. Copy from
`infra/deploy/values.malsori.example.yaml` when preparing a deploy on a workstation.

## Secrets (Required)

You can provide sensitive env vars via an existing Kubernetes Secret:

- Namespace: `malsori`
- Example secret name: `malsori-python-api-secret` (set it via `pythonApi.existingSecret`)

Create it like this (example):

```bash
kubectl -n malsori create secret generic malsori-python-api-secret \
  --from-literal=PRONAIA_API_BASE='https://openapi.vito.ai' \
  --from-literal=PRONAIA_CLIENT_ID='REPLACE_ME' \
  --from-literal=PRONAIA_CLIENT_SECRET='REPLACE_ME' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Optional: enable the Google Drive auth broker by adding these keys to the same Secret:

```bash
kubectl -n malsori create secret generic malsori-python-api-secret \
  --from-literal=PRONAIA_API_BASE='https://openapi.vito.ai' \
  --from-literal=PRONAIA_CLIENT_ID='REPLACE_ME' \
  --from-literal=PRONAIA_CLIENT_SECRET='REPLACE_ME' \
  --from-literal=GOOGLE_OAUTH_CLIENT_ID='REPLACE_ME' \
  --from-literal=GOOGLE_OAUTH_CLIENT_SECRET='REPLACE_ME' \
  --from-literal=GOOGLE_OAUTH_REDIRECT_URI='https://<host>/v1/cloud/google/oauth/callback' \
  --from-literal=GOOGLE_OAUTH_SCOPES='https://www.googleapis.com/auth/drive.file openid email profile' \
  --dry-run=client -o yaml \
  | kubectl -n malsori apply -f -
```

Optional: if you need runtime backend override APIs, add admin keys as well:

```bash
kubectl -n malsori create secret generic malsori-python-api-secret \
  --from-literal=BACKEND_ADMIN_TOKEN='REPLACE_ME' \
  --dry-run=client -o yaml \
  | kubectl -n malsori apply -f -
```

`/v1/backend/*` endpoints are for internal-network operations only. Keep `BACKEND_ADMIN_ENABLED=false` unless you explicitly need runtime override APIs, and never expose admin tokens on public clients.

## Private RTZR SDK Wheel Staging

If `rtzr` / `rtzr-internal` are only available as private wheel files, keep the source wheelhouse outside git and let the repo stage it into the Docker build context temporarily.

Recommended local source layout:

```text
~/.local/share/malsori/python-api-pip/
  pip.conf
  wheels/
    rtzr-<version>-py3-none-any.whl
    rtzr_internal-<version>-py3-none-any.whl
```

Example `pip.conf` for wheelhouse-only installs:

```ini
[global]
no-index = true
find-links = /root/.pip/wheels
```

Local build/deploy helpers automatically stage this source dir into the gitignored Docker context path `infra/docker-compose/docker-build/python-api-pip/` and clean it up afterward:

- local compose: `infra/deploy/local/run-malsori-docker.sh`
- dev cluster image build/redeploy: `infra/deploy/local/deploy-dev.sh`
- direct image build/push: `scripts/build-images.sh`

Override the default source location with `PYTHON_API_PIP_SOURCE_DIR=/abs/path/to/python-api-pip`.

Shared-cluster Tekton releases do not read your local wheel staging directory. The committed Python API image now boots without these private SDK wheels by using the built-in cloud fallback path, while local staging remains available when you want parity with the official SDK packages.

## Ingress Surface Policy (Public/Internal Split)

Use split ingress surfaces in production:

- Public ingress: `/`, `/v1/health`, `/v1/transcribe*`, `/v1/streaming`, `/v1/cloud/google/*`
- Internal ingress only: `/v1/backend/*`, `/v1/observability/runtime-error`

Web runtime config should mirror this split:

- `webapp.apiBaseUrl`: public base (`/` for same-origin or `https://malsori.example.com`)
- `webapp.adminApiBaseUrl`: internal admin base (`https://malsori-internal.example.local`)
- `webapp.runtimeErrorReportingEnabled`: only meaningful when `adminApiBaseUrl` is set

Example:

```yaml
ingress:
  public:
    enabled: true
    ingressClassName: traefik
    hosts:
      - host: malsori.example.com
        paths:
          - path: /
            pathType: Prefix
            servicePort: web
          - path: /v1/health
            pathType: Prefix
            servicePort: python
          - path: /v1/transcribe
            pathType: Prefix
            servicePort: python
          - path: /v1/streaming
            pathType: Prefix
            servicePort: python
          - path: /v1/cloud/google
            pathType: Prefix
            servicePort: python
  internal:
    enabled: true
    ingressClassName: traefik
    hosts:
      - host: malsori-internal.example.local
        paths:
          - path: /v1/backend
            pathType: Prefix
            servicePort: python
          - path: /v1/observability/runtime-error
            pathType: Prefix
            servicePort: python
```

If internal ingress is disabled, these internal-only paths stay non-routable (fail-closed).

## Cloudflare Pages Static Frontend Profile

If you deploy only the frontend on Cloudflare Pages and keep `python-api` on a separate origin:

- keep the same repository; publish `webapp/dist` as the Pages artifact
- configure `config/malsori-config.js` on the static host with:
  - `apiBaseUrl: "https://<public-api-origin>"`
  - `adminApiBaseUrl: ""`
  - `driveAuthMode: "disabled"`
  - `runtimeErrorReportingEnabled: false`
- set `pythonApi.env.CORS_ALLOWED_ORIGINS` to the exact frontend origin list, for example:

```yaml
pythonApi:
  env:
    STT_STORAGE_BASE_DIR: /data
    CORS_ALLOWED_ORIGINS: "https://malsori.pages.dev,https://malsori.example.com"
```

Notes:

- The repo now ships `webapp/public/_redirects` for SPA route fallback and `webapp/public/_headers` so `/config/malsori-config.js` stays uncached on Cloudflare Pages.
- Google Drive auth broker is intentionally out of scope for this profile because its OAuth callback/return contract is backend-relative. Keep Drive disabled here unless that broker contract is redesigned.

## Persistent Storage (Recommended for broker mode)

If you enable the Drive auth broker, the server stores refresh tokens under `STT_STORAGE_BASE_DIR` (`/data` in the chart).
Use a PVC so tokens and cached artifacts survive pod restarts. The API now treats persistent storage as required for broker mode unless `GOOGLE_OAUTH_ALLOW_EPHEMERAL_STORAGE=1` is explicitly set:

```yaml
pythonApi:
  env:
    STT_STORAGE_BASE_DIR: /data
    BACKEND_ADMIN_ENABLED: "false"
  storage:
    enabled: true
    size: 1Gi
```

## No Secret Mode (Quick Deploy)

If you do not want to manage Kubernetes Secrets yet, you can deploy with `pythonApi.existingSecret` unset.
In that case, configure RTZR endpoint + credentials from the webapp Settings UI; the API server persists them under `STT_STORAGE_BASE_DIR`.
