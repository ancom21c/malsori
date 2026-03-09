# Studio Console Evidence Template

## Stage Metadata

- Stage: `S0|S1|S2|S3`
- Date: `YYYY-MM-DD`
- Commit: `<git-sha>`
- Reviewer: `<name>`

## Checklist

- [ ] Desktop before/after screenshots captured
- [ ] Mobile before/after screenshots captured
- [ ] `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh` log attached
- [ ] A11y quick notes (skip-link, heading, landmark, focus) attached

## Artifacts

- `desktop-before.png`
- `desktop-after.png`
- `mobile-before.png`
- `mobile-after.png`
- `smoke.log`
- `a11y-notes.md`

## Storage Path

`docs/ui-proposed/2026-03-03-studio-console-v3/evidence/<stage>/<yyyymmdd>/`

