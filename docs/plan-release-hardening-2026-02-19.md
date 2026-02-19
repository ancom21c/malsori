# Plan: Release Hardening (2026-02-19)

## Goal

Prepare the current UI/UX changes for deployment with a clean commit:

- Keep experimental UI concepts dev-only (not publicly reachable in production).
- Strengthen router-level QA coverage.
- Review and improve frontend bundle performance.

## Scope

1. Deployment commit cleanup
- Ignore local Playwright runtime artifacts (`.playwright-cli/`).
- Keep only deploy-relevant source/docs in commit.

2. Dev-only gating
- Restrict `/lab/ui-concepts` route to development mode only.

3. QA reinforcement
- Add AppRouter smoke tests for:
  - root route render
  - unknown route redirect
  - `ui-concepts` route blocked outside development mode

4. Performance review
- Introduce explicit Rollup `manualChunks` strategy in `vite.config.ts`.
- Re-run build and record chunk-size outcomes + residual risks.

## Verification Checklist

- `cd webapp && npm run lint`
- `cd webapp && npm test`
- `cd webapp && npm run build`

## Expected Outcome

- Production build no longer exposes experimental concept route.
- Router behavior has automated smoke tests.
- Bundle split strategy documented and verified by build output.
