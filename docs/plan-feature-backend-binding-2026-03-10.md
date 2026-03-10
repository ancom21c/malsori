# Feature Backend Binding Plan (2026-03-10)

> Status: current architecture baseline for expanding `malsori` from STT-only backend configuration to feature-scoped backend binding without regressing the shipped STT value.

## Problem

현재 codebase에서 실제 backend surface는 사실상 STT에만 존재한다.

- public STT base: `apiBaseUrl`
- internal operator base: `adminApiBaseUrl`
- STT backend override / preset surface: `/v1/backend/*`, backend presets

반면 새로 추가한 기능은 다음 수준에 머물러 있다.

- `/translate` shell
- session artifact foundation
- feature flag / capability matrix

즉, `summary`, `qa`, `translate`, 미래의 `tts`는 UI shell은 생겼지만 어떤 backend를 쓸지 지정하는 공통 모델이 없다.

이 상태에서 기능별로 `summaryApiBaseUrl`, `translateApiBaseUrl`, `ttsApiBaseUrl`를 따로 늘리면 설정, 운영, auth, fallback, health contract가 금방 분산된다.

## Goal

`malsori`가 STT 중심 제품 가치를 유지한 채 다음 기능을 같은 운영 구조로 수용할 수 있게 한다.

1. realtime/file transcription
2. session summary
3. transcript QA
4. turn translation
5. future TTS

이를 위해 `BackendProfile + FeatureBinding + CapabilityResolution` 구조를 canonical contract로 정의한다.

## Preservation Constraints

다음은 훼손되면 안 된다.

1. 기존 file transcription과 realtime transcription 동작
2. `/`, `/realtime`, `/transcriptions/:id` legacy UX
3. internal-only backend admin 정책
4. operator token / internal ingress 기반 운영 모델
5. capability가 없는 기능이 core STT flow를 깨지 않는 safe default

## Core Concepts

### 1. BackendProfile

실제 backend 연결 대상을 표현하는 단위다.

권장 필드:

- `id`
- `kind`: `stt | llm | translate | tts | multimodal`
- `label`
- `baseUrl`
- `transport`: `http | websocket | grpc`
- `authStrategy`: `none | bearer_secret_ref | oauth_broker | header_token | provider_native`
- `credentialRef`
- `defaultModel`
- `healthState`
- `enabled`
- `metadata`

`BackendProfile`은 기능이 아니라 연결 대상이다. 하나의 profile이 여러 feature에 재사용될 수 있어야 한다.

### 2. FeatureBinding

제품 기능이 어떤 backend profile을 쓰는지 결정하는 단위다.

권장 필드:

- `featureKey`
- `primaryBackendProfileId`
- `fallbackBackendProfileId`
- `enabled`
- `modelOverride`
- `timeoutMs`
- `retryPolicy`
- `degradedBehavior`

### 3. BackendCapability

backend profile이 실제로 제공하는 기능 계약이다.

권장 capability 예시:

- `stt.realtime`
- `stt.file`
- `artifact.summary`
- `artifact.qa`
- `translate.turn_final`
- `translate.turn_partial`
- `tts.speak`
- `tts.stream`

### 4. ResolutionResult

특정 기능 호출 시 runtime이 참조하는 최종 결정 결과다.

권장 필드:

- `featureKey`
- `status`: `ready | disabled | unavailable | misconfigured`
- `resolvedBackendProfileId`
- `resolvedModel`
- `capabilities`
- `reason`

## Architecture Rule

신규 기능은 개별 endpoint 필드를 추가하지 않고, 반드시 아래 흐름을 따른다.

`Feature -> FeatureBinding -> BackendProfile -> CapabilityResolution -> Adapter`

즉, UI와 domain은 feature를 본다. provider-specific endpoint/auth/model 차이는 backend profile과 adapter가 흡수한다.

## Feature Taxonomy

초기 canonical feature key는 다음을 사용한다.

- `capture.realtime`
- `capture.file`
- `artifact.summary`
- `artifact.qa`
- `translate.turn_final`
- `translate.turn_partial`
- `tts.speak`
- `tts.stream`

이 key는 제품 기능 기준이며, 특정 vendor 명을 직접 포함하지 않는다.

## Operator Boundary

`BackendProfile`과 `FeatureBinding`은 operator-only 설정이다.

### Public/User scope

- capture preset
- display preference
- session-level language / model quick options

### Internal/Operator scope

- backend profile CRUD
- feature binding CRUD
- credential reference
- backend health / capability check
- rollout enablement / fallback policy

이 정책 때문에 binding UI/API는 current `/v1/backend/*`와 같은 internal ingress 보호 영역에 두는 것이 맞다.

## Internal API Direction

기존 `/v1/backend/endpoint` singular STT override는 compatibility surface로 유지하되, target architecture는 다음 리소스로 확장한다.

- `GET /v1/backend/profiles`
- `POST /v1/backend/profiles`
- `PATCH /v1/backend/profiles/:id`
- `GET /v1/backend/profiles/:id/health`
- `GET /v1/backend/bindings`
- `PUT /v1/backend/bindings/:featureKey`
- `GET /v1/backend/capabilities`

현재 `backend endpoint override`는 `stt` profile 한 개를 수정하는 compatibility adapter로 취급한다.

## Frontend Contract

frontend는 settings/operator surface에서 다음 두 계층을 보여야 한다.

### 1. Backend Profiles

- profile list
- kind
- base URL
- auth mode
- capability summary
- health status

### 2. Feature Bindings

- feature별 현재 binding
- backend selection
- fallback backend
- model override
- enabled/disabled
- health mismatch / capability mismatch 경고

## Capability Resolution Rules

1. feature가 disabled면 UI는 surface를 숨기거나 disabled state로 보여준다.
2. binding은 있으나 profile capability가 부족하면 `misconfigured`다.
3. profile health가 down이면 fallback backend를 시도할 수 있다.
4. fallback도 없으면 feature만 degraded/disabled 처리하고 core STT는 유지한다.
5. session summary 실패가 transcription 실패처럼 보이면 안 된다.
6. translation 실패가 source transcript 수집을 막으면 안 된다.

## Migration Strategy

### Stage 0. Compatibility Mapping

현재 설정을 다음처럼 읽는다.

- `apiBaseUrl` -> implicit default STT public profile
- `adminApiBaseUrl` -> operator control plane base
- current backend preset / backend override -> explicit STT profile seed

즉, 기존 값이 있는 동안에도 frontend와 backend는 `stt` binding으로 해석할 수 있어야 한다.

### Stage 1. Dual Read / Single Write

- 기존 STT 설정은 계속 읽는다.
- 신규 operator UI는 backend profile / binding으로만 쓴다.
- compatibility adapter가 old surface를 새 구조로 브리지한다.

### Stage 2. STT Binding Canonicalization

- `capture.realtime`, `capture.file`를 명시적 STT binding으로 관리한다.
- legacy preset/app setting은 derived compatibility layer로 축소한다.

### Stage 3. Additive Feature Onboarding

- `artifact.summary`
- `artifact.qa`
- `translate.turn_final`
- `translate.turn_partial`
- future `tts.*`

위 feature는 binding과 capability가 모두 준비되었을 때만 노출한다.

## TTS Readiness

이 구조는 TTS를 별도 예외 없이 수용해야 한다.

예시:

- profile kind: `tts`
- feature keys: `tts.speak`, `tts.stream`
- session artifact와 독립된 output channel

중요한 점은 TTS도 `새 필드 추가`가 아니라 `새 feature binding`으로 붙는다는 것이다.

## UI / IA Direction

Settings의 operator 영역은 장기적으로 다음 정보구조가 적절하다.

1. `Connections`
   - backend profiles
2. `Bindings`
   - feature -> backend mapping
3. `Health`
   - profile reachability / capability mismatch / recent failures
4. `Compatibility`
   - legacy STT endpoint mapping state

현재 단일 `backend` section은 이 구조로 확장되어야 한다.

## Rollout / Safe Defaults

1. default shipped value는 계속 STT-first다.
2. summary/translate/qa/tts는 binding이 없으면 hidden 또는 disabled state다.
3. public runtime은 credential을 직접 가지지 않는다.
4. operator-only API는 internal ingress와 admin token 뒤에 둔다.
5. rollout은 feature flag + binding readiness + capability check 3중 gate로 관리한다.

## Definition of Done

다음이 준비되면 이 설계가 구현 가능 상태라고 본다.

1. `BackendProfile` / `FeatureBinding` / capability model이 코드에 도입된다.
2. current STT 설정이 compatibility mapping으로 유지된다.
3. operator UI에서 profile과 binding을 구분해 편집할 수 있다.
4. summary/translate shell이 binding resolution을 읽을 수 있다.
5. TTS 추가 시 새 ad-hoc setting field 없이 수용 가능하다.

## Non-goals

이번 설계는 다음을 즉시 구현하지 않는다.

1. summary provider 실제 호출
2. translate provider 실제 호출
3. TTS engine 실제 호출
4. credential secret storage 완결 implementation

이번 단계의 목적은 provider가 늘어나도 구조가 무너지지 않는 canonical contract를 잡는 것이다.
