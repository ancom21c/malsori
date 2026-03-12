# T1101 - Internal Operator Admin Surface Activation

## Spec

### 문제

- 현재 배포본은 `adminApiBaseUrl`이 비어 있고 backend admin이 꺼져 있어 operator binding plane을 앱에서 실제로 쓸 수 없다.
- public 앱에서 summary/translate raw endpoint를 설정하게 되면 binding architecture가 무너진다.

### 목표

- internal ingress, runtime config, admin token 경로를 실제 deploy/smoke 가능한 상태로 연다.
- operator-only backend controls는 internal surface에서만 접근 가능하게 만든다.

### 범위

- 포함:
  - internal ingress / `adminApiBaseUrl` runtime config
  - backend admin enablement / token contract
  - settings에서 operator panel availability gating
  - public/internal smoke contract
- 제외:
  - summary/translate provider execution 자체
  - public per-feature backend settings

### 해결방안

- Helm/runtime config에서 public/internal base를 분리한다.
- operator UI는 internal base 또는 admin auth가 없으면 hidden/disabled helper로 남긴다.
- `/v1/backend/*`와 runtime-error endpoint는 public host에서 계속 blocked여야 한다.

### 수용 기준 (AC)

- [x] internal operator surface activation 조건과 deploy contract가 문서화된다.
- [x] public per-feature backend settings가 out-of-scope로 고정된다.
- [x] public/internal smoke 및 rollback 기준이 명시된다.

## Plan

1. deploy values, ingress, runtime config에서 internal admin base를 어떻게 주입할지 고정한다.
2. backend admin enablement와 token guard를 public surface와 분리한다.
3. settings/operator panel의 availability gating을 internal runtime config 기준으로 정한다.
4. public/internal smoke expectations와 rollback path를 함께 문서화한다.

## Review Checklist (Plan Review)

- [x] `/v1/backend/*`가 public host에서 계속 차단되는가?
- [x] public 앱에 summary/translate endpoint 필드를 추가하지 않는가?
- [x] admin token / internal ingress / runtime config 책임이 분리되는가?
- [x] rollback 시 operator surface만 닫고 core STT는 유지할 수 있는가?

## Self Review 1 - Scope Fit

- [x] provider execution 이전에 operator plane을 여는 선행 작업이라 P0가 맞다.
- [x] deploy/runtime/public-internal boundary를 한 task로 묶는 편이 구현 단위상 자연스럽다.

## Self Review 2 - Safety

- [x] public exposure 방지와 rollback이 중심 요구사항으로 들어갔다.
- [x] internal surface unavailable 상태를 UX safe default와 함께 정의했다.

## Self Review 3 - Executability

- [x] chart/runtime config/settings gating/smoke로 구현 경로가 분해 가능하다.
- [x] verify 명령을 Helm template + smoke 기준으로 바로 적을 수 있다.

## Implementation Log

repo 기준 구현은 대부분 landed 상태다. 남은 일은 environment-specific internal host/token wiring과 deploy evidence 취합이다.

- [x] internal ingress / `adminApiBaseUrl` / admin token deploy contract를 chart/runtime/deploy docs에 반영했다.
- [x] settings operator panel availability gating을 runtime config와 연결했다.
- [x] public/internal boundary smoke expectations를 스크립트와 운영 문서에 정리했다.

## Review Checklist (Implementation Review)

- [ ] public host가 `/v1/backend/*`와 runtime-error endpoint를 계속 차단하는가?
- [ ] internal surface off 상태에서 operator UI가 broken control이 아니라 helper/disabled로 남는가?
- [ ] core STT routes/settings는 이 변경과 무관하게 동작하는가?

## Verify

- [ ] `helm template malsori infra/charts/malsori -f infra/deploy/values.malsori.yaml`
- [ ] `RUN_UI_SMOKE=1 INTERNAL_BASE_URL=<internal-base> ./scripts/post-deploy-smoke.sh`
- [ ] `git diff --check`
