# Deployment Notes (Helm)

This folder contains environment-specific Helm values files for deploying Malsori.

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
