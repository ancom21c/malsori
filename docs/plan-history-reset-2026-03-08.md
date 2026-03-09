## Goal

- Extract historical RTZR credentials into a local-only Kubernetes Secret manifest.
- Keep that manifest out of Git.
- Preserve the current full history in a local backup branch.
- Rewrite `main` so GitHub only sees a single current-state commit.

## Steps

1. Ignore `infra/deploy/local/` and keep the generated Secret manifest local-only.
2. Commit the tracked preparation changes on the current `main`.
3. Create a local backup branch pointing to the pre-rewrite `main` tip.
4. Recreate `main` as an orphan branch from the current working tree and commit one clean snapshot.
5. Force-push rewritten `main` to `origin/main`.

## Safety Notes

- The backup branch stays local so old history is not pushed back to GitHub.
- The ignored Secret manifest is never added to Git.
- Even after the history rewrite, previously exposed credentials should be treated as compromised.
