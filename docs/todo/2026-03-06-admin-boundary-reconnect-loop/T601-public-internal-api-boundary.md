# T601 - Public/Internal API Boundary Split + Default Base 정리

## Spec

### 문제

- current webapp은 public API와 internal admin API를 모두 하나의 `apiBaseUrl`로 호출한다.
- 운영 정책은 `/v1/backend/*`, `/v1/observability/runtime-error`를 internal-only로 분리한다.
- chart default의 `/api` fallback은 실제 nginx 구성과 맞지 않아 fresh install 기본값이 깨진다.

### 목표

- public surface와 internal operator surface를 구조적으로 분리한다.
- fresh install 기본값도 dead route 없이 self-consistent 하게 만든다.
- runtime error telemetry가 internal-only policy를 위반하지 않도록 한다.

### 범위

- 포함:
  - `apiBaseUrl` / `adminApiBaseUrl` 분리
  - API client의 public/admin path ownership 재정의
  - runtime config / chart defaults / docs 정리
  - runtime error reporter base URL contract 정리
- 제외:
  - operator UX 세부 배치 자체는 T603에서 보강

### 해결방안

- settings store와 runtime config에 `adminApiBaseUrl`을 추가한다.
- public API default는 same-origin root contract로 정리하고 `/api` dead fallback을 제거한다.
- `RtzrApiClient`는 public/admin endpoint builder를 분리한다.
- `runtimeErrorReporter`는 `adminApiBaseUrl`이 명시된 경우에만 internal telemetry endpoint를 사용한다.
- chart default와 deploy README를 same-origin/public root + optional admin base model로 맞춘다.

### 상세 설계

- `apiBaseUrl` 기본값은 `""` 또는 `/` 기반 same-origin root로 정규화하고, URL builder가 `/v1/...`를 올바르게 붙이도록 한다.
- `adminApiBaseUrl` 기본값은 empty string이다.
- `getHealthStatus()`와 일반 transcription API는 public base를 사용한다.
- `getBackendEndpointState()`, `updateBackendEndpoint()`, `resetBackendEndpoint()`, runtime error reporter는 admin base만 사용한다.
- admin base가 비어 있으면 operator API는 호출 자체를 차단하고 UI는 disabled/informational state를 보여준다.
- deploy docs는 `public ingress host`와 `internal admin host`를 별도 예시로 문서화한다.

### 수용 기준 (AC)

- [ ] public API와 internal API가 서로 다른 base URL로 분리된다.
- [ ] chart default/fresh install에서 API default가 dead path를 만들지 않는다.
- [ ] runtime error telemetry가 public base로 internal path를 호출하지 않는다.
- [ ] docs/values/runtime config 설명이 실제 ownership과 일치한다.

## Plan (Review 대상)

1. 현재 public/admin API 호출 지점을 inventory로 고정한다.
2. settings/runtime config/store/schema에서 `adminApiBaseUrl`을 도입한다.
3. API client와 telemetry routing을 base ownership 기준으로 분리한다.
4. chart default와 README를 self-consistent 하게 갱신한다.
5. public/internal surface smoke 기준을 Verify에 정리한다.

## Review Checklist (Plan Review)

- [x] internal-only endpoint가 public base로 fallback되지 않도록 contract를 분명히 했는가?
- [x] fresh install default와 prod-like deploy values를 모두 고려했는가?
- [x] API surface 분리와 UX 배치 작업을 분리해 P0 범위를 과도하게 넓히지 않았는가?

## Self Review (Spec/Plan)

- [x] 가장 큰 spec-implementation mismatch를 직접 겨냥한다.
- [x] default path 문제와 internal telemetry 문제를 한 contract 안에서 해결한다.
- [x] T603가 이 task의 결과를 받아 operator UI를 정리할 수 있도록 dependency가 선명하다.

## Implementation Log

- [ ] public/admin endpoint inventory 작성
- [ ] settings/runtime config에 `adminApiBaseUrl` 추가
- [ ] API client / telemetry routing 분리
- [ ] chart defaults / docs 정리
- [ ] smoke/verify 명령 기록

## Review Checklist (Implementation Review)

- [ ] public API 호출이 internal base로 잘못 향하지 않는지 확인
- [ ] internal API 호출이 public base fallback 없이 명시적으로 막히는지 확인
- [ ] chart/runtime docs가 실제 코드와 일치하는지 diff 기준으로 확인

## Verify

- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run build`
- [ ] `npm --prefix webapp run test -- AppRouter`
- [ ] `helm template malsori ./infra/charts/malsori -f infra/deploy/values.malsori.yaml >/tmp/malsori-helm-template.yaml`
- [ ] public/internal API routing smoke note 작성
