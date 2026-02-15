# Plan: P0 Default Presets + Snapshot Labels i18n

## Goal
- Remove remaining hardcoded Korean strings that can surface in the UI for:
  - Backend endpoint snapshot labels stored with transcriptions.
  - Seeded default preset names/descriptions.

## Scope
- `webapp/src/utils/transcriptionMetadata.ts`
- `webapp/src/data/defaultPresets.ts`
- `webapp/src/i18n/translations.ts`

## Approach
- Use `tStatic()` for non-React modules so seeding/snapshots use the user’s preferred locale at creation time.
- Add a missing key for the deleted preset label.
- Add keys for default preset name/description text.

## Notes
- Seeded preset names/descriptions and snapshot labels are stored in IndexedDB. They will not retroactively change when the user switches languages later (expected).

## Success Criteria
- `rg '[가-힣]' webapp/src --glob '!webapp/src/i18n/translations.ts' --glob '!webapp/src/**/*.test.ts'` no longer shows these user-facing strings.
- `cd webapp && npm test && npm run lint && npm run build` pass.
