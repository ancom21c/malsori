# Operator Feature Activation Contract

이 문서는 summary/translate 같은 additive feature를 실제로 활성화할 때 지켜야 하는 durable contract를 정리한다.

## Core Rules

- feature별 backend는 public settings 입력칸이 아니라 operator-managed binding으로 관리한다.
- operator control plane은 `adminApiBaseUrl`와 internal ingress 뒤에 둔다.
- `/v1/backend/*`와 `/v1/observability/runtime-error`는 public surface에 노출하지 않는다.
- capability/flag가 준비되지 않은 additive feature는 hidden/disabled/pending 상태로 남아야 한다.

## Activation Order

1. internal operator admin surface를 연다.
2. backend profile/binding/capability/health를 live wiring 한다.
3. `artifact.summary` full summary vertical slice를 연다.
4. realtime summary partition runner를 붙인다.
5. `translate.turn_final` vertical slice를 연다.
6. smoke/evidence를 통해 internal/public boundary와 route mode를 다시 검증한다.

## Summary Rules

- summary는 `full summary`를 먼저 shipping 한다.
- realtime summary는 contiguous partition, debounce, stale/regenerate policy가 준비된 뒤 연다.
- summary failure는 transcript/detail core failure로 보이면 안 된다.
- summary output은 preset별 structured blocks와 source-linked snippets를 유지해야 한다.
- summary request/run result에는 preset 선택 source와 language-aware output metadata가 traceable 해야 한다.

## Translate Rules

- translate는 `translate.turn_final`만 먼저 shipping 한다.
- `translate.turn_partial`은 별도 후속 단계다.
- `/translate`는 capability/flag off 상태에서 `/capture/realtime` redirect contract를 유지한다.

## UX / Ops Rules

- operator-only backend controls는 internal surface availability가 없으면 helper/disabled 상태를 보여준다.
- public 앱은 summary/translate raw credentials나 raw endpoint를 저장하지 않는다.
- operator plane은 live profile/binding CRUD와 capability/health visibility를 함께 가져야 한다.
- post-deploy smoke는 summary visibility mode, translate route mode, backend admin exposure policy를 함께 검증한다.

## Provider Readiness Rules

- provider-backed `artifact.summary` / `translate.turn_final` profiles are operational only when `enabled=true` and health is `healthy` or `unknown`; `degraded`, `unreachable`, `misconfigured` profiles should not stay on the ready path.
- the current provider-backed vertical slice supports only `http` transport plus auth strategies `none | bearer_secret_ref | header_token`; credential references must be `server_env` or `operator_token`.
- if the selected primary provider fails at request time with a provider/runtime error and a fallback profile is ready, runtime should retry once on the fallback instead of surfacing the primary outage directly.

## Evidence Rules

- publish-worthy rollout evidence는 active loop의 `docs/todo/<loop>/evidence/<task>/<yyyymmdd>/` 아래에 남기고, scratch output은 `.codex/workloops/`에 둔다.
- smoke evidence는 public base URL, internal base URL, expected route modes, commit SHA, 실행 시각을 함께 기록한다.
- `BACKEND_ADMIN_TOKEN` 값 자체는 남기지 않고, token 사용 여부만 note/log에 적는다.
- UI smoke를 켰다면 `UI_SMOKE_SCREENSHOT_DIR`를 같은 evidence 폴더 아래로 맞춰 screenshot과 `smoke.log`를 한 위치에서 추적 가능하게 둔다.
- operator rollout evidence는 public blocked 결과와 internal admin 결과를 같은 노트 안에서 분리해 적는다.

## Rollback Checklist

1. `VITE_FEATURE_SESSION_ARTIFACTS=false`로 detail artifact rail을 먼저 숨긴다.
2. `VITE_FEATURE_REALTIME_TRANSLATE=false`로 `/translate`를 즉시 redirect contract로 되돌린다.
3. `artifact.summary`, `translate.turn_final` capability/binding을 compatibility-safe 상태로 내린다.
4. operator plane 자체를 닫아야 하면 `BACKEND_ADMIN_ENABLED=0` 또는 internal ingress 제거를 마지막에 수행한다.
5. rollback 후 `/`, `/realtime`, `/settings`, `/transcriptions/:id`가 그대로 유지되는지와 public `/v1/backend/*` 차단을 다시 smoke로 확인한다.
