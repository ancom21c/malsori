# T1007 - Backend Binding Operator Inspector UX

## Spec

### 문제

- additive feature backend UI는 사실상 raw JSON editor 중심이라 operator가 현재 binding/profile 상태를 읽기 어렵다.
- base URL, auth mode, fallback backend, enabled state, mismatch warning, health 상태가 구조적으로 드러나지 않는다.
- long id / mobile width에서 content handling도 약하다.

### 목표

- backend binding/operator surface를 structured inspector 중심으로 바꾼다.
- operator가 JSON editor를 열기 전에 현재 상태와 리스크를 읽을 수 있게 만든다.

### 범위

- 포함:
  - profile inspector(기본 URL, kind, auth mode, capability summary, health)
  - binding inspector(feature key, primary/fallback, enabled, model override, mismatch warning)
  - long content truncation/wrapping/mobile handling
  - advanced JSON editor는 secondary/advanced affordance로 유지 여부 결정
- 제외:
  - actual provider health-check backend implementation
  - summary runtime feature 구현 자체

### 해결방안

- list row와 detail inspector를 분리한다.
- current selected item은 structured fields로 보여주고, JSON editor는 advanced edit path로 내린다.
- capability mismatch / health mismatch / disabled state를 alert/chip로 드러낸다.
- long id / URL은 truncation + tooltip/secondary detail 패턴으로 처리한다.

### 상세 설계

#### A. Information Architecture

- top summary cards
  - compatibility bridge 상태
  - available capabilities
  - last successful check
- list column
  - profiles list
  - bindings list
- inspector column
  - selected profile structured inspector
  - selected binding structured inspector
- advanced edit path
  - JSON editor는 secondary accordion/drawer/card로 후퇴

#### B. Profile Inspector Fields

- `label`, `kind`
- `baseUrl`
- `authStrategy`
- `defaultModel`
- `enabled`
- `backendCapabilities`
- `healthState`
- operator note / metadata preview

#### C. Binding Inspector Fields

- `featureKey`
- `primaryBackendProfileId`
- `fallbackBackendProfileId`
- `enabled`
- `modelOverride`
- `timeoutMs`
- `retryPolicy`
- `resolutionStatus`
- mismatch warning
  - capability mismatch
  - health mismatch
  - missing fallback

#### D. Long-content / Responsive Handling

- long id / URL / model names는 `min-w-0`, truncation, tooltip 또는 secondary detail row를 사용한다.
- mobile에서는 inspector cards가 vertical stack으로 재배치돼야 한다.
- list row는 한 줄 요약 + secondary metadata로 축소한다.

#### E. JSON Editor Role

- JSON editor는 advanced path로 남길 수 있다.
- structured inspector에서 대부분의 read path를 해결하고, JSON은 power-user edit 경로로 한정한다.
- validation error는 JSON editor 내부에만 숨기지 말고 inspector selection 상태에도 반영한다.

### 수용 기준 (AC)

- [ ] profile/binding의 핵심 상태를 JSON을 읽지 않고도 파악할 수 있다.
- [ ] primary/fallback/enabled/model/mismatch 상태가 UI에 구조적으로 노출된다.
- [ ] long id / URL / mobile width에서도 content overflow 없이 읽을 수 있다.
- [ ] JSON editor가 남더라도 advanced path로 후퇴해 primary UX를 가리지 않는다.

## Plan (Review 대상)

1. operator가 읽어야 할 minimum profile/binding field set을 먼저 고정한다.
2. list -> inspector -> advanced JSON edit 정보구조를 분리한다.
3. mismatch warning과 health/capability state 표현 방식을 정의한다.
4. long-content / mobile responsive handling을 같은 구조 안에 녹인다.
5. JSON editor의 role을 secondary advanced path로 내린다.

## Review Checklist (Plan Review)

- [x] JSON editor 없이도 current binding/profile 상태를 설명할 수 있는가?
- [x] mismatch warning이 inspector에서 바로 보이는가?
- [x] long id / URL / mobile width handling이 포함됐는가?
- [x] structured inspector와 advanced edit path의 역할이 분리됐는가?

## Self Review 1 - Scope Fit

- [x] review에서 가장 큰 UX gap 중 하나라 P1이 적절하다.
- [x] raw JSON 제거가 아니라 structured inspector 우선으로 범위를 잡았다.

## Self Review 2 - Operator Safety

- [x] profile/binding 핵심 상태를 읽기 전에 JSON editor를 열어야 하는 문제를 직접 겨냥했다.
- [x] mismatch warning과 health state를 구조적 inspector 요소로 끌어올렸다.
- [x] long-content/mobile handling을 별도 후속 task로 미루지 않고 같은 inspector task에 포함했다.

## Self Review 3 - Executability

- [x] summary cards -> list -> inspector -> advanced JSON 순으로 구현 단계가 분명하다.
- [x] current `BackendBindingOperatorPanel`에 incremental refactor 형태로 적용 가능하다.
- [x] verify 항목이 panel/page 테스트와 standard gates로 충분하다.

## Implementation Log

- [ ] structured profile/binding inspector를 구현한다.
- [ ] mismatch/health state chips or alerts를 추가한다.
- [ ] advanced JSON editor path를 secondary affordance로 재배치한다.
- [ ] long-content/mobile responsive handling을 보강한다.

## Review Checklist (Implementation Review)

- [ ] operator가 JSON editor를 열기 전에 핵심 상태를 읽을 수 있는가?
- [ ] health/capability mismatch가 silent failure로 숨지 않는가?
- [ ] long id / URL이 small viewport에서 overflow하지 않는가?

## Verify

- [ ] `npm --prefix webapp run test -- BackendBindingOperatorPanel SettingsPage`
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run build`
