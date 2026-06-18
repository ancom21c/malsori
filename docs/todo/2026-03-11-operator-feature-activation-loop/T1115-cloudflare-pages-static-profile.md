# T1115 - Cloudflare Pages Static Frontend Profile

## Spec

### 문제

- 현재 `webapp`은 static asset으로 빌드 가능하지만, 별도 origin의 backend를 붙이는 `Cloudflare Pages` 프로필에 필요한 최소 deploy contract가 repo에 고정돼 있지 않다.
- 실제로는 backend CORS가 비어 있고, static host에서 SPA route refresh를 처리할 fallback asset도 없다.
- Google Drive auth broker는 backend-relative OAuth callback/return contract라서 cross-origin static profile과 맞지 않는다.

### 목표

- 같은 레포에서 `Cloudflare Pages static frontend + remote python-api` 배포 프로필을 repeatable하게 만든다.
- cross-origin public API 호출과 SPA route refresh가 실제로 동작하도록 최소 자산과 backend 설정 경계를 추가한다.
- Google Drive 연동은 이 프로필에서 fail-closed로 비활성화하는 운영 계약을 남긴다.

### 범위

- 포함:
  - backend public CORS allowlist 설정/검증
  - Cloudflare Pages용 SPA fallback / runtime-config cache header asset
  - static profile runtime config 예시와 deploy/operator 문서
  - regression test 추가
- 제외:
  - Google Drive broker의 cross-origin 지원 추가
  - 별도 GitHub repo 분리
  - internal admin surface를 public static profile에서 노출

### 해결방안

- python-api는 `CORS_ALLOWED_ORIGINS` allowlist가 있을 때만 public CORS 응답을 열고, 기본값은 닫아 둔다.
- `webapp/public/_redirects`와 `webapp/public/_headers`를 추가해 Cloudflare Pages에서 SPA route refresh와 runtime config freshness를 보장한다.
- `webapp/public/config/malsori-config.js`와 deploy knowledge/doc에 static profile 예시를 남기고, `driveAuthMode: "disabled"` / empty `adminApiBaseUrl` / remote `apiBaseUrl` 계약을 고정한다.

### 수용 기준 (AC)

- [x] configured origin만 public API에 CORS preflight / response header를 받는다.
- [x] Cloudflare Pages build output에 SPA fallback asset과 runtime-config cache header asset이 포함된다.
- [x] static profile 예시가 `apiBaseUrl=<remote origin>`, `adminApiBaseUrl=""`, `driveAuthMode="disabled"` 계약을 명시한다.
- [x] Google Drive broker가 cross-origin static profile에 포함되지 않는다는 운영 문서가 남아 있다.

## Plan

1. active operator loop에 static-profile task를 등록하고 AC를 고정한다.
2. backend CORS allowlist와 Cloudflare Pages public assets를 최소 범위로 추가한다.
3. deploy/knowledge 문서를 갱신하고 full verify를 다시 실행한다.

## Review Checklist (Plan Review)

- [x] same-origin deploy 기본 경로를 깨지 않는가?
- [x] CORS는 allowlist가 있을 때만 열리고, 기본은 fail-closed인가?
- [x] Google Drive broker unsupported 범위를 문서로 명확히 남기는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current operator/deploy loop의 public/internal boundary 및 rollout profile 범위에 직접 연결되는가?

## Self Review 2 - Safety

- [x] public static profile에서 internal admin/telemetry surface를 새로 노출하지 않는가?

## Self Review 3 - Executability

- [x] local regression test와 build output 검증으로 same-turn 확인이 가능한가?

## Implementation Log

- [x] backend CORS allowlist와 regression test를 추가했다.
- [x] Cloudflare Pages용 `_redirects` / `_headers`와 runtime config 예시를 추가했다.
- [x] deploy README / knowledge index / operator board를 갱신했다.

## Review Checklist (Implementation Review)

- [x] same-origin deploy, local dev proxy, existing Drive-enabled same-origin path는 그대로 유지되는가?
- [x] disallowed origin은 계속 fail-closed인가?
- [x] static profile contract가 docs와 shipped asset 양쪽에서 일치하는가?

## Verify

- [x] `git diff --check`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
- [x] `npm --prefix webapp run test`
- [x] `python -m compileall python_api/api_server`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] `./scripts/post-deploy-smoke.sh`
