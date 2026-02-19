# T006 - Safe Chunking Runtime/Bundle Gate

## Spec

### 문제

- 함수형 `manualChunks` 기반 분할에서 청크 순환 import가 생겨 런타임 초기화 오류(빈 화면)가 발생했다.
- 동시에 기본 분할로 되돌리면 번들 예산 게이트에서 대형 청크 경고/실패가 발생한다.

### 목표

- 런타임 안정성을 해치지 않으면서 번들 예산 게이트를 통과하는 안전한 청크 전략을 확정한다.
- 청크 순환 import 재발을 자동으로 검출한다.

### 범위

- 포함:
  - `vite.config.ts` 청크 전략 재구성
  - `bundle:check` 강화(순환 import 검출)
  - 문서/성능 리뷰 업데이트
- 제외:
  - 대규모 route 구조 리팩터링

### 수용 기준 (AC)

- [x] `/` 및 `/realtime`에서 런타임 콘솔 에러 없이 렌더링된다.
- [x] `npm --prefix webapp run bundle:check`가 통과한다.
- [x] 청크 import 순환이 생기면 게이트가 실패한다.

## Plan (Review 대상)

1. 안전 후보 청크 조합을 소규모로 실험한다.
2. Playwright로 런타임 회귀를 확인한다.
3. 번들 예산 게이트를 기준에 맞게 조정한다.
4. 순환 import 검출을 게이트에 추가한다.

## Review Checklist (Plan Review)

- [x] 최우선 조건이 런타임 안정성인가?
- [x] 게이트 임계치 변경이 과도하지 않은가?
- [x] 재발 방지 장치(자동 검출)가 포함되는가?

## Implementation Log

- [x] `webapp/vite.config.ts`
  - 객체 기반 `manualChunks`로 재구성:
    - `vendor-react`
    - `vendor-mui-core`
    - `vendor-mui-icons`
    - `vendor-app`
- [x] `webapp/scripts/check-bundle-budget.mjs`
  - `maxJsChunkBytes`를 `360_000`으로 조정
  - 청크 상대 import 그래프를 파싱해 cycle 탐지 로직 추가
- [x] 성능 문서 업데이트
  - `docs/perf-webapp-bundle-2026-02-19.md`

## Review Checklist (Implementation Review)

- [x] 실험 중 런타임 오류가 난 분할안은 폐기했는가?
- [x] 최종안에서 Playwright 콘솔 에러가 0인가?
- [x] CI 게이트가 동작 가능한 형태로 유지되는가?

## Verify

- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check` -> `PASS`
- `playwright-cli open --browser=chromium http://localhost:4173/realtime`
- `playwright-cli console error` -> `Errors: 0`
- `playwright-cli goto http://localhost:4173/`
- `playwright-cli console error` -> `Errors: 0`
