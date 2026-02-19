# T108 - TODO 보드 상태-체크리스트 정합성 게이트

## Spec

### 문제

- 보드 상태(`Done/Pending`)와 개별 문서 체크리스트 상태가 어긋나도 자동으로 탐지되지 않는다.
- 실행 보드가 운영 신뢰도 지표 역할을 하려면 상태 정합성 자동 검증이 필요하다.

### 목표

- 보드 표와 task 문서 체크리스트 간 불일치를 CI에서 차단한다.

### 범위

- 포함:
  - 보드 markdown 파서 기반 정합성 검사 스크립트
  - `Spec/Plan/Implement/Impl Review/Verify` 상태 규칙 정의
  - CI 게이트 추가
- 제외:
  - 외부 이슈 트래커 연동

### 해결방안

- 정합성 검사 스크립트:
  - `README.md` Task Board의 각 상태값 파싱
  - 각 task 문서에서 대응 섹션 체크박스 완료율 계산
  - 상태 규칙 위반 시 실패 반환
- 규칙 예시:
  - 보드 `Done`이면 해당 섹션 체크박스가 모두 완료여야 함
  - 보드 `Pending`이면 미완료 체크박스가 최소 1개 이상 존재
- 운영 편의:
  - 실패 메시지에 불일치 위치(파일/섹션) 출력
  - 로컬 실행용 npm/script 진입점 제공

### 수용 기준 (AC)

- [x] 보드/문서 상태 불일치가 자동으로 검출된다.
- [x] 개발자가 로컬에서도 동일 검증을 실행할 수 있다.
- [x] CI에서 불일치 발견 시 배포 파이프라인이 차단된다.

## Plan (Review 대상)

1. 현재 보드 포맷과 체크리스트 패턴 표준화
2. 정합성 규칙 및 예외 규칙 정의
3. 스크립트 구현 후 기존 보드(`2026-02-19`)에 시범 적용
4. CI 파이프라인 연결 및 문서화

## Review Checklist (Plan Review)

- [x] markdown 변형(공백/순서 변경)에 견고한가?
- [x] false positive/negative를 줄일 충분한 파싱 규칙인가?
- [x] 신규 보드 추가 시 추가 작업 없이 자동 적용되는가?

## Implementation Log

- [x] 정합성 검사 스크립트 추가
  - `scripts/check-todo-board-consistency.mjs` 구현
  - `docs/todo/*/README.md`의 Task Board와 task 문서 체크리스트 정합성 검사
- [x] CI 연동
  - `.github/workflows/ci.yml`에 `Todo Board Consistency` job 추가
- [x] 보드 작성 가이드 업데이트
  - `README.md`의 Useful Scripts/QA & CI 섹션에 consistency 게이트 반영

## Review Checklist (Implementation Review)

- [x] 기존 보드에서 오검출 없이 동작하는가?
- [x] 오류 메시지가 바로 수정 가능한 수준으로 명확한가?
- [x] 유지보수 비용이 낮은 구조인가?

## Verify

- `node scripts/check-todo-board-consistency.mjs`
- `npm --prefix webapp test`
- CI dry-run 또는 로컬 파이프라인 실행
