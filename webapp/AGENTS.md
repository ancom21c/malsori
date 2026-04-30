# Malsori Webapp Agent Guide

This file is the frontend-specific companion to the repo root `AGENTS.md`.

## Project Surface

- Stack: React 19, Vite 7, TypeScript, Material UI, Dexie, Zustand, TanStack Query, and Notistack.
- Primary user value: file transcription, realtime capture, session detail playback/edit/export, and settings/operator configuration.
- Additive routes: `/sessions`, `/capture/*`, `/translate`.

## Canonical References

- `../AGENTS.md`
- `../docs/knowledge/README.md`
- `../docs/plan-ui-remediation-2026-03-06.md`
- `../docs/plan-stt-value-preservation-baseline-2026-03-10.md`
- `../docs/plan-platform-expansion-rollout-2026-03-10.md`
- `../docs/plan-feature-backend-binding-2026-03-10.md`
- `../docs/plan-summary-feature-2026-03-11.md`
- `../docs/plan-realtime-stt-file-upload-2026-04-30.md` - current execution plan for realtime STT file upload promotion
- `../docs/todo/2026-04-30-realtime-stt-file-upload-loop/README.md` - current execution board for realtime STT file upload promotion
- `../docs/knowledge/operator-feature-activation-contract.md`
- `../docs/knowledge/realtime-file-upload-contract.md`
- `../docs/knowledge/summary-feature-contract.md`
- `../docs/plan-operator-feature-activation-2026-03-11.md` - active operator execution plan
- `../docs/todo/2026-03-11-operator-feature-activation-loop/README.md` - active operator execution board
- `../docs/plan-summary-backend-2026-03-11.md` - latest completed execution plan
- `../docs/todo/2026-03-11-summary-backend-loop/README.md` - latest completed execution board
- `docs/IMPLEMENTATION_NOTES.md`

## Frontend Rules

- Keep STT-first behavior intact. Summary, QA, translate, and future TTS remain additive surfaces.
- Use same-origin `/` as the public API default. Operator-only backend controls stay behind the internal `/v1/backend/*` boundary.
- Realtime mobile UX is a hard guardrail. Transcript viewport and transport controls stay primary even when additive features are enabled.
- Summary UX uses toggleable secondary surfaces. Desktop prefers a right rail; mobile prefers a bottom sheet or accordion.
- Summary updates must not steal focus, auto-scroll the user away from current reading position, or displace the transport dock.
- Capability-off or binding-misconfigured states should render as hidden/disabled helper UI, not broken controls.

## i18n

- React UI strings use `useI18n().t(key)`.
- Non-React modules use `tStatic(key, options)`.
- User-facing persisted text should use stable keys or versioned content decisions, not ad-hoc untranslated strings.

## Todo Doc Hygiene

- Todo lifecycle inherits `../docs/todo-workflow.md`.
- Keep this module guide active-focused and leave long completed history to the repo root historical docs.
- If frontend entrypoints or current-loop references change, update this file in the same change.
