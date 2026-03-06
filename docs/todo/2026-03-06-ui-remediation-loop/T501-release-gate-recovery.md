# T501 - Studio UI Release Gate 복구 (`lint/build/i18n/temp artifact`)

## Spec

### 문제

- 현재 Studio Console 변경분은 `lint/build/i18n` 게이트를 통과하지 못한다.
- rollout 문서상 검증 완료 상태와 실제 워킹트리가 어긋난다.
- `src/` 아래 임시 파일이 남아 있어 리뷰/머지 혼선을 유발한다.

### 목표

- 현재 UI branch를 다시 배포 가능한 기본 상태로 되돌린다.
- 빌드 차단 이슈와 번역 누락, 임시 산출물을 한 번에 정리한다.

### 범위

- 포함:
  - unused import/state/type 오류 정리
  - `motion.Box` 등 타입/빌드 오류 제거
  - 누락 i18n key 등록 및 `i18n:check` green 복구
  - `src/` 내 임시 파일 정리
- 제외:
  - 기능/IA 재설계 자체

### 해결방안

- build/lint/i18n 실패 항목을 failure inventory로 고정하고, 한 항목씩 제거한다.
- 타입 우회(`any`)는 구체 타입으로 치환한다.
- 새 UI에서 추가한 카피/버튼 label을 translation registry에 먼저 등록한다.
- 임시 파일은 삭제하거나, 필요한 경우 정식 task 문서로 승격한다.

### 상세 설계

- `RealtimeSettingsDialog`의 runtime field key는 union type으로 고정한다.
- `VUMeter`는 `motion.div` + `Box` wrapper 패턴으로 바꿔 `motion.Box` 타입 오류를 제거한다.
- release gate 명령은 이후 Verify 섹션의 canonical checklist로 고정한다.
- temp artifact 정리 후 동일 이름의 shadow file이 남지 않도록 검색 게이트를 추가한다.

### 수용 기준 (AC)

- [x] `npm --prefix webapp run lint` 통과
- [x] `npm --prefix webapp run build` 통과
- [x] `npm --prefix webapp run i18n:check` 통과
- [x] `npm --prefix webapp run test -- AppRouter` 통과
- [x] `webapp/src/` 아래 임시 `.tmp` 파일이 남지 않음

## Plan (Review 대상)

1. 현재 failure inventory를 명령 결과 기준으로 캡처한다.
2. compile/lint blocker를 소스 파일 단위로 제거한다.
3. i18n key registry를 보완하고 다시 검증한다.
4. temp artifact 정리 후 전체 release gate를 다시 실행한다.

## Review Checklist (Plan Review)

- [x] 기능 회귀 없이 출하 게이트만 복구하는 작업으로 범위를 제한했는가?
- [x] `any` 제거와 translation 등록이 후속 task와 충돌하지 않는가?
- [x] temp artifact 정리가 사용자 변경을 삭제하는 방식이 되지 않도록 주의 지점을 명시했는가?

## Self Review (Spec/Plan)

- [x] 문제와 목표가 release gate 복구에 집중되어 있다.
- [x] AC가 명령 기반으로 측정 가능하다.
- [x] 이후 task들이 이 작업 완료를 전제로 안전하게 진행될 수 있다.

## Implementation Log

- [x] failure inventory를 최신 명령 결과로 갱신
- [x] source별 lint/build blocker 수정
- [x] translation completeness gate 복구(`missing key` 사용처를 기존 key 또는 정의된 key로 정리)
- [x] temp artifact 정리
- [x] release gate 재실행

## Review Checklist (Implementation Review)

- [x] 수정 과정에서 숨겨진 기능 삭제/카피 손실이 없는지 diff와 사용처 기준으로 확인
- [x] translation completeness가 `i18n:check` 기준으로 복구되었는지 확인
- [x] build 통과를 위해 임시 우회(`eslint-disable`, 광범위 any`)를 넣지 않았는지 확인

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run test -- AppRouter`
- [x] `rg -n '\\.tmp$' webapp/src || true`
