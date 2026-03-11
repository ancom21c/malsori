# Summary Feature Contract

This note captures the durable invariants for the summary feature so later implementation loops do not re-litigate the basics.

## Product Shape

- Summary is an additive artifact layered on top of the existing transcript experience.
- Two modes exist: `realtime` and `full`.
- `realtime` summary is progressive and can expose draft/final states while capture is still active.
- `full` summary is the consolidated session summary and may be recomputed from the full transcript or from finalized partitions, depending on the provider strategy chosen by implementation.

## Partitioning Rules

- Summary works on contiguous turn partitions only; a partition may never skip turns.
- Partitions must carry a stable range reference plus the source transcript revision used to generate them.
- Realtime capture may have one active mutable partition and multiple finalized partitions.
- Transcript corrections or late-final turns should mark affected summary output as stale instead of silently rewriting history.

## Prompt Presets

- Presets are first-class records with `id`, `version`, `label`, `language`, intended context, output schema, and supported modes.
- The default preset library includes at least `meeting`, `lecture`, `interview`, and `casual`.
- The product-safe fallback preset is currently `meeting` when confidence is too low or an unknown preset id is requested.
- Auto suggestion should keep `suggestedPresetId`, `appliedPresetId`, `confidence`, `reason`, and the evaluated early-turn range together.
- Persisted preset selection carries `selectionSource` (`default`, `auto`, `manual`) plus `applyScope` (`from_now`, `regenerate_all`).
- Preset choice may be auto-suggested from early session context, but user override always wins.

## UX Invariants

- Realtime and session detail surfaces expose a toggleable summary panel; transcript stays primary.
- Desktop uses a right-side rail; mobile uses a bottom sheet or accordion that does not displace the transcript viewport or transport controls.
- Summary state must be explicit: `disabled`, `pending`, `updating`, `ready`, `stale`, or `failed`.
- Summary blocks should link back to supporting transcript snippets so users can inspect evidence.

## Failure Isolation

- Summary failure is an artifact failure, not a transcription failure.
- Binding or provider issues should hide or disable summary surfaces without breaking the core STT flows.
- Summary provider/model selection remains operator-managed through feature bindings rather than new public settings fields.
