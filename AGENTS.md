# Malsori Agent Guide

This repository uses `docs/` as the durable source of truth for product, rollout, and ops decisions. Promote stable conclusions there, and keep temporary execution notes under `.codex/workloops/`.

## Start Here

- `docs/README.md` - docs role/lifecycle index
- `docs/knowledge/README.md` - durable knowledge index and current entry points
- `docs/todo-workflow.md` - repo-local todo lifecycle and completion policy
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` - no-regression contract for shipped STT value
- `docs/plan-platform-expansion-rollout-2026-03-10.md` - additive rollout / rollback baseline
- `docs/plan-feature-backend-binding-2026-03-10.md` - backend profile / feature binding architecture
- `docs/plan-summary-feature-2026-03-11.md` - canonical summary feature spec for realtime/full summary
- `docs/plan-realtime-stt-file-upload-2026-04-30.md` - current execution plan for realtime STT file upload promotion
- `docs/todo/2026-04-30-realtime-stt-file-upload-loop/README.md` - current execution board for realtime STT file upload promotion
- `docs/knowledge/operator-feature-activation-contract.md` - durable activation order, boundary, and rollout rules
- `docs/knowledge/realtime-file-upload-contract.md` - durable storage / UX contract for realtime API file uploads
- `docs/knowledge/summary-feature-contract.md` - durable summary partition, preset, and freshness rules
- `docs/plan-operator-feature-activation-2026-03-11.md` - active operator activation and summary/translate plan
- `docs/todo/2026-03-11-operator-feature-activation-loop/README.md` - active operator activation and summary/translate board
- `docs/plan-summary-backend-2026-03-11.md` - latest completed execution plan for summary and backend settings work
- `docs/todo/2026-03-11-summary-backend-loop/README.md` - latest completed execution board
- `webapp/docs/IMPLEMENTATION_NOTES.md` - current implementation snapshot

## Working Rules

- Treat summary, QA, translate, and future TTS as additive surfaces. Core file transcription, realtime capture, and session detail remain primary.
- Update `docs/knowledge/` when a change adds durable terminology, contracts, UX rules, or operator guidance.
- Todo lifecycle follows `docs/todo-workflow.md` with `archive-in-place`; adding/removing/closing loop docs must update entry docs in the same change.
- Keep operator-only backend controls on the internal boundary; do not introduce new public per-feature endpoint settings when bindings can express the same intent.
- Current active execution loop: `docs/plan-realtime-stt-file-upload-2026-04-30.md` and `docs/todo/2026-04-30-realtime-stt-file-upload-loop/README.md`.
- Active operator execution loop: `docs/plan-operator-feature-activation-2026-03-11.md` and `docs/todo/2026-03-11-operator-feature-activation-loop/README.md`.
- Latest completed plan/board: `docs/plan-summary-backend-2026-03-11.md` and `docs/todo/2026-03-11-summary-backend-loop/README.md`.

## Module Guide

- `webapp/AGENTS.md` - frontend-specific constraints and summary UX guardrails

## Todo Doc Hygiene

- Keep this file short and active-focused.
- When todo loops are added, removed, or reclassified, update this file only when entrypoints or repo-wide workflow pointers changed.
- Completed history should live in archive/historical docs, not as a long running list here.
- Before treating work as completed, check the real doc state and completion evidence rather than trusting stale labels.
