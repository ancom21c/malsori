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
