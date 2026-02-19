# T104 - i18n 누락 키 차단 및 회귀 방지

## Spec

### 문제

- 일부 화면에서 번역 키 누락으로 raw key 문자열이 UI에 노출된다.
- 누락 키를 사전에 탐지하는 자동 검증이 없어 회귀 가능성이 높다.

### 목표

- 현재 누락 키를 전부 보완하고, 빌드/CI 단계에서 누락 키를 차단한다.

### 범위

- 포함:
  - 누락 키 추가(ko/en/ja)
  - 키 사용처와 번역 맵 정합성 점검 스크립트
  - CI 게이트 반영
- 제외:
  - i18n 시스템 전면 교체
  - 문구 카피라이팅 대규모 리라이팅

### 해결방안

- 누락 키 즉시 보완:
  - `automaticCopyFailedPleaseCopyManually`
  - `edit`
  - `raw`
  - `stopping`
  - `wordLevelDetails`
- 정적 검사 추가:
  - `t()/tStatic()` 사용 키를 추출해 `translations.ts` 존재 여부 검증
  - 허용 예외 목록은 최소화
- 품질 게이트:
  - `npm --prefix webapp run i18n:check`를 CI 필수 단계로 추가
  - 실패 시 누락 키 목록 출력

### 수용 기준 (AC)

- [x] 알려진 누락 키가 ko/en/ja 모두 채워진다.
- [x] UI에서 raw key 문자열이 노출되지 않는다.
- [x] CI에서 누락 키가 발견되면 머지/배포가 차단된다.

## Plan (Review 대상)

1. 누락 키 목록과 실제 사용 위치 확정
2. 번역 키 검사 스크립트 구현(`scripts/check-i18n-keys.mjs` 등)
3. webapp npm script 및 CI job 연결
4. 핵심 페이지 수동 스모크로 문자열 노출 여부 확인

## Review Checklist (Plan Review)

- [x] 동적 키 패턴으로 인한 false positive를 제어하는가?
- [x] 검사 시간이 과도하게 길지 않은가?
- [x] 신규 키 추가 플로우(개발자 가이드)가 문서화됐는가?

## Implementation Log

- [x] 번역 키 추가
  - 누락 5개 키 추가: `automaticCopyFailedPleaseCopyManually`, `edit`, `raw`, `stopping`, `wordLevelDetails`
  - 추가 운영 키: `unknownErrorTryAgain`, `backendAdminDisabled`, `backendAdminUnauthorized`, `backendAdminMisconfigured`, `streamAckTimeoutTryAgain` 등
- [x] i18n 정합성 검사 스크립트 추가
  - `webapp/scripts/check-i18n-keys.mjs`
  - `t()/tStatic()` 리터럴 키와 `translations.ts` 정의 키를 비교해 누락 시 실패
- [x] CI/문서 반영
  - `webapp/package.json`: `i18n:check` 스크립트 추가
  - `.github/workflows/ci.yml`: webapp job에 `npm run i18n:check` 추가
  - `README.md`: i18n check 스크립트 실행 안내 추가

## Review Checklist (Implementation Review)

- [x] 세 언어 모두 키가 동기화되어 있는가?
- [x] 키 누락 시 에러 메시지가 충분히 구체적인가?
- [x] 번들/런타임 성능에 유의미한 부하가 없는가?

## Verify

- `npm --prefix webapp run i18n:check`
- `npm --prefix webapp test`
- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- 수동 확인: 리스트/설정/실시간 페이지 문자열 점검
