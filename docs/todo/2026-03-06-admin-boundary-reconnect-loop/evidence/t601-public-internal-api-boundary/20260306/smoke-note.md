# T601 Smoke Note (2026-03-06)

## Scope

- public runtime base URL default contract
- internal admin/runtime-error base URL split
- Helm template/runtime config ownership

## Checks

- `helm template malsori ./infra/charts/malsori -f infra/deploy/values.malsori.yaml`
  - `webapp.apiBaseUrl` rendered as public host
  - `webapp.adminApiBaseUrl` rendered as empty string by default in deploy values
  - internal-only ingress paths remain under `ingress.internal.paths`
- webapp verification
  - `runtimeErrorReporter.test.ts` confirms runtime telemetry does not initialize without `adminApiBaseUrl`
  - `rtzrApiClient.test.ts` confirms backend endpoint requests use the admin base URL

## Notes

- Current deploy values intentionally keep `adminApiBaseUrl` empty because no internal host is configured yet.
- Live internal-host smoke should be rerun after an internal ingress host/URL is assigned.
