# T103 - 배포 스모크 스펙-구현 정렬

## Spec

### 문제

- 스펙은 UI 브라우저 스모크/아티팩트를 요구했지만, 운영 결정은 curl 기반 계약 스모크 유지로 확정되었다.
- TLS 검증 우회(`-k`)가 기본이면 운영 실패를 놓칠 수 있다.

### 목표

- 스모크 스펙과 실제 자동화 동작을 일치시켜 배포 성공 판정 신뢰도를 높인다.

### 범위

- 포함:
  - API + SPA 라우팅(curl) 스모크 실행 구조 정렬
  - 실패 로그 가독성 개선
  - 재시도 정책/타임아웃 표준화
  - TLS 검증 정책 명시(기본 strict)
- 제외:
  - Playwright/E2E 브라우저 자동화
  - 스크린샷 아티팩트 수집

### 해결방안

- 스모크 범위를 문서/스크립트 모두 curl 기반으로 통일:
  - rollout + SPA 3개 경로 HTML root 확인 + API 계약 검증
- TLS 정책:
  - 기본 strict TLS
  - `ALLOW_INSECURE_TLS=1`일 때만 `-k` 허용
- 관리자 endpoint 정책 정렬:
  - admin off: `/v1/backend/*`는 `404`
  - admin on: 토큰 미제공 `401`, 제공 시 `200`

### 수용 기준 (AC)

- [x] 단일 커맨드로 스모크가 수행된다.
- [x] 실패 시 단계/엔드포인트 원인 추적이 가능하다.
- [x] 기본 실행에서 TLS 인증서 오류를 놓치지 않는다.

## Plan (Review 대상)

1. 기존 T002 스펙 문서를 운영 결정(curl-only)으로 정렬
2. `post-deploy-smoke.sh`의 TLS 기본 정책을 strict로 전환
3. backend admin 보호 정책과 smoke 기대값(404/401/200) 정렬
4. README/runbook 동기화

## Review Checklist (Plan Review)

- [x] 스모크 시간이 배포 파이프라인 SLA를 초과하지 않는가?
- [x] curl 기반 스모크로 flaky 리스크가 낮은가?
- [x] 인증 필요한 흐름은 의도적으로 범위에서 제외했는가?

## Implementation Log

- [x] 스크립트 동작 정렬
  - `scripts/post-deploy-smoke.sh`: strict TLS 기본값 + `ALLOW_INSECURE_TLS=1` 예외
  - backend admin off/on 기대값 분기 검증 반영
- [x] 문서 정렬
  - `docs/todo/2026-02-19-execution-loop/T002-post-deploy-smoke.md`: curl-only 범위로 축소
  - `README.md`: smoke 명령 설명 최신화
- [x] 운영 실행 경로 유지
  - 기존 단일 커맨드(`./scripts/post-deploy-smoke.sh`) 유지

## Review Checklist (Implementation Review)

- [x] 실패 단계가 로그에서 즉시 구분되는가?
- [x] TLS strict 기본값이 실제로 적용되는가?
- [x] 로컬/CI 환경 모두에서 재현 가능하게 동작하는가?

## Verify

- `bash -n scripts/post-deploy-smoke.sh`
- `./scripts/post-deploy-smoke.sh`
- `ALLOW_INSECURE_TLS=1 ./scripts/post-deploy-smoke.sh` (개발 환경 예외 확인)
