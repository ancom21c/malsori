# T405 - Studio Console 스펙/증적 문서 범위 모호성 해소

## Spec

### 문제

- Studio Console 관련 문서 간 scope 정의가 일부 불일치한다(대상 화면 수/단계 기술 기준 차이).
- rollout 문서의 evidence 요구(before/after, a11y notes)와 실제 저장 방식이 느슨해 추적성이 낮다.

### 목표

- 스펙 문서 간 범위와 용어를 단일 기준으로 정렬하고, 증적 산출물을 반복 가능한 구조로 문서화한다.

### 범위

- 포함:
  - `plan-studio-console-v3`와 rollout plan 범위 정렬
  - evidence 아티팩트 저장 규칙 문서화
  - TODO/README 링크 정합성 점검
- 제외:
  - 새 디자인 구현 자체

### 해결방안

- canonical spec 문서를 1개 지정하고, 나머지 문서는 해당 기준을 참조하도록 정리한다.
- stage별 증적 폴더 구조와 최소 필수 아티팩트 목록을 명시한다.
- post-deploy 문서와 todo 문서 간 교차 링크를 정리한다.

### 수용 기준 (AC)

- [ ] Studio Console 관련 문서에서 대상 화면/단계 정의가 모순 없이 일치한다.
- [ ] evidence 저장 위치/파일명 규칙이 명문화된다.
- [ ] 신규 배포 시 동일 템플릿으로 증적을 남길 수 있다.

## Plan (Review 대상)

1. 관련 문서 scope 표를 비교해 충돌 항목을 확정한다.
2. canonical 문서와 참조 문서를 구분한다.
3. evidence 템플릿(체크리스트/경로 규칙)을 정의한다.
4. 링크/명칭 정합성 검사를 수행한다.

## Review Checklist (Plan Review)

- [ ] 문서 개편이 기존 히스토리 추적을 훼손하지 않는가?
- [ ] 운영자가 바로 사용할 수 있는 수준으로 구체적인가?
- [ ] 과도한 문서 중복을 만들지 않는가?

## Implementation Log

- [ ] Studio Console 관련 문서 scope 정렬
- [ ] evidence 기록 템플릿/가이드 추가
- [ ] 관련 README/todo 링크 갱신

## Review Checklist (Implementation Review)

- [ ] 문서 간 상호 참조가 깨진 링크 없이 동작하는가?
- [ ] 문서만 보고도 stage별 증적 생성이 가능한가?
- [ ] TODO 보드 정합성 게이트가 통과하는가?

## Verify

- [ ] 문서 diff 리뷰 완료
- [ ] `node scripts/check-todo-board-consistency.mjs`
