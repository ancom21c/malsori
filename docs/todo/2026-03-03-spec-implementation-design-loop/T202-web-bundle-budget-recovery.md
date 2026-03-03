# T202 - 웹 번들 예산 회복 및 CI 게이트 복구

## Spec

### 문제

- 현재 `npm --prefix webapp run bundle:check`가 실패한다.
- 초과 항목은 `vendor-mui-core` chunk이며, CI 필수 게이트가 깨진 상태다.

### 목표

- 번들 예산 기준을 만족시켜 CI를 green 상태로 복구한다.
- 기능 회귀 없이 초기 로딩 부담을 낮춘다.

### 범위

- 포함:
  - webapp 번들 분할 구조 점검 및 chunk 크기 최적화
  - route/feature 단위 lazy-loading 강화
  - 필요 시 Vite chunk 분할 전략(rollup options) 조정
  - bundle budget 재검증
- 제외:
  - 디자인 전면 개편
  - 기능 축소를 위한 대규모 의존성 제거

### 해결방안

- 초기 경로에서 불필요한 MUI 컴포넌트/아이콘 로딩을 지연한다.
- Settings/Realtime에서만 쓰는 무거운 UI 블록을 서브컴포넌트 lazy import로 분리한다.
- `manualChunks`를 사용해 과대 단일 vendor chunk를 안정적으로 분산한다.
- 예산값 상향은 최후 수단으로 두고, 우선 코드 분할로 해결한다.

### 수용 기준 (AC)

- [x] `npm --prefix webapp run build` 성공
- [x] `npm --prefix webapp run bundle:check` 성공
- [ ] CI webapp job에서 build + bundle:check + test가 모두 통과

## Plan (Review 대상)

1. 현재 dist chunk 그래프와 import 경로에서 과대 chunk 원인을 식별
2. 공통 레이아웃/상세 페이지의 무거운 import를 지연 가능한 단위로 분리
3. Vite splitChunks/manualChunks 보조 설정 적용
4. 번들 리포트 비교(전/후) 및 임계치 충족 확인
5. 성능 회귀(라우트 전환, 최초 렌더) 수동 확인

## Review Checklist (Plan Review)

- [x] 임계치 통과를 위해 사용자 기능을 제거하지 않는가?
- [x] 과도한 chunk 분할로 네트워크 요청 수가 급증하지 않는가?
- [x] 로컬/CI에서 일관되게 재현 가능한가?

## Implementation Log

- [x] `webapp/vite.config.ts` chunk 분할 전략 보강 (`vendor-mui-core` + `vendor-emotion` 분리)
- [x] `webapp/scripts/check-bundle-budget.mjs` 기준을 변경하지 않고 통과 확인
- [x] 번들 결과 문서 갱신 (`docs/perf-webapp-bundle-2026-03-03.md`)

## Review Checklist (Implementation Review)

- [x] 최종 chunk 크기가 budget 이내인지 확인했는가?
- [x] 코드 스플릿 이후 런타임 에러/404 chunk 이슈가 없는가?
- [x] 테스트/린트/빌드 전체 통과를 확인했는가?

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run test`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
