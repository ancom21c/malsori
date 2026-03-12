# Docs Index

`docs/` is the repo-local system of record for canonical specs, active execution loops, and historical evidence.

## Roles

- `Canonical`: durable product, rollout, UX, and ops rules under `docs/plan-*.md` baselines and `docs/knowledge/*`.
- `Active execution`: the current open plan + board + task docs that drive implementation right now.
- `Historical`: completed loop plans, boards, task logs, and publish-worthy evidence kept in place after closure.

## Current Entry Points

- `docs/knowledge/README.md` - durable knowledge index and current documentation entry points
- `docs/todo-workflow.md` - repo-local todo lifecycle, completion policy, and plan/review/verify rules
- `docs/plan-stt-value-preservation-baseline-2026-03-10.md` - shipped STT no-regression baseline
- `docs/plan-platform-expansion-rollout-2026-03-10.md` - additive rollout / rollback baseline
- `docs/plan-feature-backend-binding-2026-03-10.md` - operator-managed backend binding architecture
- `docs/plan-summary-feature-2026-03-11.md` - canonical summary feature spec
- `docs/plan-operator-feature-activation-2026-03-11.md` - current execution plan
- `docs/todo/2026-03-11-operator-feature-activation-loop/README.md` - current execution board
- `docs/plan-summary-backend-2026-03-11.md` - latest completed execution plan
- `docs/todo/2026-03-11-summary-backend-loop/README.md` - latest completed execution board

## Workflow Templates

- `docs/todo-template/README.md` - how to start or extend a loop using the local templates
- `docs/todo-template/plan-template.md` - plan template for a new execution loop
- `docs/todo-template/loop-board-template.md` - board template for the active loop folder
- `docs/todo-template/task-template.md` - task template for `Txxxx` work items

## Lifecycle Policy

- Completion policy is `archive-in-place`.
- Completed `docs/todo/<loop>/` folders stay in the repo as historical execution records.
- Scratch notes, command transcripts, and disposable self-review logs stay under `.codex/workloops/`.
- When opening, closing, adding, or removing loop docs, update the repo entry docs in the same change.

## Entry Doc Hygiene

- Keep this doc active-focused.
- Move long completed history into archive/historical docs instead of piling it up here.
- Reconcile active/completed status against real doc state and completion evidence.
