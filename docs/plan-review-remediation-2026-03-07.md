# Review Remediation Plan (2026-03-07)

> Status: historical execution plan. `T701`~`T707` are complete in `docs/todo/2026-03-07-review-remediation-loop/README.md`. Current canonical UI/spec baseline remains `docs/plan-ui-remediation-2026-03-06.md`, and current execution work lives in `docs/plan-review-remediation-2026-03-08.md`.

## Goal

이 문서는 2026-03-07 review remediation loop에서 다룬 release gate, dev contract, settings operator UX, list UX/performance, 문서 hierarchy 문제의 target spec과 실행 기준을 보존하는 historical execution plan이다.
현재 활성 작업은 follow-up loop 문서가 담당한다.

## Inputs

이번 리뷰에서 확인된 핵심 문제는 여섯 축이다.

1. `bundle:check`가 실패해 실제 CI contract가 깨져 있다.
2. local dev 기본 API 경로 계약이 README, runtime default, Vite proxy 사이에서 모순된다.
3. settings operator availability가 여전히 입력 중 effect-driven으로 흔들린다.
4. transcription list empty-state copy가 현재 CTA 구조와 모순된다.
5. canonical spec / historical spec / completed loop 문서의 역할 경계가 아직 불명확하다.
6. transcription list는 filter state deep-link와 large-list scalability가 약하다.

## Canonical Decisions

### 1. Release / CI Contract

- `bundle:check`는 optional 참고용이 아니라 실제 CI gate로 취급한다.
- `lint`, `i18n:check`, `build`, `bundle:check`, `test`를 모두 통과해야 webapp이 green이다.
- perf 문서와 `vite.config.ts` chunk 전략은 실제 코드/출력과 일치해야 한다.
- budget을 맞추는 우선순위는 다음과 같다.
  - documented chunk split 회복
  - route-level lazy import 강화
  - shared heavy chunk 분리
  - budget 수치 변경은 마지막 수단

### 2. Local Dev API Contract

- production/public contract는 계속 same-origin root (`/`)를 canonical로 사용한다.
- local dev도 같은 contract를 쓰도록 Vite는 `/v1/*`를 backend로 proxy해야 한다.
- README의 dev 안내도 `/api`가 아니라 `/` 기준으로 정렬한다.
- 필요하면 `/api`는 일시적 legacy alias로 유지할 수 있지만, 기본값/문서/실행 예시는 하나로 통일한다.

### 3. Settings Manual Intent Contract

- API base URL 관련 입력은 local draft state를 사용한다.
- draft를 저장하는 explicit action 전에는 IndexedDB 저장과 네트워크 health check를 실행하지 않는다.
- operator availability check는 page entry 1회와 explicit refresh 버튼에서만 실행한다.
- operator state fetch/apply/reset은 기존대로 button intent에서만 실행한다.
- `backendAdminToken`은 계속 component-local memory only다.
- API base URL 입력은 URL 전용 input affordance를 사용한다.

### 4. List Empty-State Copy Contract

- empty-state 설명은 위치 지시를 금지한다.
- copy는 현재 가능한 행동 두 가지를 직접 말해야 한다.
- desktop inline CTA와 mobile sticky CTA가 같은 문장 semantics를 공유해야 한다.

### 5. Documentation Hierarchy Contract

- current canonical spec는 하나만 유지한다.
- completed loop plan은 current target spec가 아니라 archive/historical role로 내린다.
- board가 `Done`이면 연결된 상위 plan 문서도 target tense를 제거하거나 archive 표기를 해야 한다.
- README/perf docs는 current truth인지 historical evidence인지 문서 안에서 즉시 알 수 있어야 한다.

### 6. List State / Performance Contract

- 검색/필터 state는 URL query로 round-trip 가능해야 한다.
- 새로고침, 공유 링크, 뒤로가기에서 filter intent가 유지되어야 한다.
- list item 수가 일정 임계치를 넘으면 virtualization 또는 equivalent rendering optimization을 사용한다.
- large list에서는 layout animation을 축소하거나 끈다.

## Recommended Fix Direction

### T701 방향

- `vite.config.ts`의 manual chunk 전략을 perf 문서와 다시 맞춘다.
- `vendor-mui-core` / `vendor-emotion` / page-only heavy chunk를 재분리한다.
- build 결과와 `bundle:check` 결과를 새 perf note로 갱신한다.

### T702 방향

- `DEFAULT_PUBLIC_API_BASE_URL`은 유지한다.
- Vite dev server proxy를 `/v1` 기준으로 추가하고 README를 `/` 기준으로 바꾼다.
- `/api` alias를 남길지 제거할지는 implementation review에서 결정하되, docs default는 하나만 남긴다.

### T703 방향

- settings page의 `apiBaseUrl`, `adminApiBaseUrl`는 draft state + `Save Connection Settings` 버튼으로 바꾼다.
- availability effect dependency에서 입력값 변화를 제거한다.
- URL field는 same-origin root(`/`)를 허용해야 하므로 `inputMode="url"` 기반 affordance와 `name`, `autoComplete="off"`를 사용한다.

### T704 방향

- list empty-state copy를 행동 지시형 문장으로 교체한다.
- translation key 이름도 현재 semantics에 맞춰 정리한다.

### T705 방향

- `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md`를 archive/historical role로 바꾸거나 canonical doc에 흡수한다.
- `docs/plan-ui-remediation-2026-03-06.md`와 충돌하는 문구를 제거한다.
- perf docs도 `current`와 `historical` 표기를 정리한다.

### T706 방향

- list filters를 query param으로 승격한다.
- query serialization/deserialization을 순수 함수로 분리한다.
- back/forward friendly state sync를 추가한다.

### T707 방향

- history list에 virtualization을 도입하거나, 최소한 item threshold 기반으로 animation/content-visibility 전략을 적용한다.
- 성능 기준은 `100+` 항목에서 interaction jank 없이 필터/스크롤 가능한 수준으로 둔다.

## Design Direction

### 1. Settings

- `Public Setup`과 `Internal Operator`를 같은 페이지 안에서도 시각적으로 더 분리한다.
- operator zone은 border/accent/helper copy를 묶어 "내부망 전제"를 더 빨리 읽히게 한다.

### 2. Transcription List

- desktop은 query rail, mobile은 filter sheet에 가까운 정보구조가 적합하다.
- filter state가 URL에 남아야 operator가 결과를 공유하거나 재현하기 쉽다.

### 3. Realtime

- 이번 루프의 필수 수정은 아니지만, degraded/buffered 상태는 배너보다 compact quality rail로 옮기는 쪽이 다음 단계로 적합하다.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T701 | P0 | Bundle / CI gate recovery | `bundle:check` green + perf docs/code realigned |
| T702 | P1 | Local dev API contract alignment | dev default, Vite proxy, README를 same-origin `/` 기준으로 통일 |
| T703 | P1 | Settings manual intent hardening | URL draft/save flow + operator availability effect 정리 |
| T704 | P1 | List empty-state copy alignment | action-based copy로 CTA semantics 정렬 |
| T705 | P2 | Documentation hierarchy cleanup | canonical vs archive 문서 역할 명확화 |
| T706 | P2 | List filter URL state | filter state deep-link / refresh / back-forward 지원 |
| T707 | P2 | List rendering scalability | large history virtualization or equivalent optimization |

## Definition of Done

- P0 완료 후 webapp CI gate가 실제로 green이다.
- P1 완료 후 dev contract와 settings/list UX drift가 사라진다.
- P2 완료 후 문서 truth와 list usability/perf가 더 안정된다.

## Self Review

- [x] 수정안이 현재 발견된 문제를 그대로 task로 환원한다.
- [x] dev contract는 production contract를 흐리지 않는 방향으로 정리했다.
- [x] UX 제안은 cosmetic이 아니라 현재 오류/혼란 지점을 줄이는 방향으로 제한했다.
