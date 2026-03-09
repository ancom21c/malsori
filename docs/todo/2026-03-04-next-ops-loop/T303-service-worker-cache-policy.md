# T303 - 서비스워커/캐시 정책 문서화 및 검증

## Spec

### 문제

- 서비스워커 캐시 잔존으로 최신 배포 반영 지연 가능성이 있다.
- 운영자가 캐시 관련 이슈를 대응하는 표준 절차가 약하다.

### 목표

- 서비스워커/정적자산 캐시 정책과 장애 대응 절차를 문서화하고, 최소 검증 체크를 마련한다.

### 범위

- 포함: 캐시 무효화 정책, 강력 새로고침/데이터 초기화 가이드, 검증 체크리스트
- 제외: PWA 아키텍처 전면 교체

### 해결방안

- 현재 `registerServiceWorker` 동작과 캐시 전략을 정리
- 릴리즈 체크리스트에 캐시 검증 항목 추가
- FAQ/README에 사용자 대응 문구 정리

### 수용 기준 (AC)

- [x] 운영 문서에서 캐시 이슈 대응 절차를 1페이지 내로 확인 가능하다.
- [x] 릴리즈 시 캐시 검증 항목이 체크리스트에 포함된다.
- [x] 사용자 안내 문구가 일관된다.

## Plan (Review 대상)

1. 서비스워커 등록/업데이트 흐름을 코드 기준으로 정리한다.
2. 문서와 체크리스트 반영 범위를 확정한다.
3. 릴리즈 운영 문서와 README를 동기화한다.

## Review Checklist (Plan Review)

- [x] 실제 구현과 문서가 불일치하지 않는가?
- [x] 운영자가 바로 실행 가능한 수준으로 구체적인가?
- [x] 사용자 메시지가 과도하게 기술적이지 않은가?

## Implementation Log

- [x] 운영 문서 추가: `docs/ops-service-worker-cache-playbook.md`
  - 현재 SW 캐시 정책(등록/활성화/캐시전략) 요약
  - 릴리즈 체크리스트 + 장애 대응 절차 + 사용자 안내 문구 템플릿 정리
- [x] `scripts/post-deploy-smoke.sh`에 cache/service-worker 계약 검증 블록 추가
  - `/service-worker.js` 빌드 placeholder 미잔존 확인
  - `/manifest.webmanifest` 해시 쿼리(`?v=`) 적용 확인
  - `/config/malsori-config.js` 런타임 계약(`__MALSORI_CONFIG__`) 확인
- [x] `README.md` 문서/스크립트 설명 최신화

## Review Checklist (Implementation Review)

- [x] 문서만 보고도 재현/대응이 가능한가?
- [x] 캐시 관련 false alarm을 줄일 수 있는가?

## Verify

- [x] 관련 문서 링크 점검
  - `README.md` -> `docs/ops-service-worker-cache-playbook.md`
- [x] 배포 후 캐시 업데이트 수동 점검
  - `curl -fsSL https://malsori.ancom.duckdns.org/service-worker.js | rg -n "malsori-app-cache-|SKIP_WAITING"`
  - `curl -fsSL https://malsori.ancom.duckdns.org/manifest.webmanifest | rg -n "\\?v="`
  - `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh`
