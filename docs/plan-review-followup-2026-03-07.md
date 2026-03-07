# Review Follow-up Remediation Plan (2026-03-07)

> Status: current execution plan. Current canonical UI/spec baseline remains `docs/plan-ui-remediation-2026-03-06.md`.

## Goal

2026-03-07 review findings에서 확인된 문서 truth drift, runtime observability init hole, realtime 종료/접근성 문제, settings/list/detail UX 결함, large-list 성능 한계를 순차적으로 복구한다.

## Inputs

이번 follow-up 루프의 핵심 문제는 여덟 축이다.

1. canonical release gate 문서가 실제 CI와 다르다.
2. current execution 문서가 완료된 보드와 어긋난다.
3. runtime error reporter가 hydrated settings 없이 1회 초기화된다.
4. reconnect 중 정상 종료 시 buffered audio가 보존되지 않을 수 있다.
5. realtime settings/dialog/transcript의 키보드/라이브 영역 UX가 약하다.
6. settings draft는 저장 전 이탈 시 조용히 유실될 수 있다.
7. list filter history와 trigger semantics가 back/forward 및 a11y 요구를 완전히 만족하지 않는다.
8. detail keyboard shortcut/title affordance, large-list 렌더링이 아직 operator-grade로 충분하지 않다.

## Canonical Decisions

### 1. Documentation Truth Contract

- canonical release gate는 actual CI와 같아야 한다.
- current execution plan은 열려 있는 작업만 current tense로 유지한다.
- completed loop 문서와 task log는 historical/archive role로 내린다.
- README와 implementation note는 current truth entry point 역할을 해야 한다.

### 2. Runtime Error Reporting Contract

- runtime error reporter는 hydrated settings와 runtime config가 모두 준비된 뒤에 enable 여부를 결정한다.
- internal admin base가 later hydration으로 들어와도 reporter를 활성화할 수 있어야 한다.
- runtime error reporting은 runtime config flag와 admin base URL 둘 다 충족할 때만 켠다.

### 3. Realtime Finalization Contract

- reconnect 중 stop 요청이 들어오면 가능하면 buffered audio replay + final까지 시도한다.
- replay/final이 불가능한 상태면 dropped metrics와 degraded state를 명시적으로 남긴다.
- 종료 경로는 silent data loss처럼 보이지 않도록 사용자 메시지와 저장 metadata를 정렬한다.

### 4. Realtime Accessibility Contract

- dialog close 후 포커스는 열었던 trigger 또는 명시적 fallback target으로 돌아와야 한다.
- transcript는 live session 중 `aria-live="polite"` 또는 동등한 접근성 경로를 가져야 한다.
- auto-follow는 사용자가 끌 수 있어야 하며, 과거 transcript 검토를 방해하지 않아야 한다.

### 5. Settings Guardrail Contract

- dirty draft가 있는 상태에서 라우트 이탈/새로고침 시 경고한다.
- settings section은 deep-link 가능한 URL state를 가질 수 있다.
- internal operator section은 URL과 scroll position 모두에서 안정적으로 복귀 가능해야 한다.

### 6. List / Detail Interaction Contract

- filter 변경은 deep-link뿐 아니라 back/forward에도 의미 있는 history를 남긴다.
- disclosure trigger는 `aria-expanded`/`aria-controls`를 제공한다.
- detail page shortcut은 editor/player scope 안에서만 동작하고, global page navigation을 가로채지 않는다.
- title edit는 visible, focusable affordance를 가져야 한다.

### 7. Large-list Rendering Contract

- 100+ history에서도 mount/update cost를 줄이는 실제 구조적 최적화가 필요하다.
- `content-visibility`만으로 부족하면 incremental rendering 또는 virtualization-equivalent windowing으로 보강한다.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T801 | P0 | Documentation truth recovery | canonical/current/archive 문서와 entry point 정렬 |
| T802 | P1 | Runtime error reporter hydration-safe init | hydrated settings 이후 observability init |
| T803 | P1 | Realtime stop/finalize resilience | reconnect stop 경로의 buffered audio/finalize 안정화 |
| T804 | P1 | Realtime accessibility recovery | dialog focus restore + transcript follow-live/a11y |
| T805 | P1 | Settings guardrails | unsaved changes guard + section URL state |
| T806 | P1 | List navigation/accessibility hardening | filter history + trigger semantics 정렬 |
| T807 | P1 | Detail ergonomics recovery | shortcut scope 축소 + visible title edit |
| T808 | P2 | Large-list scalability v2 | full-mount cost 감소 |

## Definition of Done

- P0 완료 후 canonical/current/archive 문서를 읽었을 때 상태 모순이 없어야 한다.
- P1 완료 후 runtime/settings/realtime/detail/list 주요 interaction이 silent failure 없이 설명 가능해야 한다.
- P2 완료 후 large-list가 구조적으로 더 확장 가능해야 한다.

## Self Review

- [x] 이번 루프는 문서, 런타임, realtime, settings/list/detail, large-list를 서로 독립적인 task로 분리했다.
- [x] commit 단위를 task 단위로 유지할 수 있도록 write scope를 명확히 나눴다.
- [x] 문서 정리와 런타임 수정이 섞여 source-of-truth를 다시 흐리지 않도록 순서를 P0 -> P1 -> P2로 고정했다.
