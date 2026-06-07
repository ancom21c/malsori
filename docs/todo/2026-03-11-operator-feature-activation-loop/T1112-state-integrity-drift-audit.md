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
- [x] Round 3: backend override 파일 쓰기 실패가 기존 설정을 직접 덮어써 silent corruption / recovery drift를 일으키는 경로를 atomic write와 regression test로 막았다.
- [x] Round 4: Google Drive OAuth token 저장이 실패 중 기존 refresh token 파일을 깨뜨리는 silent corruption / recovery drift를 atomic write와 regression test로 막았다.
- [x] Round 5: 업로드 오디오 metadata 저장 실패가 바이너리만 남겨 read/write inconsistency를 만드는 경로를 cleanup과 regression test로 막았다.
- [x] Round 6: credential 없는 backend preset apply가 env credential을 계속 재사용하는 override merge drift를 null-clear payload와 regression test로 막았다.
- [x] Round 7: transcription 생성과 search index 생성이 transaction 없이 분리돼 index write 실패 시 반쯤 생성된 session이 남는 read/write inconsistency를 regression test와 transaction guard로 막았다.
- [x] Round 8: cloud sync account replace wipe가 `turnTranslations`를 지우지 않아 orphan translation artifact가 남는 lifecycle/read-write inconsistency를 regression test와 shared clear helper로 막았다.
- [x] Round 9: cloud pull/download가 raw segment overwrite 시 repository invariant를 우회해 stale translation/summary를 남기는 lifecycle/parity drift를 regression test와 shared guard helper로 막았다.
- [x] Round 10: downloaded cloud record refresh/download가 `segments.json` 누락 시 metadata만 섞거나 full download를 성공 처리하는 silent corruption / fallback drift를 regression test와 fail-closed segment fetch로 막았다.
- [x] Round 11: full cloud download가 더 이상 존재하지 않는 audio/video artifact를 local store에 남겨두는 parity/lifecycle drift를 regression test와 missing-media clear로 막았다.
- [x] Round 12: post-deploy UI smoke가 같은 browser context의 두 번째 `/` bootstrap을 900ms 고정 대기 후 바로 blank screen으로 오판하는 verification/bootstrap drift를 root-text stabilization과 regression test로 막았다.
- [x] Round 13: backend profile delete / feature binding write가 nonexistent profile reference를 허용해 broken binding state를 저장하던 stable-ID/read-write drift를 admin endpoint validation과 regression test로 막았다.
- [x] Round 14: downloaded cloud refresh pull이 segment만 갱신하고 stale local audio/video artifact를 남기는 parity drift를 regression test와 media refresh relink로 막았다.
- [x] Round 15: cloud push가 local에서 사라진 audio/video artifact나 replaced media format의 remote stale file을 남겨 다른 클라이언트 pull parity를 깨뜨리는 drift를 remote cleanup과 regression test로 막았다.
- [x] Round 16: cloud pull ghost-record 생성이 `metadata.json`의 drifted `id`를 그대로 저장해 folder key와 local record/search index key를 갈라놓는 stable-ID drift를 canonical folder-id write와 regression test로 막았다.
- [x] Round 17: cloud metadata에 client-local lifecycle flag(`downloadStatus`/`lastSyncedAt`/`isCloudSynced`)가 섞여 pull refresh가 not-downloaded record를 downloaded로 오염시키는 read/write drift를 metadata sanitize와 local-state preserve regression test로 막았다.
- [x] Round 18: cloud media refresh가 audio를 먼저 저장한 뒤 video download에서 실패하면 local media가 반쯤 교체되는 read/write inconsistency를 staged download + single transaction과 regression test로 막았다.
- [x] Round 19: full download가 segments를 먼저 교체한 뒤 media fetch에서 실패하면 `not_downloaded` 상태에 새 cloud segments가 남는 read/write inconsistency를 staged media fetch와 regression test로 막았다.
- [x] Round 20: full download가 newer cloud metadata를 다시 materialize하지 않아 stale title/transcript/search projection과 stale sourceRevision을 남기는 source-of-truth drift를 metadata fetch/apply와 regression test로 막았다.
- [x] Round 21: cloud push가 metadata를 먼저 publish한 뒤 artifact upload에서 실패하면 다른 client가 newer metadata와 stale artifact를 함께 읽는 source-of-truth drift를 metadata-last publish ordering과 regression test로 막았다.
- [x] Round 22: cloud pull/full-download가 stale `searchTitle/searchTranscript` projection을 그대로 보존해 title filter/read model이 cloud truth와 어긋나는 bug를 derived projection 재계산과 regression test로 막았다.
- [x] Round 23: cloud push retry가 `metadata.json` file mtime만 보고 newer cloud로 오판해 partial-publish legacy state를 영구 skip하는 recovery/source-of-truth drift를 metadata payload revision compare와 regression test로 막았다.
- [x] Round 24: in-flight full download가 더 새로운 cloud revision이 생긴 뒤에도 오래된 snapshot을 그대로 apply해 `updatedAt`/metadata/artifact를 rollback하던 lifecycle/read-write drift를 remote recheck + pre-apply revision guard와 regression test로 막았다.
- [x] Round 25: downloaded pull refresh도 artifact fetch 뒤 revision recheck 없이 stale snapshot을 apply해 local downloaded state를 rollback하던 lifecycle/read-write drift를 staged media apply + pre-apply revision guard와 regression test로 막았다.
- [x] Round 26: stale full download failure가 이미 다른 경로가 만든 newer `downloaded` state를 blind `not_downloaded` rollback으로 덮어쓰는 lifecycle drift를 status-conditional rollback guard와 regression test로 막았다.
- [x] 마지막 review pass에서 같은 클래스의 추가 실제 결함을 더 찾지 못했다.

## P2 / Minor Issues

- 현재 새로운 P2/minor issue는 없다.

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
