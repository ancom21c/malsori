# Mobile Background Performance Fallback (2026-03-05)

## Context

- Global background used layered gradients + grid lines + `background-attachment: fixed`.
- On low-end mobile devices this can increase repaint cost during scroll.

## Change

- File: `webapp/src/index.css`
- Applied mobile/coarse-pointer fallback:
  - remove grid layers on mobile
  - switch `background-attachment` to `scroll`
  - keep color tone via simplified radial + linear gradients
- Added `prefers-reduced-motion` fallback with simplified background.

## Verification

- `npm --prefix webapp run build`
- `python3 scripts/post-deploy-ui-smoke.py --base-url https://malsori.ancom.duckdns.org --screenshot-dir docs/ui-proposed/2026-03-03-studio-console-v3/evidence/p2-hardening/20260305`

Observed in smoke summary:

- Mobile route `/` loaded with `status=200`, `page_error_count=0`, `console_error_count=0`
- `quick_fab_found=true`, `sticky_cta_found=true`, `overlap=false`

Evidence:

- `docs/ui-proposed/2026-03-03-studio-console-v3/evidence/p2-hardening/20260305/mobile-root.png`
- `docs/ui-proposed/2026-03-03-studio-console-v3/evidence/p2-hardening/20260305/smoke.log`

