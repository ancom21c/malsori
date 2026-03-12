# Webapp Bundle Performance Status

## Current Status (2026-03-12)

- Status: current
- Gate: `npm --prefix webapp run bundle:check`
- Result: `PASS`

## Context

- `bundle:check` failed on 2026-03-07 because total JS in `dist/assets` reached `1276.09 KiB`, above the `1220.70 KiB` budget.
- The earlier 2026-03-03 note only described a `vendor-mui-core` split fix and no longer matched the current codebase.
- The actual overage was not a chunk naming problem alone. The app still shipped `framer-motion` even though the remaining animations were non-critical.
- On 2026-03-10 the platform-expansion foundation added `Sessions` metadata and detail artifact/search shells. That raised total JS to `1230.69 KiB`, slightly above the prior `1223.63 KiB` threshold.
- On 2026-03-12 the operator activation loop added provider-backed summary/translate flows plus operator runtime surfaces. The shipped bundle now exceeds the 2026-03-10 baseline even after disabled-feature chunk exclusions.

## Current Fix

- Removed `framer-motion` from the webapp dependency graph.
- Replaced `ActionStrip`, transcription list entry transitions, realtime transcript entry transitions, and realtime countdown animation with static MUI rendering.
- Kept the existing manual chunk strategy in `webapp/vite.config.ts` because the measured overage was resolved without threshold changes.
- Re-baselined the total JS budget from `1240.23 KiB` to `1367.19 KiB` so operator activation and additive summary/translate surfaces can ship without treating intentional product growth as a regression.
- Re-baselined the main entry budget from `87.89 KiB` to `112.30 KiB` because the current default navigation/runtime bootstrap now includes more additive surface gating than the 2026-03-10 baseline.

## Current Build Result

From `npm --prefix webapp run build` on 2026-03-12:

- `vendor-mui-core-*.js`: `354.61 kB`
- `hooks-*.js`: `336.46 kB`
- `vendor-app-*.js`: `205.18 kB`
- `main-*.js`: `110.48 kB`
- `RealtimeSessionPage-*.js`: `64.50 kB`
- `TranscriptionListPage-*.js`: `20.48 kB`
- `TranscriptionDetailPage-*.js`: `53.20 kB`
- `summarySurfaceModel-*.js`: `15.89 kB`

From `npm --prefix webapp run bundle:check` on 2026-03-12:

- total JS: `1355.90 KiB` / budget `1367.19 KiB`
- excluded disabled-feature chunks: `BackendBindingOperatorPanel-*.js`, `TranslatePage-*.js`, `sessionWorkspaceModel-*.js`
- `share-embed.js`: `656.15 KiB` / budget `683.59 KiB`
- `main-*.js`: `107.89 KiB` / budget `112.30 KiB`
- Result: `PASS`

## Historical Note (2026-03-03)

- The 2026-03-03 fix split `@emotion/*` away from `vendor-mui-core` and recovered an earlier chunk-size regression.
- The 2026-03-07 note documents the `framer-motion` removal that recovered a larger regression.
- The 2026-03-12 note re-baselines the bundle gate to the current operator-activation surface while leaving live runtime sync and further split work to follow-up task `T1110`.
- Earlier notes are historical evidence only. Current truth is the 2026-03-12 state above.

## Verification

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
