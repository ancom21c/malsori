# Accessibility Keyboard QA Checklist (2026-03-03)

## Scope

- `webapp/src/components/TranscriptionView.tsx`
- `webapp/src/components/SegmentWaveformTimeline.tsx`

## Keyboard Scenarios

1. `TranscriptionView` segment text block
   - Tab으로 세그먼트 버튼 포커스 이동
   - Enter/Space로 세그먼트 선택
   - 포커스 링이 명확히 보이는지 확인
2. `SegmentWaveformTimeline` main region
   - Tab 포커스 후 `ArrowLeft/ArrowRight`, `Home/End`로 seek 이동 확인
3. `SegmentWaveformTimeline` segment markers
   - Tab으로 각 marker 포커스 이동
   - Enter/Space로 활성 세그먼트 전환
   - `aria-pressed` 상태 반영 확인

## Screen Reader Spot-check

- 타임라인 marker 버튼이 시간 범위를 읽는지 확인
- 세그먼트 텍스트 버튼이 문장 내용을 읽고, 버튼으로 인식되는지 확인
