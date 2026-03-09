# Accessibility Keyboard QA Checklist (2026-03-03)

## Scope

- `webapp/src/layouts/MainLayout.tsx`
- `webapp/src/pages/TranscriptionListPage.tsx`
- `webapp/src/pages/SettingsPage.tsx`
- `webapp/src/pages/RealtimeSessionPage.tsx`
- `webapp/src/pages/TranscriptionDetailPage.tsx`
- `webapp/src/components/studio/StudioPageShell.tsx`
- `webapp/src/components/TranscriptionView.tsx`
- `webapp/src/components/SegmentWaveformTimeline.tsx`

## Keyboard Scenarios

1. Global skip-link
   - 첫 Tab 입력 시 `본문으로 바로 이동(Skip to main content)` 링크가 노출되는지 확인
   - Enter 입력 시 포커스가 `#main-content` landmark로 이동하는지 확인
2. Page landmark + heading
   - `/`, `/settings`, `/realtime`, `/transcriptions/:id` 진입 시 각 라우트에 `h1`이 1개인지 확인
   - 동일 라우트에서 `main` landmark가 1개인지 확인
3. `TranscriptionView` segment text block
   - Tab으로 세그먼트 버튼 포커스 이동
   - Enter/Space로 세그먼트 선택
   - 포커스 링이 명확히 보이는지 확인
4. `SegmentWaveformTimeline` main region
   - Tab 포커스 후 `ArrowLeft/ArrowRight`, `Home/End`로 seek 이동 확인
5. `SegmentWaveformTimeline` segment markers
   - Tab으로 각 marker 포커스 이동
   - Enter/Space로 활성 세그먼트 전환
   - `aria-pressed` 상태 반영 확인

## Screen Reader Spot-check

- landmark rotor(또는 landmarks list)에서 `main`이 인식되는지 확인
- heading rotor(또는 headings list)에서 라우트별 `h1`이 읽히는지 확인
- 타임라인 marker 버튼이 시간 범위를 읽는지 확인
- 세그먼트 텍스트 버튼이 문장 내용을 읽고, 버튼으로 인식되는지 확인
