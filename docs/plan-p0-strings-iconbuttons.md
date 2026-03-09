# Plan: P0 Hardcoded Strings + Icon Button Sweep

## Goal
- Remove remaining user-facing hardcoded strings in the webapp UI and route them through `useI18n().t`.
- Ensure icon-only interactive controls have an accessible name (primarily via `aria-label`).

## Scope (this pass)
- Webapp UI: `SettingsPage`, `UploadDialog`, `RealtimeSessionPage`, `BackendEndpointPresetSelector`, `MainLayout`, `MicFab`.
- Add missing i18n keys under `webapp/src/i18n/translations.ts`.

## Changes
- Replace hardcoded labels:
  - `Python API Base URL`, `API Base URL`, `Client ID`, `Client Secret`, `RequestConfig (JSON)`, `Runtime RequestConfig`.
- Localize deployment labels (`RTZR API`, `On-prem`) used in chips/toggles/selector menus.
- Remove `defaultValue` usage where the translation key already exists.
- Update backend preset apply snackbar to use a localized template with the preset name.
- Re-scan icon-only controls (`IconButton`, `Fab`, icon-only `Button`) and add `aria-label` if missing.

## Success Criteria
- `rg 'label="' webapp/src` has no remaining user-facing hardcoded labels.
- All icon-only controls have `aria-label`.
- `cd webapp && npm test && npm run lint && npm run build` pass.
