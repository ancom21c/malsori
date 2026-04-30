# T1203 - Saved Record Detail/List Hardening

## Spec

### 문제

- Detail playback currently treats local chunk playback mainly as microphone realtime behavior.
- List/detail labels only distinguish `file` vs `realtime`, not batch vs realtime API file transport.

### 목표

- Make saved realtime-upload rows first-class in list/detail/search/playback without misclassifying them as microphone realtime sessions.

### 범위

- 포함:
  - list/detail transport badges
  - local audio loading for streaming file records
  - retry/export/share source decisions
  - focused regression tests
- 제외:
  - cloud sync v2 redesign
  - summary/translate feature changes

### 해결방안

- Keep `kind: "file"` for uploaded-file records and branch on additive transport metadata where needed.

### 수용 기준 (AC)

- [x] Realtime-upload rows appear in file history and are distinguishable by transport.
- [x] Detail can play/export available local audio for realtime-upload rows.
- [x] Batch rows still use remote audio and existing retry flow.

## Plan

1. Add list/detail label helpers for transport metadata.
2. Extend detail audio loading for streaming file records.
3. Route retry to the original transport.
4. Add targeted tests and run frontend gates.

## Review Checklist (Plan Review)

- [x] boundary / safe default / rollback이 맞는가?
- [x] scope가 다른 task와 겹치지 않는가?
- [x] verify 경로가 미리 정리돼 있는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current loop 목표와 직접 연결되는가?

## Self Review 2 - Safety

- [x] failure가 core flow에 전이되지 않는가?

## Self Review 3 - Executability

- [x] 구현 단위와 verify 명령을 바로 적을 수 있는가?

## Implementation Log

- [x] List/detail labels updated
- [x] Detail local audio loading updated
- [x] Retry routes batch rows through `/v1/transcribe` and streaming rows through realtime upload
- [x] Tests updated

## Review Checklist (Implementation Review)

- [x] regression / UX drift / ops risk가 없는가?
- [x] diff와 실제 구현이 spec을 벗어나지 않는가?

## Verify

- [x] `npm --prefix webapp run test`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
