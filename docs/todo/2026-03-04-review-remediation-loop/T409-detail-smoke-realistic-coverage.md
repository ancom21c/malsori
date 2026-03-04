# T409 - Detail route 스모크 실효성 강화 (실데이터/빈데이터 분리 검증)

## Spec

### 문제

- 현재 UI 스모크는 `/transcriptions/smoke-detail` 같은 비존재 ID를 기준으로 detail route를 확인해 실제 상세 워크스페이스 회귀를 충분히 감지하지 못한다.
- 최소 root text 길이(10)만으로 통과 가능해, 주요 패널(analysis/transcript)이 깨져도 탐지되지 않을 수 있다.

### 목표

- Detail route를 `빈데이터 상태`와 `실데이터 상태`로 분리 검증해 화면 회귀 탐지 신뢰도를 높인다.

### 범위

- 포함:
  - `scripts/post-deploy-ui-smoke.py`에 detail 검증 모드 분리
  - 운영 스모크에서 `DETAIL_SMOKE_ID`(실데이터 ID) 주입 지원
  - 스크린샷 산출물에 `detail-empty`, `detail-ready` 구분 저장
- 제외:
  - 전체 E2E 시나리오(전 기능 클릭 플로우) 도입

### 해결방안

- 기본 모드(항상 실행): 비존재 ID 접근 시 예상 empty-state 문구/경고 컴포넌트가 표시되는지 검증한다.
- 확장 모드(옵션): `DETAIL_SMOKE_ID`가 제공되면 해당 상세화면에서 핵심 워크스페이스 존재를 검증한다.
- detail 경로 검증 시 root text 길이 대신 핵심 selector(overview card / analysis / transcript 섹션)를 우선 사용한다.

### 수용 기준 (AC)

- [x] 빈데이터 detail route에서 expected empty-state UI와 no pageerror/console error가 확인된다.
- [ ] 실데이터 ID 제공 시 detail 핵심 패널이 렌더링되고 회귀 시 스모크가 실패한다.
- [x] 배포 스모크 문서에 `DETAIL_SMOKE_ID` 사용법과 실패 해석 가이드가 반영된다.

## Plan (Review 대상)

1. detail smoke 입력 정책(`default empty`, `optional ready`)을 명문화한다.
2. `post-deploy-ui-smoke.py`에 모드 분기와 selector 기반 assert를 추가한다.
3. `scripts/post-deploy-smoke.sh`에 `DETAIL_SMOKE_ID` 전달 환경변수를 연동한다.
4. 문서(`README.md`/운영 runbook)에 실행 예시와 판독 기준을 추가한다.

## Review Checklist (Plan Review)

- [x] 데이터 없는 환경에서도 flaky 없이 항상 통과/실패가 예측 가능한가?
- [x] 실데이터 모드 미지정 시 현재 배포 스모크 속도를 크게 늘리지 않는가?
- [x] 실패 로그만으로 empty-state 회귀 vs 상세 패널 회귀를 구분할 수 있는가?

## Implementation Log

- [x] `scripts/post-deploy-ui-smoke.py` detail empty/ready 분기 구현
- [x] `scripts/post-deploy-smoke.sh`에 `DETAIL_SMOKE_ID` 연동
- [x] 스크린샷 아티팩트 파일명 규칙(`detail-empty`, `detail-ready`) 정리
- [x] `README.md`에 `DETAIL_SMOKE_ID` 사용법 반영
- [x] `webapp/src/pages/TranscriptionDetailPage.tsx` 미존재 id 무한 로딩 방지(`undefined -> null` 정규화)

## Review Checklist (Implementation Review)

- [x] detail empty-state가 의도한 UX 카피/경고 스타일로 표시되는가?
- [ ] 실데이터 route에서 핵심 패널 누락/붕괴를 실제로 감지하는가?
- [x] 기존 `/`, `/settings`, `/realtime` 스모크와 충돌하지 않는가?

## Verify

- [x] `python3 scripts/post-deploy-ui-smoke.py --base-url http://127.0.0.1:4173 --screenshot-dir /tmp/malsori-ui-smoke-dev-empty`
- [ ] `DETAIL_SMOKE_ID=<id> python3 scripts/post-deploy-ui-smoke.py --base-url <url>`
- [ ] `RUN_UI_SMOKE=1 DETAIL_SMOKE_ID=<id> ./scripts/post-deploy-smoke.sh`
