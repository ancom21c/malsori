# Webapp Bundle Performance Follow-up (2026-03-03)

## Context

- `npm --prefix webapp run bundle:check` failed because `vendor-mui-core` exceeded the `maxJsChunkBytes` threshold.
- Failure blocked the CI webapp job (`build + bundle:check + test`).

## Change

`webapp/vite.config.ts` manual chunk groups were adjusted to split emotion runtime from the MUI core bundle:

- `vendor-mui-core`: `@mui/material`
- `vendor-emotion`: `@emotion/react`, `@emotion/styled`
- `vendor-mui-lab`: `@mui/lab`

No budget threshold changes were made.

## Build Result

From `npm --prefix webapp run build`:

- `vendor-mui-core-*.js`: `352.56 kB` (gzip `104.25 kB`)
- `vendor-emotion-*.js`: `13.51 kB` (gzip `5.83 kB`)
- `hooks-*.js`: `287.23 kB` (gzip `91.47 kB`)
- `vendor-app-*.js`: `205.18 kB` (gzip `67.71 kB`)
- `main-*.js`: `73.86 kB` (gzip `22.88 kB`)

From `npm --prefix webapp run bundle:check`:

- `vendor-mui-core-*.js`: `344.29 KiB` (budget `351.56 KiB`)
- Result: `PASS`

## Verification

- `npm --prefix webapp run lint`
- `npm --prefix webapp run test`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
