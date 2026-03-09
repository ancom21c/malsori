# Webapp Bundle Performance Status

## Current Status (2026-03-07)

- Status: current
- Gate: `npm --prefix webapp run bundle:check`
- Result: `PASS`

## Context

- `bundle:check` failed on 2026-03-07 because total JS in `dist/assets` reached `1276.09 KiB`, above the `1220.70 KiB` budget.
- The earlier 2026-03-03 note only described a `vendor-mui-core` split fix and no longer matched the current codebase.
- The actual overage was not a chunk naming problem alone. The app still shipped `framer-motion` even though the remaining animations were non-critical.

## Current Fix

- Removed `framer-motion` from the webapp dependency graph.
- Replaced `ActionStrip`, transcription list entry transitions, realtime transcript entry transitions, and realtime countdown animation with static MUI rendering.
- Kept the existing manual chunk strategy in `webapp/vite.config.ts` because the measured overage was resolved without threshold changes.

## Current Build Result

From `npm --prefix webapp run build` on 2026-03-07:

- `vendor-mui-core-*.js`: `354.61 kB`
- `hooks-*.js`: `296.17 kB`
- `vendor-app-*.js`: `205.18 kB`
- `main-*.js`: `78.42 kB`
- `RealtimeSessionPage-*.js`: `46.12 kB`
- `TranscriptionListPage-*.js`: `15.99 kB`

From `npm --prefix webapp run bundle:check` on 2026-03-07:

- total JS: `1154.97 KiB` / budget `1220.70 KiB`
- `share-embed.js`: `616.18 KiB` / budget `683.59 KiB`
- `main-*.js`: `76.58 KiB` / budget `87.89 KiB`
- Result: `PASS`

## Historical Note (2026-03-03)

- The 2026-03-03 fix split `@emotion/*` away from `vendor-mui-core` and recovered an earlier chunk-size regression.
- That note is now historical evidence only. Current truth is the 2026-03-07 state above.

## Verification

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
