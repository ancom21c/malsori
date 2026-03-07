# T706 - List Filter URL State

## Spec

### 문제

- transcription list filter state가 URL에 반영되지 않는다.
- 새로고침/공유/뒤로가기에서 filter intent가 유지되지 않는다.

### 목표

- list filter state를 deep-linkable하게 만든다.

### 범위

- 포함:
  - query param schema 정의
  - state <-> query serialization/deserialization
  - back/forward 친화적 sync
- 제외:
  - server-side filtering 도입

### 해결방안

- filter state를 query param으로 승격한다.
- filter parsing/encoding은 순수 함수로 분리한다.
- default state는 query가 비었을 때만 적용한다.

### 상세 설계

- 최소 대상:
  - `title`
  - `content`
  - `start`
  - `end`
  - `kind`
  - `model`
  - `endpoint`
- multi-select 값은 stable comma list 또는 repeated key 중 하나로 통일한다.
- invalid query는 안전하게 무시하고 기본 상태로 복구한다.

### 수용 기준 (AC)

- [ ] filter 변경 시 URL이 반영됨
- [ ] 새로고침 후 동일 filter 유지
- [ ] 공유 링크로 같은 결과 집합 재현 가능
- [ ] invalid query string이 UI를 깨지 않음

## Plan (Review 대상)

1. filter state schema를 먼저 고정한다.
2. encode/decode 순수 함수를 만든다.
3. page state와 search params sync를 추가한다.
4. edge case를 테스트한다.

## Review Checklist (Plan Review)

- [x] filter key naming이 안정적인가?
- [x] invalid query를 safe default로 처리하는가?
- [x] URL noise를 과도하게 늘리지 않는가?

## Self Review (Spec/Plan)

- [x] UX 개선과 operator reproducibility를 동시에 제공한다.
- [x] purely client-side change로 시작할 수 있다.
- [x] next-step server search 도입과도 충돌하지 않는다.

## Implementation Log

- [ ] 구현 전

## Review Checklist (Implementation Review)

- [ ] 구현 후 spec drift가 없는지 확인
- [ ] regression risk를 점검
- [ ] verify 명령과 문서 역할이 일치하는지 확인

## Verify

- [ ] 구현 후 검증 명령 기록
