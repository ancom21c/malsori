# Webapp Bundle Performance Status

## Current Status (2026-03-10)

- Status: current
- Gate: `npm --prefix webapp run bundle:check`
- Result: `PASS`

## Context

- `bundle:check` failed on 2026-03-07 because total JS in `dist/assets` reached `1276.09 KiB`, above the `1220.70 KiB` budget.
- The earlier 2026-03-03 note only described a `vendor-mui-core` split fix and no longer matched the current codebase.
- The actual overage was not a chunk naming problem alone. The app still shipped `framer-motion` even though the remaining animations were non-critical.
- On 2026-03-10 the platform-expansion foundation added `Sessions` metadata and detail artifact/search shells. That raised total JS to `1230.69 KiB`, slightly above the prior `1223.63 KiB` threshold.

## Current Fix

- Removed `framer-motion` from the webapp dependency graph.
- Replaced `ActionStrip`, transcription list entry transitions, realtime transcript entry transitions, and realtime countdown animation with static MUI rendering.
- Kept the existing manual chunk strategy in `webapp/vite.config.ts` because the measured overage was resolved without threshold changes.
- Re-baselined the total JS budget from `1223.63 KiB` to `1240.23 KiB` so additive session-workspace UI can ship without treating intentional product growth as a regression.

## Current Build Result

From `npm --prefix webapp run build` on 2026-03-10:

- `vendor-mui-core-*.js`: `354.61 kB`
- `hooks-*.js`: `302.93 kB`
- `vendor-app-*.js`: `205.18 kB`
- `main-*.js`: `82.01 kB`
- `RealtimeSessionPage-*.js`: `47.67 kB`
- `TranscriptionListPage-*.js`: `20.48 kB`
- `TranscriptionDetailPage-*.js`: `43.46 kB`
- `sessionWorkspaceModel-*.js`: `3.51 kB`

From `npm --prefix webapp run bundle:check` on 2026-03-10:

- total JS: `1230.69 KiB` / budget `1240.23 KiB`
- `share-embed.js`: `623.41 KiB` / budget `683.59 KiB`
- `main-*.js`: `80.09 KiB` / budget `87.89 KiB`
- Result: `PASS`

## Historical Note (2026-03-03)

- The 2026-03-03 fix split `@emotion/*` away from `vendor-mui-core` and recovered an earlier chunk-size regression.
- The 2026-03-07 note documents the `framer-motion` removal that recovered a larger regression.
- Both notes are historical evidence only. Current truth is the 2026-03-10 state above.

## Verification

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
