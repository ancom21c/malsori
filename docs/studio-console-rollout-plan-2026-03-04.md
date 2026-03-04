# Studio Console Rollout Plan (2026-03-04)

## Goal

`/`, `/realtime`, `/settings`, `/transcriptions/:id`까지 Studio Console 시각 언어를 확장하되, 기능 동선/접근성/성능 회귀 없이 단계적으로 배포한다.

## Execution Status

- 2026-03-04: `S1 (Realtime)` 1차 반영 완료
  - 파일: `webapp/src/pages/RealtimeSessionPage.tsx`
  - 변경: 상태/지연/복구 액션을 상단 HUD로 재정렬, 하단 컨트롤을 primary(main+stop)/secondary(camera) 도크로 분리
  - 검증: `npm --prefix webapp run lint`, `npm --prefix webapp run build`

## Rollout Stages

| Stage | Target | Scope | DoD |
|---|---|---|---|
| S1 | Realtime | HUD/상태/주요 액션 hierarchy 정리 | 연결 상태와 액션 우선순위가 3초 내 파악 가능, 기존 녹음/종료/복구 동작 무회귀 |
| S2 | Settings | 정보구조 계층화(운영/권한/설정 블록) | 관리자/일반 사용자 구분 맥락이 즉시 보이고 JSON 편집 동선 유지 |
| S3 | Detail | 결과 분석/오디오 패널 시각 통일 | 세그먼트 탐색/재생/다운로드 동선 유지, 스캔 가독성 향상 |

## Shared System

Reuse baseline tokens and patterns from:

- `docs/plan-studio-console-v3.md`
- `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-desktop.svg`
- `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-mobile.svg`

Shared components to normalize first:

1. `StudioPageShell` (Tier-1 header + Tier-2 content zoning)
2. `StatusChipSet` (stable/warning/error semantic palette)
3. `ActionStrip` (desktop button group + mobile sticky CTA)
4. `ContextCard` (운영 가이드/권한 안내/에러 복구 안내)

## Regression Checklist Per Stage

1. Functional
   - route-level smoke: `/`, `/settings`, `/realtime`
   - primary CTA discoverability (first screen without scroll)
   - 기존 API 호출 파라미터/폼 값 무회귀
2. Accessibility
   - keyboard tab order + visible focus
   - landmark/heading 구조 유지
   - color contrast AA 유지
3. Performance
   - `npm --prefix webapp run build` 산출물에서 메인 번들 급증 없음
   - 초기 렌더에서 layout shift 급증 없음(기존 대비 체감 증가 금지)
4. Mobile
   - sticky CTA와 FAB 겹침 없음
   - safe-area(inset) 고려한 하단 여백 유지

## Rollback Strategy

1. 변경은 화면 단위 커밋으로 분리한다 (`S1`, `S2`, `S3`).
2. 각 단계 배포 후 `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh`를 통과해야 다음 단계로 진행한다.
3. 회귀 발생 시 해당 단계 커밋만 revert 가능하도록 공통 토큰 변경과 화면별 변경을 분리한다.

## Evidence Plan

For each stage, preserve:

1. desktop/mobile before-after screenshots
2. smoke output log (API + UI)
3. a11y quick check notes (focus order + contrast)
