# Settings Navigation Guard Re-Design (2026-03-07)

## Goal
- Restore unsaved-change route blocking on `/settings` without reintroducing blank-screen regressions.

## Problem
- `SettingsPage` requires in-app navigation blocking for unsaved connection settings.
- `useBlocker` only works under a data router.
- The current app shell used `BrowserRouter`, so enabling `useBlocker` crashed `/settings` at runtime.

## Design
1. Promote `webapp/src/app/AppRouter.tsx` from `BrowserRouter` to `createBrowserRouter` + `RouterProvider`.
2. Keep the existing route structure and `MainLayout`, but host route content via `Outlet`.
3. Restore `SettingsPage` route blocking with `useBlocker` + `useBeforeUnload`.
4. Verify with lint/build/tests and a local browser smoke for `/settings`.

## Acceptance
- `/settings` renders under the production bundle with no `pageerror`.
- Unsaved connection settings trigger:
  - browser `beforeunload` protection
  - in-app route confirmation on pathname changes
- Existing routes `/`, `/settings`, `/realtime`, detail routes continue to load.

## Self Review Checklist
- Does the router change preserve current route paths and lazy loading?
- Does `useBlocker` run only inside a data router?
- Is the navigation guard limited to dirty connection settings?
- Are verification commands and browser smoke run before commit?
