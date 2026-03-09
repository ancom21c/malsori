# P1 Realtime Runtime Settings i18n

## Goal

Remove hardcoded Korean strings from the RuntimeStreamConfig (WebSocket) settings panel so EN/JA locales display correctly.

## Scope

- Replace Korean `label/placeholder/helperText` strings in `RUNTIME_SETTING_FIELDS` with translation keys.
- Add the corresponding translations in `webapp/src/i18n/translations.ts` for KO/EN/JA.

## Success Criteria

- No Hangul remains in `webapp/src/pages/RealtimeSessionPage.tsx` runtime setting field definitions.

