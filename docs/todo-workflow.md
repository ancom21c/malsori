# Todo Workflow

이 문서는 `malsori`가 사용하는 repo-local TODO lifecycle을 정의한다. 기준은 현재 레포의 `plan + active board + task doc` 운영 방식과 전역 `agents-docs-bootstrap`, `repo-plan-review-commit` 스킬의 공통 요구사항을 합친 것이다.

## Completion Policy

- repo policy는 `archive-in-place`다.
- 완료된 loop의 `docs/todo/<loop>/` 폴더는 삭제하거나 이동하지 않고 그대로 둔다.
- 대신 board/plan/task 문서에서 `current execution` 표현을 제거하고 `historical execution` 역할을 명시한다.
- durable conclusion만 `docs/knowledge/`로 승격하고, 나머지 task history/evidence는 해당 historical loop 아래에 남긴다.

## Lifecycle Roles

- `Canonical docs`
  - baseline spec, rollout contract, operator contract, feature contract
  - 위치: `docs/plan-*.md` baseline 문서, `docs/knowledge/*`
- `Active execution docs`
  - 현재 진행 중인 구현 loop의 plan, board, task docs
  - 위치: `docs/plan-<theme>-YYYY-MM-DD.md`, `docs/todo/<loop>/README.md`, `docs/todo/<loop>/T*.md`
- `Historical docs`
  - 완료된 plan/board/task/evidence
  - 위치: 기존 `docs/plan-*.md`, `docs/todo/<loop>/`, `docs/todo/<loop>/evidence/`
- `Local scratch`
  - 임시 메모, command transcript, 폐기될 self-review
  - 위치: `.codex/workloops/`

## Naming Convention

- loop plan: `docs/plan-<theme>-YYYY-MM-DD.md`
- loop folder: `docs/todo/YYYY-MM-DD-<slug>-loop/`
- active board: `docs/todo/<loop>/README.md`
- task doc: `docs/todo/<loop>/T<id>-<slug>.md`

## Start Or Extend A Loop

1. 먼저 현재 active loop에 이 작업이 자연스럽게 들어가는지 판단한다.
2. 맞으면 기존 board에 task만 추가하고, 아니면 새 plan + loop folder를 만든다.
3. 새 loop를 만들 때는 `docs/todo-template/`의 template를 복사해 placeholder를 채운다.
4. task를 만들기 전에 문제, 목표, 범위, 해결안, acceptance criteria를 먼저 적는다.
5. loop가 active가 되는 순간 entry docs를 같은 change에서 갱신한다.

## Entry Docs That Must Stay In Sync

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/knowledge/README.md`
- frontend current loop가 바뀌면 `webapp/AGENTS.md`, `webapp/docs/IMPLEMENTATION_NOTES.md`

todo folder를 추가/삭제/종료하면서 위 entry docs를 그대로 두는 변경은 불완전한 문서 변경으로 본다.

## Per-Task Execution Loop

모든 non-trivial work는 아래 순서를 기본으로 따른다.

1. `Spec`
   - 문제, 목표, 범위, 해결안, AC를 명시한다.
2. `Plan Review`
   - 접근 방식, rollback, safe default, boundary, risk를 점검한다.
3. `Implement`
   - 작은 단위로 나누고 `Implementation Log`에 남긴다.
4. `Implementation Review`
   - regression, security, UX drift, ops risk를 점검한다.
5. `Verify`
   - lint/build/test/smoke/doc gate를 기록한다.

## Repo Plan -> Review -> Verify Discipline

`repo-plan-review-commit` 스킬에 맞춰 다음을 기본 규칙으로 둔다.

- plan은 새 repo 파일을 억지로 만들지 말고, 현재 active task doc 또는 plan doc에 녹인다.
- 큰 구현은 acceptance criteria가 적힌 task doc 없이 시작하지 않는다.
- 구현 후에는 전체 diff를 끝까지 읽고 self-review 한다.
- verify는 README, task doc, script에 적힌 명령을 우선 사용한다.
- durable knowledge가 생기면 `docs/knowledge/`와 그 index를 같은 change에서 갱신한다.

## Verify Baseline

문서나 board를 건드렸다면 최소한 아래를 본다.

- `node scripts/check-todo-board-consistency.mjs`
- `git diff --check`

기능 변경이 있으면 여기에 더해 다음 중 relevant한 것을 task `Verify` 섹션에 적고 실행한다.

- `npm run lint`
- `npm run build`
- `npm test`
- `npm --prefix webapp run i18n:check`
- `./scripts/post-deploy-smoke.sh`

## Scratch vs Published Evidence

- `.codex/workloops/`
  - session plan
  - ad-hoc command output
  - temporary self-review
  - discarded options
- `docs/todo/<loop>/evidence/`
  - completed loop와 함께 repo에 남겨야 하는 screenshot, smoke note, rollout evidence

publish 가치가 없는 raw output을 `docs/knowledge/`나 active board에 직접 쌓지 않는다.

## Closing A Task Or Loop

1. task checklist와 board status를 맞춘다.
2. durable conclusion을 `docs/knowledge/`에 승격한다.
3. active entry docs의 포인터를 다음 open loop로 옮기거나, active loop가 없으면 그 사실을 명시한다.
4. 완료된 loop 문서는 `historical` role로 내리고 `archive-in-place` 상태로 남긴다.
5. completed loop를 `current execution`으로 계속 가리키는 entry doc이 없도록 확인한다.

## Quick Checklist

- 새 task/loop를 만들 때 entry docs를 같은 change에서 갱신했는가?
- task doc에 `Spec -> Plan Review -> Implement -> Impl Review -> Verify`가 모두 있는가?
- verify 명령이 task doc이나 README에 남아 있는가?
- 완료된 loop를 `historical`로 내렸는가?
- durable knowledge만 `docs/knowledge/`로 올리고 raw history는 loop 아래에 남겼는가?

## Active/Completed Hygiene

- Keep top-level entry docs such as `AGENTS.md` and `docs/README.md` short and active-focused.
- Completed history belongs in archive/historical docs instead of growing the entry docs indefinitely.
- Surface missing or unclassified items first when reconciling indices.
- Items with unresolved blockers, unchecked acceptance, or visible `TBD` markers are not completed yet.

## Knowledge vs Archive

- Promote only the durable minimum into `docs/knowledge/`.
- Archive raw command output, bulk change history, rejected local alternatives, and task-specific evidence in the repo's historical/archive path.
- Keep knowledge docs curated and link to archive/historical material for the rest.
