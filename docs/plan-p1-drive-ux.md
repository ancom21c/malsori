# P1 Drive UX / Copy / i18n

## Goal

Make the Google Drive sync experience understandable and properly localized.

## Scope

- Header drive status (`CloudSyncStatus`):
  - i18n for connect/disconnect/status labels
  - tooltip that explains what Drive sync does at a high level
- Conflict resolution dialog:
  - i18n for all user-facing strings
  - copy polish to clearly communicate Merge vs Replace risks
- Help page:
  - add a short bullet about Drive sync so users can discover the feature

## Success Criteria

- KO/EN/JA show localized strings (no hardcoded English) for Drive UI.
- Users can understand:
  - what "Connect Drive" does
  - what happens on account conflict (Merge/Replace)

