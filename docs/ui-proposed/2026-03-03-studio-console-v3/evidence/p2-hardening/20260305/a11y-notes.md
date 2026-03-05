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

- 배포 반영 후 운영 URL에서 스크린리더 rotor(main/heading)와 첫 Tab skip-link 동작을 재점검한다.

