# Phase 4: Page Orchestration Decomposition

## Objective
Decompose oversized page controllers only after domain and adapter boundaries are clearer.

## Phase Discovery Gate
- [ ] Re-check `SettingsPage.tsx`, `RealtimeSessionPage.tsx`, and `TranscriptionDetailPage.tsx` for cohesive extraction candidates.
- [ ] Identify existing model/helper tests that can absorb logic before UI extraction.

## Implementation Checklist
- [ ] Extract pure state/decision logic before moving visual layout.
- [ ] Keep STT-first UX guardrails intact.
- [ ] Avoid nested cards or visual redesign unless a specific UX bug is in scope.
- [ ] Add tests around extracted models/hooks.

## Validation Checklist
- [ ] Affected Vitest tests plus relevant component tests.
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run i18n:check`
- [ ] `npm --prefix webapp run build`
- [ ] `npm --prefix webapp run test`

## Exit Criteria
- [ ] Target page files are smaller because cohesive logic moved behind named, tested helpers.
- [ ] User-visible STT, summary, translate, and settings behavior remains unchanged.
