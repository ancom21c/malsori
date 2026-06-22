# Design Strategy

This file captures stable design principles and invariants.

## Invariants ("must stay true")

- Reliability and operator clarity take precedence over decorative styling.
- The SPA route currently in focus owns at most one primary mobile action; do not let global and page-level CTAs compete.
- Icon-only controls need explicit accessible labels, and `prefers-reduced-motion` must be respected.
- Entry docs stay short and active-focused. Durable truth belongs in `docs/knowledge/`; completed loop evidence belongs in the archive index and archived boards.
- The browser-facing contract flows through the Malsori proxy boundary, so UI copy and settings must reflect proxy-managed behavior rather than direct RTZR access.

## Tradeoffs ("we choose X over Y because...")

- We choose a same-origin proxy boundary over direct browser-to-upstream access because it centralizes auth, persistence, endpoint policy, and recovery logic.
- We choose a restrained "Studio Console" hierarchy over ornamental effects so dense operator workflows stay readable on desktop and mobile.
- We choose curated knowledge docs plus archive-in-place history over a single giant README because current truth and completed evidence need different entrypoints.

## Progressive Disclosure

- `AGENTS.md` stays a table-of-contents, not a full spec.
- Stable knowledge lives in `docs/knowledge/` and is indexed.
- Active and completed loop folders live in `docs/todo/`, and completed history is indexed from `docs/history/README.md`.

## Mechanized Constraints (optional)

If a rule is important, prefer a check over a convention:
- linters/formatters
- tests/smoke checks
- CI guardrails (fail fast)
- `node scripts/check-todo-board-consistency.mjs`
