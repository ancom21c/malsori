---
name: repo-workflow
description: >
  Repo-local workflow for this project (plan -> implement -> verify), linked to docs/todo-workflow.md and repo-specific verify commands.
  Use when: making non-trivial changes in this repo.
---

# Repo Workflow (Local)

## Procedure

1. Plan
   - Create `docs/todo/<YYYY-MM-DD>-<loop-id>/` from `docs/todo-template/`.
   - Add a loop `README.md` and `T###-*.md` task docs.
   - Write acceptance criteria before implementing.

2. Implement
   - Keep changes small and testable.

3. Verify (repo-specific)
   - Docs: `node scripts/check-todo-board-consistency.mjs`
   - Frontend lint: `npm --prefix webapp run lint`
   - Frontend i18n: `npm --prefix webapp run i18n:check`
   - Frontend build: `npm --prefix webapp run build`
   - Frontend bundle gate: `npm --prefix webapp run bundle:check`
   - Frontend tests: `npm --prefix webapp run test`
   - Python syntax: `python -m compileall python_api/api_server`
   - Python tests: `PYTHONPATH=python_api pytest python_api/tests -q`
   - Smoke: `./scripts/post-deploy-smoke.sh`

4. Doc updates
   - Promote stable facts into `docs/knowledge/` and update `docs/knowledge/README.md`.
   - Reconcile `AGENTS.md`, `docs/README.md`, and `docs/history/README.md` in the same change.
