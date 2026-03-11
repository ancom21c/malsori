# Backend Settings Operator Contract

This note captures the durable UX and safety rules for the operator-only backend settings surface.

## Live Mutation Safety

- `Apply to server` and `Return to server default` are live runtime mutations, not ordinary form saves.
- Live mutations must never execute immediately on first click; operators get an explicit review step first.
- The review step must show both the current server state and the next server state before the mutation runs.
- If the current server state has not been refreshed yet, live mutations stay blocked until the operator refreshes it.

## Review Content

- The confirmation surface shows at least: setting source, deployment, base URL, SSL mode, and credential usage.
- `Return to server default` may not know every resolved value ahead of time; unknown values are shown as server-managed, not guessed.
- Apply and reset flows use different visual tone: apply is primary, reset is warning/destructive.

## Inline Blocking Rules

- Dirty connection drafts block live mutations until the saved connection settings are restored or saved.
- Missing internal admin URL or missing admin token blocks live mutations before the confirm step.
- `Return to server default` is blocked when the server is already on the server default path and no local override is active.
- Blocked actions must explain why inline near the controls rather than only through disabled buttons.

## Feedback Rules

- Pending state disables duplicate submit from the review dialog.
- Success feedback must say what changed and how to revert.
- Failure keeps the current server state intact, surfaces the error, and allows retry from the same review surface.
