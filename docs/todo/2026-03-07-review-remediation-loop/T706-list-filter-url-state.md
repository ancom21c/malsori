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

- [x] filter query schema를 `title`, `content`, `start`, `end`, repeated `kind`, repeated `model`, repeated `endpoint`로 고정했다.
- [x] `transcriptionListFilterState.ts`에 parse/build/equality 순수 함수를 분리했다.
- [x] invalid query는 trim/validation/dedupe 후 safe default로 복구하고, `kind=none` sentinel로 explicit empty kind selection도 보존했다.
- [x] `TranscriptionListPage`는 `useSearchParams`와 filter state를 양방향 sync하도록 바꿨다. URL 갱신은 `replace: true`로 처리해 검색 입력 history spam을 막았다.

## Review Checklist (Implementation Review)

- [x] 구현 후 spec drift가 없는지 확인
- [x] regression risk를 점검
- [x] verify 명령과 문서 역할이 일치하는지 확인

### Self Review (Implementation)

- parse/build/equality를 모델로 분리해 invalid query와 round-trip 규칙을 빠르게 테스트할 수 있게 했다.
- `replace: true`를 택해 share/reload/back-to-list 재현성을 확보하면서도 키 입력마다 history가 쌓이는 문제를 피했다.
- `selectedKinds=[]`는 기존 UI에서 의미가 있었기 때문에 sentinel을 넣어 refresh 후 checkbox state drift를 막았다.
- 남은 리스크는 page-level DOM integration test 부재다. 대신 URL schema/model test와 build/lint gate로 현재 루프 범위는 통제했다.

## Verify

- [x] `npm --prefix webapp run test -- transcriptionListFilterState`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
