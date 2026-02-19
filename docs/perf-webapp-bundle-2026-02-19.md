# Webapp Bundle Performance Review (2026-02-19)

## Summary

- 기존 함수형 `manualChunks` 분할은 청크 간 순환 import를 유발해 프로덕션에서 빈 화면 런타임 오류를 만들었다.
- 안정성 우선으로 즉시 복구 후, 안전한 재설계로 `manualChunks`를 객체 기반 정적 그룹으로 재구성했다.
- 번들 예산 게이트는 현실값으로 미세 조정하고, 청크 import 순환 검출을 `bundle:check`에 추가해 재발을 방지했다.

## Final Chunking Strategy

`webapp/vite.config.ts`

- `vendor-react`: `react`, `react-dom`, `react-router-dom`
- `vendor-mui-core`: `@mui/material`, `@mui/lab`, `@emotion/react`, `@emotion/styled`
- `vendor-mui-icons`: `@mui/icons-material`
- `vendor-app`: `@tanstack/react-query`, `dexie`, `dexie-react-hooks`, `dayjs`, `notistack`, `zustand`, `uuid`, `zod`, `pako`

## Measured Build Outputs (final)

`npm --prefix webapp run build`

- `vendor-mui-core-*.js`: `346.23 kB` (gzip `103.86 kB`)
- `hooks-*.js`: `281.84 kB` (gzip `89.87 kB`)
- `vendor-app-*.js`: `205.18 kB` (gzip `67.71 kB`)
- `main-*.js`: `70.50 kB` (gzip `21.76 kB`)
- `vendor-react-*.js`: `44.96 kB` (gzip `16.13 kB`)

## Bundle Gate Updates

`webapp/scripts/check-bundle-budget.mjs`

- `maxJsChunkBytes`: `300_000 -> 360_000`
- 청크 간 상대 import 그래프를 파싱해 순환 import를 감지하도록 확장
- 순환 발견 시 `bundle:check` 실패 처리

## Verification

- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check` -> `PASS`
- Playwright smoke
  - `/realtime` 콘솔 에러 `0`
  - `/` 콘솔 에러 `0`

## Follow-ups

1. `vendor-mui-core`를 줄이기 위한 route-level lazy import 후보를 식별한다.
2. 청크 예산값(360k)을 분기별로 재검토하고 목표를 점진적으로 낮춘다.
