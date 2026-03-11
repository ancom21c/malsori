# Summary + Backend Settings Execution Plan (2026-03-11)

> Status: current execution plan. Current canonical UI/spec baseline remains `docs/plan-ui-remediation-2026-03-06.md`. The latest completed execution record lives in `docs/plan-review-remediation-2026-03-08.md` and `docs/todo/2026-03-08-contract-ux-loop/README.md`.

## Goal

summary feature spec에서 정리한 요구사항과 backend settings UI review에서 식별된 operator UX 문제를 `스펙 -> 계획 리뷰 -> 구현 -> 구현 리뷰 -> 검증` 루프로 등록한다.

이번 루프는 두 축을 함께 다룬다.

1. realtime/full summary feature를 실제 vertical slice로 내릴 수 있는 domain/UX/runtime contract
2. operator-grade backend settings UI로 가기 위한 live apply safety, form semantics, binding inspector 개선

## Progress

- 완료: task spec + detailed design + plan review 등록 (`T1001`~`T1007`)
- 현재 open work: `T1001`~`T1007`

## Inputs

1. `docs/plan-summary-feature-2026-03-11.md`
2. backend settings UI review findings (`SettingsPage`, `BackendBindingOperatorPanel`)
3. `docs/plan-feature-backend-binding-2026-03-10.md`
4. `docs/plan-stt-value-preservation-baseline-2026-03-10.md`

## Canonical Decisions

### 1. Summary Domain Contract

- summary는 additive artifact다.
- realtime/full summary는 contiguous turn partition 위에서 동작한다.
- summary failure는 transcription failure처럼 보이면 안 된다.

### 2. Summary Preset Contract

- preset library는 `meeting`, `lecture`, `interview`, `casual`을 기본 제공한다.
- auto suggestion은 가능하지만 user override가 우선한다.
- preset과 provider/model binding은 분리한다.

### 3. Summary UX Contract

- realtime 화면과 session detail 화면에서 `Summary` 토글로 열고 닫는다.
- desktop은 right rail, mobile은 bottom sheet/accordion을 기본으로 본다.
- transcript viewport와 transport dock가 primary owner다.

### 4. Summary Runtime Contract

- realtime summary는 draft/updating/ready/stale lifecycle을 가진다.
- transcript correction과 late-final turn은 silent overwrite 대신 stale marking을 사용한다.
- `지금부터 적용`과 `전체 다시 생성` 두 preset 변경 경로를 분리한다.

### 5. Backend Runtime Safety Contract

- live backend 변경(`Apply To Server`, `Return To Server Default`)은 confirm 또는 undo 없이 즉시 반영되면 안 된다.
- operator는 action impact를 실행 전에 이해할 수 있어야 한다.

### 6. Backend Form Semantics Contract

- backend 관련 form input은 `name`, `autocomplete`, 적절한 `type`을 가져야 한다.
- non-auth field는 password manager를 부르지 않도록 safe default를 가져야 한다.
- credential field helper copy는 overwrite semantics를 분명히 드러내야 한다.

### 7. Backend Binding Inspector Contract

- binding UI는 raw JSON editor만으로 끝나면 안 된다.
- operator는 profile/binding의 base URL, auth mode, fallback, enabled state, capability mismatch, health mismatch를 구조적으로 읽을 수 있어야 한다.
- long id / long URL / mobile width도 견딜 수 있는 content handling이 필요하다.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T1001 | P0 | Summary partition / artifact contract | contiguous partition + artifact model 확정 |
| T1002 | P1 | Summary preset library + selection | preset schema와 auto/manual selection contract 확정 |
| T1003 | P1 | Summary surface UX | realtime/detail summary toggle + rail/sheet UX 정리 |
| T1004 | P1 | Summary runtime freshness lifecycle | stale/regenerate/apply-from-now contract 확정 |
| T1005 | P1 | Backend live apply safety | confirm/impact copy/undo-safe action flow 정리 |
| T1006 | P2 | Backend form semantics hardening | input metadata, credential affordance, password-manager guard 정리 |
| T1007 | P1 | Backend binding operator inspector UX | structured inspector + mismatch visibility + responsive handling |

## Definition of Done

- summary 관련 task를 읽으면 domain, preset, UX, runtime responsibilities가 겹치지 않고 설명 가능하다.
- backend settings 관련 task를 읽으면 live runtime safety, form semantics, binding inspector work가 각각 분리돼 있다.
- current execution plan/board reference가 repo entry docs에 일관되게 반영된다.

## Self Review

- [x] summary와 backend settings를 한 루프로 묶되, task는 구현 단위로 분리했다.
- [x] spec-only/UX-only/운영 safety work가 서로 덮어쓰지 않도록 범위를 나눴다.
- [x] latest completed loop와 current execution loop를 동시에 보존하는 문서 역할을 유지했다.
