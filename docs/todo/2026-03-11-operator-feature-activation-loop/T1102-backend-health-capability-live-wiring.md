# T1102 - Backend Health / Capability Live Wiring

## Spec

### 문제

- operator inspector는 구조화된 UI를 갖췄지만, live profile health와 capability readiness를 end-to-end로 보여주는 운영 경로는 아직 약하다.
- binding architecture 문서에는 `profiles/:id/health`, capability mismatch, fallback readiness가 정의돼 있다.

### 목표

- operator panel이 profiles, bindings, capabilities, health 상태를 live data로 읽고 경고를 표면화한다.
- operator가 summary/translate binding을 실제로 읽고 수정하는 live CRUD 경로를 끝까지 사용할 수 있게 한다.
- summary/translate activation 전에 operator가 misconfiguration을 바로 확인할 수 있게 한다.

### 범위

- 포함:
  - live profile/binding fetch + create/update mutation path
  - profile health endpoint/adapter contract
  - capability summary와 binding mismatch live refresh
  - fallback readiness / recent failure helper surface
- 제외:
  - summary/translate provider execution
  - public surface 노출

### 해결방안

- backend admin API에 health contract를 추가하고 frontend adapter에 정규화한다.
- inspector와 editor는 `ready | misconfigured | unavailable` 해석을 live data와 결합한다.
- operator action 직전 현재 health/capability 상태를 review surface에 드러낸다.

### 수용 기준 (AC)

- [x] health/capability live wiring의 문제/범위/해결안이 고정된다.
- [x] live profile/binding fetch + mutation path가 범위에 포함된다.
- [x] capability mismatch / health mismatch / fallback readiness 경고가 task 범위에 포함된다.
- [x] public surface 미노출 원칙이 유지된다.

## Plan

1. backend health endpoint shape와 frontend normalizer 계약을 정한다.
2. operator editor/inspector가 live profiles/bindings/capabilities/health를 함께 읽고 수정하도록 연결한다.
3. mismatch/fallback/recent failure 경고 copy와 refresh flow를 정한다.
4. summary/translate activation gating에 필요한 read model을 남긴다.

## Review Checklist (Plan Review)

- [x] health 결과가 binding resolution과 충돌하지 않는가?
- [x] capability mismatch와 health down 상태가 구분돼 보이는가?
- [x] operator가 profile/binding CRUD를 raw JSON 우회 없이 끝낼 수 있는가?
- [x] operator가 apply 전에 현재 health 상태를 읽을 수 있는가?
- [x] public host exposure가 scope 밖으로 유지되는가?

## Self Review 1 - Scope Fit

- [x] T1101 다음에 바로 필요한 operator readiness task라 P0가 맞다.
- [x] summary/translate vertical slice의 선행 visibility를 제공한다.
- [x] “실제로 각 backend를 바꿀 수 있는가”라는 운영 질문을 직접 다룬다.

## Self Review 2 - Safety

- [x] health down과 capability mismatch를 분리해 잘못된 rollback/disable을 줄인다.
- [x] fallback readiness를 명시해 partial outage 대응 경로를 남긴다.

## Self Review 3 - Executability

- [x] API contract, frontend adapter, inspector surface, smoke로 구현 경로가 명확하다.
- [x] settings/operator 테스트와 smoke에 자연스럽게 연결된다.

## Implementation Log

live CRUD와 inspector foundation은 이미 landed 상태고, 남은 일은 health revalidation을 더 명시적인 운영 flow로 닫는 것이다.

- [x] live profile/binding fetch + mutation path를 operator panel에 연결했다.
- [x] inspector에 live health/capability/fallback notices를 연결했다.
- [x] profile별 health revalidation endpoint와 frontend adapter 계약을 마무리했다.
- [x] operator refresh/review flow에서 현재 health/mismatch snapshot과 last-checked 정보를 더 명시적으로 드러냈다.
- [x] `unknown` health 해석을 binding resolution과 inspector notice가 같은 기준으로 보도록 정렬했다.

## Review Checklist (Implementation Review)

- [x] live health/capability 상태가 stale cache 없이 일관되게 보이는가?
- [x] profile/binding CRUD가 internal admin surface에서 end-to-end로 동작하는가?
- [x] mismatch warning이 raw JSON 없이도 충분히 읽히는가?
- [x] health 실패가 core settings page failure로 전이되지 않는가?

## Verify

- [x] `npm --prefix webapp run test -- src/components/backendBindingOperatorModel.test.ts src/components/BackendBindingOperatorPanel.test.tsx src/services/api/backendBindingContracts.test.ts src/services/api/rtzrApiClient.test.ts`
- [x] `npm --prefix webapp run lint`
- [x] `python3 -m unittest discover -s python_api/tests`
- [ ] `RUN_UI_SMOKE=1 INTERNAL_BASE_URL=<internal-base> ./scripts/post-deploy-smoke.sh`
