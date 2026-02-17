# Deployment Notes (Helm)

This folder contains environment-specific Helm values files for deploying Malsori.

## Secrets (Required)

`infra/deploy/values.malsori.yaml` is configured to load sensitive env vars from an existing Kubernetes Secret:

- Namespace: `malsori`
- Secret name: `malsori-python-api-secret` (see `pythonApi.existingSecret`)

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

## Persistent Storage (Recommended for broker mode)

If you enable the Drive auth broker, the server stores refresh tokens under `STT_STORAGE_BASE_DIR` (`/data` in the chart).
Use a PVC so tokens and cached artifacts survive pod restarts:

```yaml
pythonApi:
  storage:
    enabled: true
    size: 1Gi
```
