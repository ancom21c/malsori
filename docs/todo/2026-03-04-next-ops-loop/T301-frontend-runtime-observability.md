# T301 - 프론트 런타임 오류 관측성 강화

## Spec

### 문제

- 배포 후 JS 런타임 오류(예: blank screen)가 API 스모크만으로는 탐지되지 않는다.
- 사용자 제보 전까지 장애 인지가 지연될 수 있다.

### 목표

- 프론트 런타임 오류를 빠르게 탐지할 수 있는 관측 체계를 마련한다.

### 범위

- 포함: 브라우저 런타임 에러 수집/보고 전략, 운영 알람 연계 지점 정의
- 제외: 상용 외부 SaaS(Sentry 등) 도입 강제

### 해결방안

- 공통 런타임 오류 훅(`window.onerror`, `unhandledrejection`) 설계
- 배포 스모크와 결합 가능한 오류 시그널 경로 정의
- 최소 운영 대시보드/로그 쿼리 방식 문서화

### 수용 기준 (AC)

- [x] 런타임 에러가 배포 당일에 자동 탐지된다.
- [x] 장애 발생 시 최소한의 재현 정보(URL, message, stack 일부)를 확보한다.
- [x] 운영 문서에 확인 절차가 명확히 정리된다.

## Plan (Review 대상)

1. 현재 오류 수집 가능 지점(브라우저/서버 로그/스모크)을 정리한다.
2. 최소 구현(로컬 로깅 or API 수집)과 운영 비용을 비교해 선택한다.
3. 기존 스모크와 충돌 없이 도입 가능한 경량 설계를 확정한다.

## Review Checklist (Plan Review)

- [x] 개인정보/민감정보가 로그에 남지 않는가?
- [x] 네트워크 장애 시 본 기능이 앱 UX를 악화시키지 않는가?
- [x] 롤백이 쉬운가?

## Implementation Log

- [x] `webapp/src/services/observability/runtimeErrorReporter.ts` 추가:
  - `window.error`, `window.unhandledrejection`를 수집
  - 중복 시그니처 dedupe
  - `navigator.sendBeacon` 우선, 실패 시 `fetch(..., keepalive)` fallback
  - `/v1/observability/runtime-error`로 최소/트렁케이트된 payload 전송
- [x] `webapp/src/main.tsx`에서 리포터 초기화 연결
- [x] `python_api/api_server/models.py`, `python_api/api_server/main.py`에 수집 API 추가:
  - `POST /v1/observability/runtime-error` (`202 Accepted`)
  - 운영 triage 용 로그 필드(event_id/kind/route/page_url/message/stack 일부) 남김
- [x] 단위 테스트 추가: `webapp/src/services/observability/runtimeErrorReporter.test.ts`

## Review Checklist (Implementation Review)

- [x] 런타임 에러가 실제로 수집/표시되는가?
- [x] 정상 흐름 성능 저하가 없는가?
- [x] 보안 리스크(토큰/본문 유출)가 없는가?

## Verify

- [x] 자동 테스트/스모크 시나리오 추가
  - `npm --prefix webapp run test -- runtimeErrorReporter`
  - `npm --prefix webapp run lint`
  - `npm --prefix webapp run build`
  - `python3 -m compileall python_api/api_server`
- [x] 운영 문서 업데이트
  - `README.md`에 `/v1/observability/runtime-error` 운영 목적/노출 정책 반영
