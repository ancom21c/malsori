# Service Worker Cache Playbook (2026-03-04)

## Current Runtime Policy

Code references:

- Registration: `webapp/src/registerServiceWorker.ts`
- Worker logic: `webapp/src/service-worker.js`
- Build-time hash/versioning: `webapp/vite.config.ts`

Policy summary:

1. Service worker is enabled only in production builds.
2. Cache key is per-build (`malsori-app-cache-<build-hash>`).
3. On activate, old cache versions are deleted and new worker claims clients.
4. Navigation requests use network-first (`/index.html` fallback from cache).
5. `/config/malsori-config.js` uses network-first with cached fallback.
6. Same-origin scripts/styles use cache-first with fill-on-miss.
7. Other GET assets use network-first with cache fallback.

## Release Checklist (Cache/Versioning)

Run these checks after deployment:

```bash
curl -fsSL https://malsori.ancom.duckdns.org/service-worker.js | rg -n "malsori-app-cache-|SKIP_WAITING"
curl -fsSL https://malsori.ancom.duckdns.org/service-worker.js | rg -n "__BUILD_HASH__" && echo "FAIL: placeholder remained"
curl -fsSL https://malsori.ancom.duckdns.org/manifest.webmanifest | rg -n "\\?v="
curl -fsSL https://malsori.ancom.duckdns.org/config/malsori-config.js | rg -n "__MALSORI_CONFIG__"
RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh
```

`scripts/post-deploy-smoke.sh` now includes a cache-contract block that fails when:

- `service-worker.js` still contains `__BUILD_HASH__`
- `manifest.webmanifest` icon URLs are not hash-versioned
- runtime config contract (`window.__MALSORI_CONFIG__`) is missing

## Incident Response (Stale UI / Blank Screen)

1. Confirm deployment health:
   - `curl -fsSL https://malsori.ancom.duckdns.org/v1/health`
2. Confirm client is on latest app shell:
   - hard refresh (`Ctrl/Cmd + Shift + R`)
   - if still stale: clear site data for `malsori.ancom.duckdns.org`
3. Confirm service worker was replaced:
   - DevTools -> Application -> Service Workers -> active script is `/service-worker.js`
   - unregister + reload once if activation is stuck
4. If issue persists, collect:
   - route URL, timestamp, browser version, screenshot
   - console error + network failure line

## User-Facing Support Message (Template)

"배포 직후에는 브라우저 캐시 때문에 이전 화면이 잠시 보일 수 있습니다. 새로고침(강력 새로고침)을 먼저 시도해 주세요. 문제가 계속되면 사이트 데이터 삭제 후 다시 접속해 주세요."
