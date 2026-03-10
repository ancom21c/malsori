# Platform Expansion Rollout Plan (2026-03-10)

> Status: current additive rollout baseline for expanding `malsori` beyond core STT while preserving the existing shipped value.

## Goal

기존 파일 전사, 실시간 전사, 세션 저장/조회, 모바일 realtime 작업성을 훼손하지 않으면서 `malsori`를 `session-based conversation workspace`로 확장한다.

## Preservation Contract

다음 가치는 모든 확장 단계에서 유지되어야 한다.

1. 파일 전사 요청/상태조회/상세 열람은 계속 동작한다.
2. 실시간 전사 시작/중지/재연결/저장은 계속 동작한다.
3. `/`, `/realtime`, `/settings`, `/transcriptions/:id` legacy route는 계속 유효하다.
4. mobile realtime transcript viewport와 transport dock는 확장 기능보다 우선 보장한다.
5. backend capability가 없는 기능은 hidden/disabled 상태로 남고 기존 STT flow를 대체하지 않는다.

## Rollout Principles

1. 신규 기능은 `mode`, `artifact`, `variant`로 additive 도입한다.
2. 기존 route와 저장 구조를 파괴적으로 바꾸지 않는다.
3. provider-specific 응답은 adapter 계층에서 `Session`/`Turn`/`Artifact`로 정규화한다.
4. UI shell은 feature flag로 노출하고, capability가 없으면 fallback UX를 사용한다.
5. rollout/rollback은 flag와 compatibility route만으로 즉시 가능해야 한다.

## Domain Baseline

확장 기준 모델은 다음 공통 구조를 사용한다.

- `Session`
- `Turn`
- `TurnVariant`
- `Artifact`
- `QualitySnapshot`

현재 shipped STT는 이 구조 위로 adapter를 통해 올라가며, 기존 storage contract는 additive field만 허용한다.

## Route Compatibility Contract

기존/확장 route는 동시에 유지한다.

| Experience | Legacy route | Additive route | Rule |
|---|---|---|---|
| Sessions list | `/` | `/sessions` | 둘 다 list workspace를 연다 |
| Session detail | `/transcriptions/:id` | `/sessions/:id` | 둘 다 detail workspace를 연다 |
| Realtime capture | `/realtime` | `/capture/realtime` | 둘 다 realtime capture workspace를 연다 |
| File capture entry | `/` | `/capture/file` | additive route는 기존 upload/list workspace를 재사용한다 |
| Translate shell | N/A | `/translate` | capability/flag 없으면 `/capture/realtime`로 redirect |

## Feature Flags and Capabilities

### Route / UI Flags

| Flag | Default | Purpose | Rollback |
|---|---|---|---|
| `VITE_FEATURE_MODE_SPLIT_NAVIGATION` | `true` | `Capture / Sessions / Settings` IA split | `false`로 두면 legacy navigation 중심으로 복귀 |
| `VITE_FEATURE_SESSION_ARTIFACTS` | `false` | detail artifact rail 노출 | `false`로 즉시 숨김 |
| `VITE_FEATURE_REALTIME_TRANSLATE` | `false` | `/translate` shell 노출 | `false`로 즉시 `/capture/realtime` redirect |

### Capability Flags

| Capability | Default | Meaning |
|---|---|---|
| `VITE_CAP_CAPTURE_REALTIME` | `true` | realtime capture usable |
| `VITE_CAP_CAPTURE_FILE` | `true` | file capture usable |
| `VITE_CAP_TRANSLATE_TURN_FINAL` | `false` | turn-final translation available |
| `VITE_CAP_TRANSLATE_TURN_PARTIAL` | `false` | streaming partial translation available |
| `VITE_CAP_ARTIFACT_SUMMARY` | `false` | summary artifact available |
| `VITE_CAP_ARTIFACT_QA` | `false` | transcript QA artifact available |

flag는 UI surface visibility를, capability는 실제 backend/provider enablement를 의미한다.

## Staged Rollout

### Stage 0. Compatibility Baseline

- shared session domain model 추가
- legacy route 유지
- additive route alias 도입
- smoke matrix 확장

### Stage 1. IA Split

- `Capture / Sessions / Settings` navigation 도입
- `/capture/*`, `/sessions/*` route 노출
- 기존 `/`, `/realtime`, `/transcriptions/:id` 유지

### Stage 2. Session Workspace Foundation

- detail에 artifact rail slot 추가
- transcript search entry 추가
- capability 없으면 artifact rail은 hidden

### Stage 3. Translate Shell

- `/translate` shell 추가
- capability 없으면 redirect/fallback
- source-first transcript workspace 유지

### Stage 4. Provider-Backed Features

- summary/QA/translation provider 연결
- feature flag + capability 둘 다 충족할 때만 활성화
- failure는 해당 artifact/mode에 한정하고 core capture/session은 유지

## Migration Rules

1. IndexedDB schema는 additive migration만 허용한다.
2. 기존 transcription row를 `Session` adapter로 읽어들이는 방식으로 우선 호환한다.
3. 신규 field backfill이 없어도 기존 record read가 깨지지 않아야 한다.
4. new artifact/variant가 비어 있어도 detail view는 기존 transcript 중심으로 동작해야 한다.
5. translate/session-artifact metadata는 lazy materialization을 기본으로 한다.

## Smoke Matrix

배포 후 최소 smoke는 다음을 포함한다.

### Shell / Route

- `/`
- `/sessions`
- `/settings`
- `/realtime`
- `/capture`
- `/capture/realtime`
- `/capture/file`
- `/translate`

### Detail Compatibility

- `/transcriptions/:id` empty + ready
- `/sessions/:id` empty + ready

### Policy / Ops

- `/v1/health`
- `/v1/cloud/google/status`
- public `/v1/observability/runtime-error` block policy
- public/internal `/v1/backend/*` policy

### Translate Route Modes

- `redirect`: capability/flag off 상태. `/translate`는 `/capture/realtime`으로 redirect 되어야 한다.
- `enabled`: translate shell이 노출되어야 한다.
- `skip`: rollout 단계상 검증을 생략한다.

`./scripts/post-deploy-smoke.sh`는 `EXPECT_TRANSLATE_ROUTE_MODE`로 이 모드를 선택한다.

## Observability Signals

현재와 향후 rollout에서 다음 신호를 본다.

1. realtime session start success rate
2. realtime reconnect rate
3. degraded session rate
4. file upload request success rate
5. detail load failure / blank-screen rate
6. artifact request success/failure rate
7. translate shell fallback rate

현재 repository 기준 즉시 검증 가능한 contract는 다음이다.

- route smoke
- page error / console error
- health/runtime-error/backend policy smoke
- bundle/lint/build/test gate

## Backend Binding Rollout Gate

binding runtime을 도입하는 단계에서는 feature visibility와 provider readiness를 분리해서 확인한다.

1. shell/route visibility는 feature flag로 제어한다.
2. backend readiness는 binding/profile resolution으로 제어한다.
3. rollout 전에는 `npm --prefix webapp run bindings:check`로 JSON contract를 검증한다.
4. rollout 중 required feature가 있다면 `--require-feature`로 ready/fallback 상태를 강제한다.

예시:

```bash
VITE_BACKEND_PROFILES_JSON='[...]' \
VITE_FEATURE_BINDINGS_JSON='[...]' \
npm --prefix webapp run bindings:check -- --require-feature artifact.summary
```

이 검사는 provider 호출이 아니라 binding/profile contract만 검증한다. 즉, core STT smoke를 대체하지 않고 additive rollout 전 가드레일로 사용한다.

## Rollback Levers

1. `VITE_FEATURE_SESSION_ARTIFACTS=false`
2. `VITE_FEATURE_REALTIME_TRANSLATE=false`
3. `VITE_FEATURE_MODE_SPLIT_NAVIGATION=false`
4. capability flags를 전부 off로 내려 additive feature를 숨긴다.
5. legacy routes(`/`, `/realtime`, `/transcriptions/:id`)는 rollback 시에도 유지한다.

rollback은 신규 route/model을 제거하는 것이 아니라 additive surface를 숨기고 compatibility path로 복귀하는 방식이어야 한다.

## Release Gate

확장 단계 merge 전 최소 게이트:

- `npm --prefix webapp run lint`
- `npm --prefix webapp run i18n:check`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
- `npm --prefix webapp run bindings:check`
- `npm --prefix webapp run test`
- `python3 -m py_compile scripts/post-deploy-ui-smoke.py`
- `bash -n scripts/post-deploy-smoke.sh`

## Notes

- 이 문서는 current execution board가 아니라 stable rollout baseline이다.
- 구현 task log와 self-review는 local-only `.codex/workloops/`에 남긴다.
