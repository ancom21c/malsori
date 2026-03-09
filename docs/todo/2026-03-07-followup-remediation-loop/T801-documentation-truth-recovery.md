# T801 - Documentation Truth Recovery

## Spec

### 문제

- canonical release gate와 actual CI가 다르다.
- current execution 문서가 완료된 board와 어긋난다.
- README / implementation note / task log 일부가 historical 내용을 current truth처럼 보이게 한다.

### 목표

- 문서 source-of-truth를 다시 일관되게 만든다.

### 범위

- 포함:
  - canonical release gate 문구 수정
  - current execution 문서 상태/시제 수정
  - README / implementation notes entry point 정리
  - T703/T707 task log 내부 모순 수정
- 제외:
  - 기능 코드 변경

### 해결방안

- `docs/plan-ui-remediation-2026-03-06.md`의 release gate를 actual CI 기준으로 갱신한다.
- `docs/plan-review-remediation-2026-03-07.md`를 historical execution plan으로 내리거나 current status를 종료형으로 바꾼다.
- root README와 implementation notes를 current truth 진입점으로 다시 맞춘다.

### 상세 설계

- canonical release gate는 `lint`, `i18n:check`, `build`, `bundle:check`, `npm test` 전체로 통일한다.
- 이전 execution plan은 current가 아니라 completed historical loop로 명시한다.
- `webapp/docs/IMPLEMENTATION_NOTES.md`의 QA/current milestone/next steps에서 historical 링크를 정리한다.
- task log는 spec/implementation self-contradiction을 남기지 않는다.

### 수용 기준 (AC)

- [ ] canonical release gate 문서가 actual CI와 일치
- [ ] current/historical 문서 role이 읽는 즉시 구분됨
- [ ] README/implementation notes가 stale guidance를 current truth처럼 안내하지 않음

## Plan (Review 대상)

1. canonical/current/archive 문서와 entry point를 스캔한다.
2. release gate 문구와 status header를 먼저 정렬한다.
3. README / implementation notes / task logs를 같은 vocabulary로 정리한다.
4. role keyword 재검색으로 drift를 다시 점검한다.

## Review Checklist (Plan Review)

- [x] 문서를 삭제하지 않고 role을 재배치하는가?
- [x] actual CI contract를 문서가 그대로 반영하는가?
- [x] historical evidence 보존과 current truth 명확화가 동시에 되는가?

## Self Review (Spec/Plan)

- [x] 문서 truth 문제를 current/canonical/archive 세 층으로 분해했다.
- [x] T703/T707 같은 task log 내부 모순도 같은 task에서 닫을 수 있게 범위를 잡았다.
- [x] 코드 변경 없이도 검증 가능한 gate를 정의했다.

## Implementation Log

- [x] `docs/plan-ui-remediation-2026-03-06.md`의 release gate를 actual CI 기준(`lint`, `i18n:check`, `build`, `bundle:check`, `test`)으로 갱신했다.
- [x] `docs/plan-review-remediation-2026-03-07.md`와 `docs/todo/2026-03-07-review-remediation-loop/README.md`를 historical role로 내리고, 새 follow-up loop를 current execution으로 연결했다.
- [x] root `README.md`, `webapp/docs/IMPLEMENTATION_NOTES.md`의 current entry point와 QA 설명을 현재 truth 기준으로 정리했다.
- [x] T703/T707 historical task log 안의 spec/implementation mismatch 및 validation overclaim을 정리했다.

## Review Checklist (Implementation Review)

- [x] canonical/current/archive 용어가 touched docs에서 일관적인가?
- [x] current CI contract와 문서가 완전히 일치하는가?
- [x] stale next-step 링크가 제거되었는가?

### Self Review (Implementation)

- canonical/current/archive 역할을 새 문서를 추가하는 방식이 아니라 기존 문서 role을 재표기하는 방식으로 정리해 evidence 보존을 유지했다.
- historical task log의 과장된 표현을 현재 truth에 맞춰 낮춰, “Done” 상태가 실제 검증 범위를 넘어서 읽히지 않게 했다.
- root README와 implementation notes가 current entry point를 직접 가리키도록 바꿔 신규 독자가 historical 문서로 먼저 들어갈 가능성을 줄였다.

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] role keyword re-scan on touched docs
