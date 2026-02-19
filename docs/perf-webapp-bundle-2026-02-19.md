# Webapp Bundle Performance Review (2026-02-19)

## Summary

Production bundle splitting was improved by adding explicit Rollup `manualChunks` groups in `webapp/vite.config.ts`.

## Measured Build Outputs

### Before (`vite build`, 2026-02-19 earlier run)

- `dist/assets/ListAlt-*.js`: `568.92 kB` (gzip `180.23 kB`)
- `dist/assets/main-*.js`: `296.52 kB` (gzip `95.99 kB`)
- Result: chunk-size warning (`> 500 kB`) reported.

### After (`vite build`, 2026-02-19 after change)

- `dist/assets/vendor-mui-core-*.js`: `263.34 kB` (gzip `75.09 kB`)
- `dist/assets/vendor-misc-*.js`: `196.18 kB` (gzip `66.45 kB`)
- `dist/assets/vendor-react-*.js`: `190.23 kB` (gzip `59.35 kB`)
- `dist/assets/vendor-app-*.js`: `129.25 kB` (gzip `43.90 kB`)
- `dist/assets/main-*.js`: `70.59 kB` (gzip `21.79 kB`)
- Result: no app chunk exceeded 500 kB warning threshold.

## Notes

- `public/share-embed/share-embed.js` remains ~`619 kB` because it is intentionally built as a single IIFE (`inlineDynamicImports: true`) for embed distribution.
- Runtime behavior should improve for repeat navigations due to more cache-stable vendor chunking.

## Next Performance Follow-ups

1. If needed, split rarely used route features further (e.g., heavy lab-only modules).
2. Add bundle budget checks in CI to detect regressions early.
