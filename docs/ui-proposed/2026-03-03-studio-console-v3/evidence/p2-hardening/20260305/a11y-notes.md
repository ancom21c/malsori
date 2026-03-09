# A11y Quick Notes (2026-03-05)

## Scope

- `/`
- `/settings`
- `/realtime`
- `/transcriptions/:id`

## Checks

- Skip-link
  - `MainLayout`에서 `href="#main-content"` skip-link 추가
  - `.malsori-skip-link:focus-visible` 스타일 확인
- Landmark
  - `MainLayout` container를 `component="main"` + `id="main-content"`로 지정
- Heading
  - `/`, `/settings`: `StudioPageShell` 기본 `h1`
  - `/realtime`: `Typography component="h1"`
  - `/transcriptions/:id`: `MediaPlaybackSection headingComponent="h1"`
- Verification commands
  - `npm --prefix webapp run lint`
  - `npm --prefix webapp run build`
  - `npm --prefix webapp run test -- AppRouter --reporter=basic`

## Notes

- 배포 반영 후 Playwright spot-check 결과:
  - `/` `h1_count=1`
  - `/settings` `h1_count=1`
  - `/realtime` `h1_count=1`
  - `/transcriptions/smoke-detail-empty` `h1_count=1`
  - first tab focus: `{ tag: "A", text: "Skip to main content", href: "#main-content" }`
