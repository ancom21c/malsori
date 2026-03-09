# Contract + UX Remediation Plan (2026-03-08)

> Status: execution loop complete. This document remains the latest remediation execution record until a newer loop is registered. Current canonical UI/spec baseline remains `docs/plan-ui-remediation-2026-03-06.md`.

## Goal

2026-03-08 review findings에서 남은 contract drift와 UX 밀도 문제를 복구한다. 이번 루프는 빌드/배포 차단보다는 `조용히 틀어질 수 있는 상태 계약`과 `작업성 중심의 UI 정리`에 집중한다.

## Progress

- 완료: `T901`~`T905`
- 현재 open work: 없음

## Inputs

이번 루프에서 정리한 핵심 문제는 세 축이었다.

1. realtime transcript에서 visual auto-follow와 screen-reader live announcement가 강하게 결합돼 있다.
2. settings/operator boundary가 아직 operator-grade UI로 충분히 정돈되지 않았다.
3. mobile header chrome이 작은 화면 기준으로 아직 무겁다.

## Canonical Decisions

### 1. Settings Connection Contract

- dirty 판단과 save/update plan은 동일한 normalized value contract를 사용한다.
- 사용자가 편집 중(`dirty`)일 때는 persisted setting 변화가 draft를 자동으로 덮어쓰지 않는다.
- draft reset은 다음 세 경우에만 허용한다.
  - 초기 hydrate 이후 첫 seed
  - 사용자의 explicit reset
  - save 성공 후 committed value 반영
- route leave guard는 현재처럼 pathname 이동을 기준으로 유지하되, query-only navigation을 intra-page 이동으로 간주한다.

### 2. Documentation Truth Contract

- `current execution plan/board`는 아직 열려 있는 작업만 가리킨다.
- 완료된 execution loop 문서는 `historical`로 즉시 내린다.
- 루트 `README.md`와 `webapp/docs/IMPLEMENTATION_NOTES.md`는 항상 현재 루프 entry point를 가리킨다.
- `IMPLEMENTATION_NOTES` backlog는 이미 완료된 항목을 남기지 않는다.

### 3. Realtime Transcript Accessibility Contract

- `followLive`는 visual auto-scroll 전용 상태다.
- transcript live region은 session active 동안 접근성 경로를 유지해야 하며, visual follow preference에 종속되지 않는다.
- note mode에서는 transcript log live region을 비활성화해 중복 읽기를 피한다.

### 4. Settings Boundary Visual Contract

- `/settings`는 `Public Setup`과 `Operator Tools`를 시각적으로 분리한다.
- internal-network/admin token이 필요한 기능은 경고 tone, boundary copy, section labeling으로 명확히 구획한다.
- public path와 operator path는 동일 페이지 안에서도 위계가 달라 보여야 한다.

### 5. Mobile Header Chrome Contract

- 모바일 상단 바는 현재 route 작업을 우선한다.
- `CloudSyncStatus` 같은 전역 상태 표시는 작은 화면에서는 body/drawer/settings 쪽으로 이동하거나 더 약한 표현으로 축소한다.
- top bar의 기본 owner는 `menu + title + language` 수준으로 제한한다.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T903 | P2 | Realtime transcript accessibility decoupling | follow-live와 live announcement 분리 |
| T904 | P2 | Settings operator boundary polish | Public Setup / Operator Tools 시각 분리 |
| T905 | P2 | Mobile header chrome reduction | 작은 화면에서 global chrome 밀도 감소 |

## Definition of Done

- P2 완료 후 realtime transcript와 settings/header UI가 operator workflow 기준으로 더 명확해야 한다.
- current execution 문서를 읽었을 때 완료된 보드를 현재 작업처럼 오해하지 않아야 한다.

## Self Review

- [x] 이번 루프는 실제 결함과 시각 polish를 분리했다.
- [x] Settings contract는 correctness 우선, visual work는 P2로 배치했다.
- [x] current/archive 문서 역할을 task 범위 안에 포함해 문서 drift 재발을 줄인다.
