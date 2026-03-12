# Operator Feature Activation Plan (2026-03-11)

> Status: current execution plan. Latest completed execution plan is `docs/plan-summary-backend-2026-03-11.md` and its board `docs/todo/2026-03-11-summary-backend-loop/README.md`.

## Goal

`BackendProfile + FeatureBinding` 구조를 실제 운영 가능한 internal operator plane으로 활성화하고, 그 위에서 summary/translate의 첫 provider-backed vertical slice를 순서대로 연다.

이번 루프는 세 질문에 답해야 한다.

1. operator는 public 앱이 아니라 internal surface에서 feature별 backend를 실제로 바꿀 수 있는가?
2. summary는 shell/contract를 넘어 `full summary -> realtime summary` 순으로 실제 실행 가능한가?
3. translate는 `/translate` shell에서 `turn_final` vertical slice까지 안전하게 확장 가능한가?

## Progress

- 완료: task spec + detailed plan review 등록 (`T1101`~`T1110`)
- active now:
  - `T1101` internal operator admin surface activation verify
  - `T1110` live activation runtime / release gate recovery
- ready next:
  - `T1102` backend health/capability live wiring verify
  - `T1103` full summary provider-backed execution verify
  - `T1104` full summary UX activation verify
  - `T1105` realtime summary execution verify
  - `T1106` translate final-turn execution verify
  - `T1107` rollout smoke/evidence hardening verify
  - deploy/runtime evidence closeout for `T1101`~`T1109`
- blocked by provider execution:
  - 없음
- closeout gate:
  - `T1107` rollout smoke/evidence hardening

## Inputs

1. `docs/plan-feature-backend-binding-2026-03-10.md`
2. `docs/plan-summary-feature-2026-03-11.md`
3. `docs/plan-platform-expansion-rollout-2026-03-10.md`
4. current deployed state:
   - `adminApiBaseUrl` disabled
   - `/translate` redirect mode
   - session artifact rail hidden by default

## Canonical Decisions

### 1. Operator Plane Comes First

- public 앱에 `summaryApiBaseUrl`, `translateApiBaseUrl` 같은 per-feature 설정 필드를 추가하지 않는다.
- feature backend activation은 `internal ingress + admin token + backend binding` 구조로만 연다.
- operator UI는 internal surface availability가 없으면 hidden/disabled helper 상태로 남는다.

### 2. Activation Order Is Fixed

- 순서는 다음과 같이 고정한다.
  1. internal operator admin surface
  2. backend health/capability live wiring
  3. full summary provider-backed vertical slice
  4. realtime summary partition runner
  5. translate final-turn vertical slice
  6. rollout smoke/evidence hardening

### 3. Summary Ships In Two Steps

- first shipped execution is `full summary`.
- realtime summary는 그 다음 단계로 붙인다.
- 이유:
  - full summary가 run scope와 UX가 더 단순하다.
  - detail rail에서 사용자 가치가 즉시 드러난다.
  - realtime summary의 partition debounce/stale policy를 full-summary 실행 이후에 안정화하는 편이 리스크가 낮다.
- full summary와 realtime summary 모두 기존 summary spec의 구조화된 block output, source-linked snippets, preset traceability, language-aware output contract를 따라야 한다.

### 4. Translate Starts With Final Turns Only

- translate는 `translate.turn_final` capability만 먼저 연다.
- `translate.turn_partial`은 같은 binding plane을 재사용하되 이번 루프 범위에 넣지 않는다.
- `/translate` route는 capability/flag가 모두 준비되기 전까지 redirect contract를 유지한다.

### 5. Capability / Flag / Failure Isolation Stay Additive

- summary/translate는 core STT flow를 대체하지 않는다.
- capability off, provider unavailable, binding misconfigured 상태는 shell hidden/disabled/pending으로만 드러난다.
- transcript capture/detail/settings core flow는 summary/translate failure와 분리돼야 한다.

### 6. Smoke Must Prove The Boundary

- public host:
  - `/v1/backend/*` blocked
  - `/v1/observability/runtime-error` blocked
- internal host:
  - `/v1/backend/profiles`
  - `/v1/backend/bindings`
  - `/v1/backend/capabilities`
  - profile health checks
- UI smoke:
  - summary visible/hidden mode
  - translate enabled/redirect mode

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T1101 | P0 | Internal operator admin surface activation | internal ingress + runtime config + admin token 경로 활성화 |
| T1102 | P0 | Backend health/capability live wiring | operator panel이 live profile/binding/capability/health 상태를 읽고 경고를 표면화 |
| T1103 | P0 | Full summary provider-backed execution | `artifact.summary` full summary run이 backend binding을 통해 실제 생성/저장 |
| T1104 | P1 | Full summary UX activation | detail/realtime summary surface가 full summary 요청/재생성/preset 변경을 노출 |
| T1105 | P1 | Realtime summary partition runner | contiguous partition 기반 realtime summary 실행과 stale lifecycle |
| T1106 | P1 | Translate final-turn vertical slice | `/translate`가 `translate.turn_final` capability로 실제 동작 |
| T1107 | P1 | Rollout smoke/evidence hardening | internal/public/admin/summary/translate smoke matrix와 evidence 정리 |

## Definition of Done

- internal operator host에서 feature backend profiles/bindings/capabilities/health를 읽고 바꿀 수 있다.
- public 배포본에는 summary/translate raw endpoint 설정 UI가 생기지 않는다.
- full summary가 provider-backed 결과를 실제로 생성하고, rail에서 요청/재생성 가능하다.
- realtime summary가 partition/stale policy와 함께 additive feature로 동작한다.
- `/translate`가 redirect shell이 아니라 final-turn execution을 제공한다.
- deploy smoke가 internal/public boundary와 additive surface visibility를 증명한다.

## Self Review

- [x] operator plane, summary execution, translate execution, smoke hardening을 순차 구현 가능한 단위로 분해했다.
- [x] public per-feature endpoint settings를 되살리는 우회 경로를 명시적으로 배제했다.
- [x] full summary를 realtime summary보다 먼저 두어 implementation risk를 낮췄다.
- [x] translate는 final-turn only로 한정해 summary와 동시에 과도한 복잡도를 피했다.
