# Knowledge Index

`docs/knowledge/` stores durable product and architecture knowledge that should survive beyond a single implementation loop.

## Current Entry Points

- `docs/README.md` - docs role/lifecycle index for canonical, active, and historical records
- `docs/todo-workflow.md` - repo-local todo lifecycle and completion policy
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` - shipped STT no-regression contract
- `docs/plan-platform-expansion-rollout-2026-03-10.md` - additive rollout / rollback baseline
- `docs/plan-feature-backend-binding-2026-03-10.md` - operator-managed backend binding architecture
- `docs/plan-summary-feature-2026-03-11.md` - canonical summary feature spec
- `docs/plan-operator-feature-activation-2026-03-11.md` - current execution plan for internal operator activation and summary/translate implementation
- `docs/todo/2026-03-11-operator-feature-activation-loop/README.md` - current execution board for operator activation and summary/translate work
- `docs/knowledge/backend-settings-operator-contract.md` - durable operator UX and safety rules for live backend mutations
- `docs/knowledge/operator-feature-activation-contract.md` - durable activation order and boundary rules for operator-managed additive features
- `docs/knowledge/summary-feature-contract.md` - durable summary terminology and invariants

## Usage Rules

- Put stable behavior, domain terminology, UX invariants, and operator rules here.
- Keep todo lifecycle rules in `docs/todo-workflow.md`, not scattered across per-loop boards.
- Keep temporary task plans, self-review notes, and execution logs in `.codex/workloops/`.
- When a plan document becomes a lasting reference, add or update its corresponding `docs/knowledge/` entry.

## Todo Closeout Rule

- Promote only the durable minimum here.
- Keep loop-specific evidence and detailed history in archive/historical docs.
- Update this index in the same change when knowledge docs are added or retired.
