# T401 - 내부망 전제 endpoint ingress 분리 (`/v1/backend/*`, `/v1/observability/runtime-error`)

## Spec

### 결정사항

- 운영 배포는 `/v1` public 단일 ingress를 유지하지 않고, `public/internal ingress 분리`를 채택한다.
- `/v1/observability/runtime-error`는 내부망 전제 정책으로 운영한다.

### 문제

- 운영 정책은 `/v1/backend/*`와 `/v1/observability/runtime-error`를 내부망/운영자 전제로 본다.
- 현재 Helm 기본 ingress는 `/v1` 전체를 public으로 라우팅해 정책과 실제 노출면이 일치하지 않는다.

### 목표

- 내부망 전제 endpoint를 네트워크 경계에서 기본 차단해 정책-구현 정합성을 확보한다.

### 범위

- 포함:
  - Helm values/템플릿에서 public/internal path 분리 지원
  - 기본 배포값에서 admin/observability path public 노출 제거
  - 운영 문서/스모크 절차 업데이트
- 제외:
  - 신규 인증 체계(OIDC/JWT) 도입
  - 앱 기능 재설계

### 해결방안

- ingress를 `public`/`internal` surface로 분리한다.
- public은 사용자 기능 필수 경로만 유지하고, `/v1/backend/*`와 `/v1/observability/runtime-error`는 internal ingress로만 노출한다.
- internal ingress가 없는 환경에서는 해당 경로를 비노출(default)로 두고, observability 리포터는 기능 플래그로 비활성 가능하게 정리한다.

#### 경로 매핑 (권장안 확정)

- Public ingress:
  - `/`
  - `/v1/health`
  - `/v1/transcribe`
  - `/v1/transcribe/*`
  - `/v1/streaming`
  - `/v1/cloud/google/*`
- Internal ingress:
  - `/v1/backend/*`
  - `/v1/observability/runtime-error`

### 수용 기준 (AC)

- [ ] 기본 운영 values에서 `/v1/backend/*`, `/v1/observability/runtime-error`는 public host로 접근 불가다.
- [ ] internal ingress 사용 시 운영자 네트워크에서만 두 경로 접근 가능하다.
- [ ] README/배포문서에 내부망 전제 정책과 예시 values가 명확히 반영된다.
- [ ] `runtime-error` 수집 경로가 public에 남지 않으며, 내부 수집 경로가 없을 때는 리포터가 비활성 또는 no-op 정책으로 동작한다.

## Plan (Review 대상)

1. 현재 ingress 템플릿/values 구조에서 경로 분리 확장 포인트를 확정한다.
2. public/internal 경로 매핑을 values 기본값으로 확정하고, fail-closed 기본동작을 설계한다.
3. `post-deploy-smoke.sh`에 public 접근 차단 확인 절차를 추가한다.
4. 내부망 운영 시나리오(동일 호스트 vs 별도 internal host) 예시를 문서화한다.

## Review Checklist (Plan Review)

- [x] 기존 public 기능 경로(`/`, transcription, streaming, OAuth callback)가 깨지지 않는가?
- [x] internal ingress 미구성 환경에서 안전한 fail-closed 동작인가?
- [x] 롤백 시 단일 values 변경으로 기존 동작 복원 가능한가?

## Implementation Log

- [x] Helm ingress values 구조를 public/internal 분리형으로 확장
  - `infra/charts/malsori/values.yaml`
  - `infra/deploy/values.malsori.yaml`
- [x] chart ingress 템플릿 분기 구현
  - `infra/charts/malsori/templates/ingress.yaml` (legacy + public/internal split 지원)
- [x] 배포 스모크/운영 문서 업데이트
  - `scripts/post-deploy-smoke.sh` (`INTERNAL_BASE_URL`, public observability block policy)
  - `README.md`, `infra/deploy/README.md`
  - `webapp` runtime telemetry flag 연동 (`runtimeErrorReportingEnabled`)

## Review Checklist (Implementation Review)

- [x] public host에서 내부망 전제 경로 차단이 재현되는가?
- [x] internal host/네트워크에서 관리자/관측 경로가 정상 동작하는가?
- [x] 배포 경로 분리로 인증/콜백 흐름 회귀가 없는가?

## Verify

- [x] `helm template malsori infra/charts/malsori -f infra/deploy/values.malsori.yaml`
  - public ingress에 `/v1/backend*`, `/v1/observability/runtime-error`가 포함되지 않음 확인
- [x] `helm lint infra/charts/malsori -f infra/deploy/values.malsori.yaml`
- [x] `bash -n scripts/post-deploy-smoke.sh`
- [x] `npm --prefix webapp run test -- runtimeErrorReporter --reporter=basic`
- [x] `npm --prefix webapp run lint`
