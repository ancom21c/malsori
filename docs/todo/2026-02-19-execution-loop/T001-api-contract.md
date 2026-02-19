# T001 - 운영 API 계약 점검/정렬

## Spec

### 문제

- 운영 점검에서 `/v1/health`, `/v1/backend/state`가 `404`를 반환했다.
- 프론트/운영 점검 스크립트가 기대하는 API 계약과 실제 백엔드 계약이 불일치할 가능성이 있다.

### 목표

- 운영 환경 기준으로 "보장되는 점검 API 계약"을 명확히 정의하고 코드/문서/운영 점검 절차를 일치시킨다.

### 범위

- 포함:
  - python API 라우트 실제 노출 엔드포인트 확인
  - 프론트/운영 스모크에서 사용하는 점검 엔드포인트 정렬
  - 문서(운영 점검표) 업데이트
- 제외:
  - 인증/권한 모델 재설계
  - 주요 비즈니스 API 스펙 전면 개편

### 수용 기준 (AC)

- [ ] 운영 점검에 사용하는 health/status endpoint가 문서와 구현에서 일치한다.
- [ ] 배포 후 스모크에서 404가 아닌 계약된 응답을 확인한다.
- [ ] 관련 변경으로 프론트 설정 페이지의 상태 조회 UX가 회귀하지 않는다.

## Plan (Review 대상)

1. python API의 실제 라우트 목록/응답 스키마 확인
2. 점검 표준 endpoint를 확정 (`/v1/cloud/google/status` 외 추가 endpoint 결정)
3. 필요 시 python API에 최소 health/status endpoint 추가
4. 프론트/운영 스모크 경로를 계약된 endpoint로 교체
5. 문서와 배포 후 확인 체크리스트 동기화

## Review Checklist (Plan Review)

- [ ] endpoint 추가/변경이 기존 클라이언트를 깨지 않는가?
- [ ] 인증 필요 여부(무인증 health 허용 범위)가 명확한가?
- [ ] 장애 시 관측 가능한 정보(상태코드/메시지)가 충분한가?

## Implementation Log

- [ ] 코드 변경
- [ ] 문서 변경
- [ ] 검증 실행

## Review Checklist (Implementation Review)

- [ ] 불필요한 endpoint 노출이 없는가?
- [ ] 상태코드가 일관적인가 (200/4xx/5xx)?
- [ ] 릴리즈 노트/운영 체크리스트에 반영됐는가?

## Verify

- `kubectl -n malsori logs deployment/malsori-malsori -c python-api --tail=200`
- `curl -sk -o /tmp/health.json -w "%{http_code}\n" https://malsori.ancom.duckdns.org/<health-endpoint>`
- `curl -sk -o /tmp/status.json -w "%{http_code}\n" https://malsori.ancom.duckdns.org/<status-endpoint>`
