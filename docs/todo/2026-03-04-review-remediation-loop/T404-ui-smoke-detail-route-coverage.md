# T404 - UI 스모크 S3(detail route) 커버리지 확장

## Spec

### 문제

- Studio Console rollout 대상에 `/transcriptions/:id`가 포함되지만, 배포 UI 스모크는 `/, /settings, /realtime`만 점검한다.
- Detail 화면 회귀(렌더 실패/콘솔 에러/레이아웃 깨짐)를 자동 검출하지 못한다.

### 목표

- 배포 UI 스모크에 S3(detail route) 검증을 추가해 화면 단위 회귀 차단 범위를 완성한다.

### 범위

- 포함:
  - UI smoke에 detail route 시나리오 추가
  - 데이터 없는 경우/데이터 있는 경우 중 최소 1개 안정 시나리오 확정
  - README/운영 runbook 업데이트
- 제외:
  - 전체 E2E 회귀 테스트 체계 도입

### 해결방안

- `scripts/post-deploy-ui-smoke.py`에 detail route 검사 로직을 추가한다.
- 우선 안정 경로로 `no record` 렌더 + page/console error 없는지 검증하고, 후속으로 fixture 기반 정상 레코드 시나리오를 확장한다.
- 스크린샷 산출물에 detail desktop/mobile 캡처를 포함한다.

### 수용 기준 (AC)

- [x] 배포 UI 스모크에서 detail route 렌더링이 자동 검증된다.
- [x] detail route에서 pageerror/console error 발생 시 스모크가 실패한다.
- [x] 스크린샷 아티팩트에 detail route가 포함된다.

## Plan (Review 대상)

1. detail route smoke 입력값(유효/무효 id) 전략을 확정한다.
2. 스모크 스크립트 route 목록과 assert 로직을 확장한다.
3. 스크린샷 파일 네이밍 규칙을 업데이트한다.
4. 문서/운영 커맨드 예시를 동기화한다.

## Review Checklist (Plan Review)

- [x] 데이터 유무에 따라 flaky 하지 않은가?
- [x] 실패 시 원인 파악 가능한 로그를 남기는가?
- [x] 기존 smoke 실행시간을 과도하게 늘리지 않는가?

## Implementation Log

- [x] `scripts/post-deploy-ui-smoke.py` detail route 검사 추가
  - desktop route 목록에 `/transcriptions/smoke-detail` 추가
- [x] 스크린샷 산출물 경로/이름 업데이트
  - `desktop-transcriptions-smoke-detail.png` 산출
- [x] 관련 문서 업데이트
  - `docs/todo/2026-03-04-review-remediation-loop/T404-ui-smoke-detail-route-coverage.md` 실행/검증 이력 반영

## Review Checklist (Implementation Review)

- [x] 실제 배포 URL에서 재현성 있게 통과/실패가 분리되는가?
- [x] detail route 회귀를 의도적으로 주면 스모크가 감지하는가?
- [x] 기존 route 검사와 충돌하지 않는가?

## Verify

- [x] `python3 scripts/post-deploy-ui-smoke.py --base-url https://malsori.ancom.duckdns.org --screenshot-dir /tmp/malsori-ui-smoke-t404`
- [x] `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh`
