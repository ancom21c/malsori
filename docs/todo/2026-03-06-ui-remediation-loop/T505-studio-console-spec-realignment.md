# T505 - Studio Console 스펙/문서 Canonical 재정의

## Spec

### 문제

- 현재 구현의 dark Studio Console 방향, realtime bespoke component family, permission recovery 위치가 기존 문서에 충분히 반영되어 있지 않다.
- rollout 문서의 "verified" 표현과 실제 branch 상태가 엇갈릴 수 있다.
- 이후 구현이 어떤 문서를 따라야 하는지가 다시 모호해졌다.

### 목표

- 현재 승인된 UI 구조와 품질 게이트를 문서상 canonical contract로 재정의한다.
- 디자인 방향 문서와 실행 추적 문서의 역할을 분리한다.

### 범위

- 포함:
  - canonical spec 문서와 execution/evidence 문서 역할 재정의
  - realtime HUD/permission recovery/component family 위치 문서화
  - verification wording 및 status rule 정리
- 제외:
  - 실제 UI 구현 자체

### 해결방안

- remediation plan 문서를 상위 설계 문서로 두고, 기존 문서는 canonical/execution/evidence 역할로 재구분한다.
- realtime 전용 컴포넌트 계열을 허용하되, shared token/IA contract를 따라야 한다는 규칙을 명시한다.
- `verified`/`Done` 표현은 명령 검증 결과와 연결된 상태로만 사용한다.

### 상세 설계

- spec 문서에는 승인된 IA, token, ownership, quality gate만 남긴다.
- rollout 문서에는 단계별 실행과 evidence 경로만 남긴다.
- task board는 구현 상태를 기록하고, canonical design decision은 상위 설계 문서로 수렴시킨다.
- permission recovery가 HUD primary로 승격되는 경우 그 이유와 UX tradeoff를 문서에 남긴다.

### 수용 기준 (AC)

- [x] canonical/execution/evidence 문서 역할이 명시적으로 분리됨
- [x] realtime 구조 변경(전용 component family, recovery 위치, audio meter contract)이 문서화됨
- [x] `verified` 상태 표현이 실제 검증 명령과 모순되지 않음

## Plan (Review 대상)

1. 현행 문서의 역할 충돌 지점을 표로 정리한다.
2. canonical/execution/evidence 역할을 재배치한다.
3. realtime 구조 변경과 quality gate wording을 문서에 반영한다.
4. todo board와 상위 설계 문서 간 링크를 정리한다.

## Review Checklist (Plan Review)

- [x] 문서 중복을 늘리기보다 역할을 분리하는 쪽으로 설계했는가?
- [x] realtime 전용 컴포넌트 사용을 허용하되 무규칙 확장이 되지 않도록 guardrail을 두었는가?
- [x] 상태 표현(`Done`, `verified`)의 의미를 검증 명령과 연결했는가?

## Self Review (Spec/Plan)

- [x] 문서 역할 모호성을 별도 P1 task로 올릴 만큼 중요도가 충분하다.
- [x] 구현과 문서가 다시 어긋나는 것을 방지하는 장치가 포함되어 있다.
- [x] 다른 task의 완료 결과를 흡수할 상위 구조가 마련되어 있다.

## Implementation Log

- [x] 문서 역할 충돌 인벤토리 작성
- [x] canonical/execution/evidence 문서 재정의
- [x] realtime 구조 변경 문서 반영
- [x] 링크/용어 정합성 점검

## Review Checklist (Implementation Review)

- [x] 문서만 읽고도 구현 우선순위와 수용 기준을 이해할 수 있는지 확인
- [x] 기존 evidence/history를 깨지 않는지 확인
- [x] 문서 간 중복 진술이 다시 늘어나지 않았는지 확인

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] 문서 diff self-review
- [x] 관련 문서 교차 링크 점검
