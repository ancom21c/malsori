# Malsori Agent Guide

This repository uses `docs/` as the durable source of truth for product, rollout, and ops decisions. Promote stable conclusions there, and keep temporary execution notes under `.codex/workloops/`.

## Start Here

- `docs/knowledge/README.md` - durable knowledge index and current entry points
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` - no-regression contract for shipped STT value
- `docs/plan-platform-expansion-rollout-2026-03-10.md` - additive rollout / rollback baseline
- `docs/plan-feature-backend-binding-2026-03-10.md` - backend profile / feature binding architecture
- `docs/plan-summary-feature-2026-03-11.md` - canonical summary feature spec for realtime/full summary
- `docs/plan-summary-backend-2026-03-11.md` - latest completed execution plan for summary and backend settings work
- `docs/todo/2026-03-11-summary-backend-loop/README.md` - latest completed execution board
- `webapp/docs/IMPLEMENTATION_NOTES.md` - current implementation snapshot

## Working Rules

- Treat summary, QA, translate, and future TTS as additive surfaces. Core file transcription, realtime capture, and session detail remain primary.
- Update `docs/knowledge/` when a change adds durable terminology, contracts, UX rules, or operator guidance.
- Keep operator-only backend controls on the internal boundary; do not introduce new public per-feature endpoint settings when bindings can express the same intent.
- No active execution loop is open right now. Latest completed plan/board: `docs/plan-summary-backend-2026-03-11.md` and `docs/todo/2026-03-11-summary-backend-loop/README.md`.

## Module Guide

- `webapp/AGENTS.md` - frontend-specific constraints and summary UX guardrails
