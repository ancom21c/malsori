# P0 UX Fixes (Transcription Screens)

## Goal

Fix high-impact UX issues that cause confusing empty states, broken i18n output in EN/JA, and missing a11y labels on icon-only controls.

## Scope (P0)

- Transcription list: avoid empty-state flash while IndexedDB query is still loading.
- Transcription detail/share viewer: show an explicit empty-state when there are no segments (instead of a blank area).
- i18n hygiene:
  - Replace `t("...Korean sentence...")` misuse with proper translation keys.
  - Add missing keys used by snackbars/labels so EN/JA don't show Korean `defaultValue`s or raw keys.
- a11y: add `aria-label` for icon-only buttons (cloud toggle, delete, copy link).

## Non-goals (Deferred)

- Drive sync redesign/architecture changes.
- Broad i18n coverage beyond fixing obvious breakages in the touched flows.

## Success Criteria

- EN locale does not show Korean strings on the touched screens.
- Transcription list shows a spinner while loading, then either list or empty state.
- Detail/share pages show a clear message when there are no saved segments.
- Icon-only buttons have meaningful `aria-label`s.

