# T302 - 배포 UI 스모크 자동화 (Playwright)

## Spec

### 문제

- 현재 `scripts/post-deploy-smoke.sh`는 API/라우트 계약 중심이라, UI 런타임 회귀(빈 화면/콘솔 에러/모바일 겹침)를 충분히 차단하지 못한다.
- 배포 직후 수동 Playwright 검증이 반복된다.

### 목표

- 배포 스모크에 UI 렌더링/콘솔오류/모바일 레이아웃 핵심 검증을 자동으로 추가한다.

### 범위

- 포함:
  - Playwright 기반 UI 스모크 스크립트 추가
  - `post-deploy-smoke.sh` 옵션 연동
  - 사용법 문서화
- 제외:
  - 전체 E2E 테스트 스위트 도입

### 해결방안

- 신규 `scripts/post-deploy-ui-smoke.py`에서 desktop/mobile 핵심 시나리오 점검
- `RUN_UI_SMOKE=1` 옵션으로 `post-deploy-smoke.sh`에서 실행
- 기본은 `auto`로 두고 Playwright 미설치 환경에서는 skip 가능하게 처리

### 수용 기준 (AC)

- [x] `/`, `/settings`, `/realtime` UI가 정상 렌더링되고 런타임 오류가 없음을 자동 확인한다.
- [x] 모바일 빈 상태에서 CTA와 Quick Action FAB 겹침을 검증한다.
- [x] 기존 API 스모크와 함께 한 번의 커맨드로 실행 가능하다.

## Plan (Review 대상)

1. UI 스모크 기준(렌더, pageerror, console error, 핵심 CTA/상태 UI)을 확정한다.
2. Python Playwright 스크립트로 구현한다.
3. `post-deploy-smoke.sh`에 옵트인/오토 실행 옵션을 연결한다.
4. 배포 URL에서 실제 실행해 통과 로그를 남긴다.

## Review Checklist (Plan Review)

- [x] 스모크가 flaky 하지 않도록 selector와 timeout이 안정적인가?
- [x] 미설치 환경(Playwright 없음)에서 동작 모드가 명확한가?
- [x] 실패 로그가 원인 파악에 충분한가?

## Implementation Log

- [x] `scripts/post-deploy-ui-smoke.py` 추가 (Playwright 기반 desktop/mobile UI 스모크)
- [x] `scripts/post-deploy-smoke.sh`에 `RUN_UI_SMOKE`(`auto|0|1`) 옵션 연동
- [x] 모바일 sticky CTA vs Quick Action FAB 비겹침 검증 로직 포함

## Review Checklist (Implementation Review)

- [x] 실패 시 어떤 검증이 깨졌는지 즉시 확인 가능한가?
- [x] 실제 배포 URL에서 재현성 있게 동작하는가?
- [x] 스크립트 실행 시간이 과도하지 않은가?

## Verify

- [x] `python3 scripts/post-deploy-ui-smoke.py --base-url https://malsori.ancom.duckdns.org`
- [x] `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh`
