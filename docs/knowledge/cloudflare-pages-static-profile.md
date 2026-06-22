# Cloudflare Pages Static Frontend Profile

## Purpose

This profile keeps the Malsori frontend on a static host such as Cloudflare Pages while `python-api` stays on a separate public origin.

## Runtime Contract

- Use the same repository. Do not split into a second frontend-only repository by default.
- Build and publish the static frontend from `webapp/dist`.
- Runtime config on the static host must set:
  - `apiBaseUrl` to the remote public API origin
  - `adminApiBaseUrl` to the empty string
  - `driveAuthMode` to `"disabled"`
  - `runtimeErrorReportingEnabled` to `false`
- Internal admin routes remain on the backend's internal boundary and are not part of the static profile.

Example runtime config:

```js
Object.assign(window.__MALSORI_CONFIG__, {
  apiBaseUrl: "https://api.example.com",
  adminApiBaseUrl: "",
  driveAuthMode: "disabled",
  runtimeErrorReportingEnabled: false,
});
```

## Backend Contract

- `python-api` must allow the exact static frontend origins via `CORS_ALLOWED_ORIGINS`.
- `CORS_ALLOWED_ORIGINS` is fail-closed: if unset, public cross-origin browser calls remain blocked.
- WebSocket streaming keeps using the same `apiBaseUrl`; no frontend proxy is required in this profile.

## Static Host Assets

- `webapp/public/_redirects` provides SPA route fallback to `index.html`.
- `webapp/public/_headers` keeps `index.html`, `share.html`, and `service-worker.js` fresh and marks `/config/malsori-config.js` as `no-store`.
- `webapp/public/config/malsori-config.js` is the runtime override point and should stay editable after build.

## Non-Goals

- Google Drive auth broker is not supported in this profile.
  - The current OAuth start/callback contract returns to a backend-relative path and is therefore incompatible with a separate static frontend origin.
- This profile does not expose operator admin APIs on the public static origin.
