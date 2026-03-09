# T002 - 배포 후 스모크 자동화

## Spec

### 문제

- 현재 배포 확인이 수동 커맨드 중심이다.
- 핵심 사용자 흐름(UI 접속/기본 라우팅/설정 접근)이 자동으로 보장되지 않는다.

### 목표

- 배포 직후 실행 가능한 스모크 자동화 스크립트를 추가해 "배포 성공"을 기능 관점으로 검증한다.

### 범위

- 포함:
  - SPA 라우팅 스모크(HTML root 확인, curl 기반)
  - 핵심 API 스모크(curl 기반 계약 검증)
  - 실패 시 단계별 로그 출력
- 제외:
  - Playwright/E2E 브라우저 자동화
  - 스크린샷 아티팩트 수집

### 수용 기준 (AC)

- [x] 배포 후 단일 커맨드로 스모크를 실행할 수 있다.
- [x] 실패 시 어떤 단계가 실패했는지 즉시 알 수 있다.
- [x] 스모크 결과를 릴리즈 검증 로그로 남길 수 있다.

## Plan (Review 대상)

1. 스모크 시나리오 정의 (API 계약 + SPA 3개 경로)
2. 스크립트 위치 확정 (`scripts/` 또는 `webapp` npm script)
3. `curl` + 계약 검증(JSON assert) 기반 체크 구현
4. 배포 스킬 후속 단계로 연동 가능한 실행 방법 문서화

## Review Checklist (Plan Review)

- [x] 스모크가 flaky 하지 않도록 대기/재시도 정책이 있는가?
- [x] 인증이 필요한 흐름은 제외/모킹 기준이 명확한가?
- [x] 실패 아티팩트 저장 경로가 명확한가?

## Implementation Log

- [x] 시나리오 확정
  - SPA 경로 `/`, `/settings`, `/realtime`
  - API 경로 `/v1/health`, `/v1/cloud/google/status`, `/v1/backend/endpoint`, `/v1/backend/state`
- [x] 스크립트 구현
  - `scripts/post-deploy-smoke.sh` 추가 및 실행 권한 부여
  - rollout/resource snapshot + HTML root 확인 + JSON 계약 assert 포함 (브라우저 자동화 미포함)
- [x] CI/로컬 실행 검증
  - `bash -n scripts/post-deploy-smoke.sh`
  - `./scripts/post-deploy-smoke.sh` 실배포 환경에서 pass

## Review Checklist (Implementation Review)

- [x] 정상/실패 케이스 모두에서 로그가 충분한가?
- [x] 배포 시간을 과도하게 늘리지 않는가?
- [x] 문서의 실행 예시가 최신인가?

## Verify

- `./scripts/post-deploy-smoke.sh`
- 출력: `Smoke checks passed for https://malsori.ancom.duckdns.org`
- 포함 검증: rollout, SPA 3개 경로, API 4개 계약 endpoint
