# P1 UI Refresh (Webapp)

## Goal

Make the UI feel intentional and "product-grade" (less default-MUI), while improving first-run clarity on the core flows (upload, live session, history).

## Direction

- Visual: "studio console" (recording gear / control room) vibe.
- Keep the teal/peach palette, but increase hierarchy through typography, spacing, and surface treatment.

## Scope (Implemented 2026-02-19)

### P0

- [x] Transcription list empty state: stop referencing a "+ button" when the UI is actually FAB icons; show 2 explicit CTAs that match the actions (Upload file, Start live session).
- [x] Mobile ergonomics: prevent FABs from covering filters/content; adjust layout/padding and/or consolidate actions (e.g., SpeedDial or bottom action bar).

### P1

- [x] Transcription list IA: reduce filter dominance; keep the default view focused on search + quick toggles, and move advanced filters behind a collapsible section.
- [x] Header/action hierarchy: promote Upload/Live actions to the top area; keep Drive/Sync status visible but visually lighter.
- [x] Settings "JSON editor" UX: treat as an advanced area; use monospace, add validation/error messaging, add copy/format affordances, and reduce the "raw textarea" feel.

### P2

- [x] Theme v2 polish: add MUI component overrides (Card/TextField/Button/Chip/Tabs) for consistent radii, shadows, borders, and focus rings.
- [x] Motion: add 1-2 meaningful animations (page load, staggered list reveal) while respecting reduced motion.

## Related Backlog (Later)

- Waveform visualization + timeline scrubbing with per-segment loop markers.
- Realtime UX: live latency indicator, reconnect state/toast with retry/abort affordances, surfaced server error metadata.
- Offline-first: chunk compaction, storage quota monitoring, ability to resume partially uploaded realtime sessions.
- Preset management polish: JSON import/export, validation helpers, multi-default guardrails across file/streaming types.
- Secure credential storage guidance (optional Web Crypto wrapping) and environment sanity checks before starting sessions.
- Testing: AppRouter smoke tests and visual regression hooks once UI stabilises.

## Candidate Files

- webapp/src/app/theme.ts
- webapp/src/index.css
- webapp/src/layouts/MainLayout.tsx
- webapp/src/pages/TranscriptionListPage.tsx
- webapp/src/pages/SettingsPage.tsx

## Success Criteria

- First-time users can discover both primary actions without relying on floating controls.
- Mobile layouts keep actions available without covering form controls.
- Visual hierarchy reads correctly at a glance: primary actions > list content > advanced filters.
