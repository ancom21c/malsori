# T105 - API 오류 계약/다국어 표준화

## Spec

### 문제

- frontend가 backend raw 에러 텍스트를 직접 노출해 언어 혼재/UX 불일치가 발생한다.
- 오류 응답 포맷이 endpoint마다 달라 사용자 메시지 정책이 일관되지 않다.

### 목표

- backend-frontend 간 표준 오류 계약을 정의하고, UI는 오류 코드 기반으로 다국어 메시지를 노출한다.

### 범위

- 포함:
  - backend 오류 응답 포맷 표준화(`code`, `message`, `details`)
  - frontend 에러 매퍼(코드 -> i18n 키) 도입
  - 운영 로그와 사용자 메시지 분리
- 제외:
  - 모든 레거시 endpoint의 동시 전면 개편(단계적 전환)

### 해결방안

- 오류 계약 표준:
  - 예시: `{ "error": { "code": "BACKEND_UNREACHABLE", "details": { ... } } }`
  - `message`는 사용자 노출용이 아닌 내부 디버깅용으로 제한 또는 제거
- frontend 처리 규칙:
  - `code` 기준으로 번역 키 매핑
  - 알 수 없는 코드는 공통 fallback(`unknownErrorTryAgain`) 사용
  - raw 텍스트 직접 노출 금지
- 전환 전략:
  - 영향 큰 API부터 점진 적용
  - 호환 기간 동안 구포맷을 정규화 어댑터로 흡수

### 수용 기준 (AC)

- [x] 주요 API 오류가 표준 포맷으로 반환된다.
- [x] UI에서 backend raw detail이 사용자에게 직접 노출되지 않는다.
- [x] ko/en/ja에서 동일 오류 코드가 일관된 의미로 표현된다.

## Plan (Review 대상)

1. 현재 오류 응답 패턴 분류(코드/메시지/상태코드)
2. 표준 오류 스키마와 공통 코드 집합 정의
3. backend 응답 정규화 + frontend 매퍼 구현
4. 기존 호출부 점진 마이그레이션
5. 문서/API 계약 업데이트

## Review Checklist (Plan Review)

- [x] 디버깅 필요 정보가 사용자 메시지 분리 이후에도 확보되는가?
- [x] 상태코드(4xx/5xx) 의미가 코드 체계와 충돌하지 않는가?
- [x] 구버전 클라이언트와의 호환성 전략이 있는가?

## Implementation Log

- [x] 오류 스키마/코드 정의
  - backend 오류 응답을 `{"detail":{"error":{"code","message","details"}}}` 형태로 표준화
  - 적용 범위: backend admin endpoint + transcribe/status + google oauth broker 주요 오류
- [x] backend/frontend 변환 계층 반영
  - `webapp/src/services/api/rtzrApiClient.ts`: `ensureOk`에서 코드 기반 파싱/매핑
  - raw body 텍스트 직접 노출 제거, 미정의 코드는 `unknownErrorTryAgain` fallback
- [x] 테스트 및 문서 업데이트
  - `webapp/src/services/api/rtzrApiClient.test.ts`: 표준 오류 코드 매핑/미정의 fallback 테스트 추가
  - 관련 i18n 키 추가

## Review Checklist (Implementation Review)

- [x] 동일 오류 상황에서 언어별 메시지가 일관적인가?
- [x] 민감정보가 사용자 오류 메시지에 노출되지 않는가?
- [x] 미정의 코드 fallback이 과도하게 발생하지 않는가?

## Verify

- `npm --prefix webapp test`
- `python3 -m compileall python_api/api_server`
- `npm --prefix webapp run i18n:check`
- `npm --prefix webapp run lint`
- 실패 시나리오 수동 테스트(백엔드 미연결/권한 오류/타임아웃)
