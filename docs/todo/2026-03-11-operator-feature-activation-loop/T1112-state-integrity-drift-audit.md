# T1112 - State Integrity / Drift Audit

## Spec

### 문제

- persisted runtime state에 대해 `state integrity`, `recovery / migration / bootstrap drift`, `parity drift`, `stable ID drift`, `lifecycle drift`, `silent corruption / fallback / relink`, `read/write inconsistency`를 묶어 검증하는 hardening task가 없다.
- summary/translate/operator 확장 이후 shared store/runtime 경계에서 drift가 생겨도 core STT surface에 조용히 남을 수 있다.

### 목표

- 위 버그 클래스에 해당하는 실제 재현 가능한 결함만 찾는다.
- 각 결함을 최소 수정으로 고치고 반드시 regression test를 추가한다.
- 각 fix set마다 전체 검증, self-review, commit, clean worktree를 유지한 뒤 다시 처음부터 리뷰한다.

### 범위

- 포함:
  - webapp / python_api의 persisted state, repository, runtime bootstrap, artifact relink 경계 리뷰
  - 재현 가능한 drift/corruption bug에 대한 최소 수정
  - 각 수정에 대한 regression test와 전체 verify
- 제외:
  - 새 스키마 도입
  - 새 product concept 추가
  - 승인 없는 대규모 리팩터링

### 해결방안

- stateful boundary를 우선순위로 읽고, 실제로 깨지는 경로만 테스트로 고정한다.
- fix는 storage/runtime truth를 다시 맞추는 최소 범위로 제한한다.
- 매 라운드 후 전체 verify를 다시 돌리고, clean 상태에서 다음 리뷰 라운드로 넘어간다.

### 수용 기준 (AC)

- [x] 대상 버그 클래스와 작업 규칙이 task에 고정돼 있다.
- [x] 실제 버그만 최소 수정 + regression test로 처리한다는 원칙이 명시돼 있다.
- [x] 첫 번째 실제 fix set이 전체 verify와 함께 landed 된다.
- [x] 재리뷰 결과 더 이상의 동일 클래스 버그가 없다는 closeout evidence를 남긴다.

## Plan

1. 현재 shared store/runtime 경계에서 stable-id, lifecycle, read/write drift 위험이 높은 모듈을 우선 읽는다.
2. 실제 결함을 재현하는 regression test를 먼저 추가한다.
3. 최소 수정으로 결함을 막고 전체 verify를 실행한다.
4. clean 상태로 커밋한 뒤 처음부터 다시 리뷰해 다음 실제 결함이 있는지 확인한다.

## Review Checklist (Plan Review)

- [x] boundary / safe default / rollback이 맞는가?
- [x] scope가 다른 task와 겹치지 않는가?
- [x] verify 경로가 미리 정리돼 있는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current loop 목표와 직접 연결되는가?

## Self Review 2 - Safety

- [x] failure가 core flow에 전이되지 않는가?

## Self Review 3 - Executability

- [x] 구현 단위와 verify 명령을 바로 적을 수 있는가?

## Implementation Log

- [x] Round 1: `replaceSegments` / segment edit 경계에서 stale translation이 새 turn에 재연결되는 stable-ID drift를 regression test와 함께 막았다.
- [x] Round 1: jsdom/undici router test signal mismatch와 Python SDK eager import bootstrap drift를 regression test와 함께 막았다.
- [x] Round 2: settings single-write ordering, no-op speaker/correction lifecycle drift, default preset transactionality를 regression test와 함께 막았다.
- [x] 마지막 review pass에서 같은 클래스의 추가 실제 결함을 더 찾지 못했다.

## Review Checklist (Implementation Review)

- [x] current fix set은 summary/translate/operator core flow를 건드리지 않고 repository/test bootstrap 경계만 최소 수정했다.
- [x] 추가된 fallback은 test/bootstrap import 경계에만 머물고, installed SDK 경로를 대체하지 않는다.
- [x] 같은 버그 클래스가 더 남아 있는지 처음부터 다시 리뷰했다.

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
- [x] `npm --prefix webapp run test`
- [x] `python -m compileall python_api/api_server`
- [x] `PYTHONPATH=python_api pytest python_api/tests -q`
- [x] 다음 review 라운드 후 전체 verify를 다시 반복했다.
