# T411 - Helm webapp 런타임 설정 게이트 해소 (apiBaseUrl 의존 제거)

## Spec

### 문제

- 현재 chart는 `webapp.apiBaseUrl`이 비어 있으면 `malsori-config.js` ConfigMap을 생성하지 않는다.
- 이 조건 때문에 `runtimeErrorReportingEnabled` 같은 다른 런타임 플래그가 values에 있어도 운영에 반영되지 않을 수 있다.

### 목표

- webapp 런타임 설정 전달을 `apiBaseUrl` 유무와 분리해, 플래그 기반 운영 제어가 항상 일관되게 적용되도록 한다.

### 범위

- 포함:
  - Helm 템플릿에서 ConfigMap 생성 조건 재설계
  - `apiBaseUrl` 미설정 상태에서도 런타임 플래그(`runtimeErrorReportingEnabled`, 추후 확장 키) 반영 보장
  - 배포/문서/스모크 정합성 업데이트
- 제외:
  - 런타임 설정 체계 전체 재설계(별도 settings API 도입 등)

### 해결방안

- ConfigMap 생성 조건을 `apiBaseUrl` 단일 키에서 “런타임 설정 키 중 하나라도 설정됨” 기준으로 변경하거나, 안전하게 항상 생성하도록 단순화한다.
- `runtimeErrorReportingEnabled` 기본값/override 동작을 values와 README에 명시한다.
- `helm template` 검증에 “apiBaseUrl empty + runtimeErrorReportingEnabled false” 케이스를 추가한다.

### 수용 기준 (AC)

- [x] `webapp.apiBaseUrl=""`이어도 runtime flag가 설정되면 `malsori-config.js`가 생성된다.
- [x] 런타임 스크립트에서 `runtimeErrorReportingEnabled` 값이 values와 일치한다.
- [x] 기존 배포( apiBaseUrl 설정 환경 )는 동작 회귀가 없다.

## Plan (Review 대상)

1. 현재 템플릿 조건과 실제 values 조합별 렌더 결과를 매트릭스로 정리한다.
2. 생성 조건 개선안(항상 생성 vs 조건 확장)을 확정한다.
3. chart/template/values 문서를 동기화한다.
4. smoke/check 스크립트에서 런타임 설정 계약 검증 포인트를 보강한다.

## Review Checklist (Plan Review)

- [x] 기존 사용자 환경에서 `window.__MALSORI_CONFIG__` 초기화 순서가 깨지지 않는가?
- [x] 공백값/미설정값 처리 시 JS syntax 오류 위험이 없는가?
- [x] 롤백 시 values/템플릿 단일 커밋 revert로 복구 가능한가?

## Implementation Log

- [x] `infra/charts/malsori/templates/webapp-configmap.yaml` 조건식 제거(항상 생성)
- [x] `infra/charts/malsori/templates/deployment.yaml` webapp-config 볼륨/마운트 상시화
- [x] `infra/charts/malsori/values.yaml` webapp runtime 설정 설명 정리
- [x] `README.md` 런타임 설정/스모크 옵션 문구 갱신

## Review Checklist (Implementation Review)

- [x] 렌더된 ConfigMap JS가 모든 조합에서 유효 구문인가?
- [x] 운영 values 기준 런타임 플래그가 정확히 반영되는가?
- [x] 다른 런타임 키(`driveAuthMode`, `googleClientId`) 동작과 충돌이 없는가?

## Verify

- [x] `helm lint infra/charts/malsori -f infra/deploy/values.malsori.yaml`
- [x] `helm template malsori infra/charts/malsori -f infra/deploy/values.malsori.yaml | rg -n \"runtimeErrorReportingEnabled|malsori-config.js\"`
- [x] `helm template malsori infra/charts/malsori | rg -n \"runtimeErrorReportingEnabled|apiBaseUrl\"`
- [x] `bash -n scripts/post-deploy-smoke.sh`
