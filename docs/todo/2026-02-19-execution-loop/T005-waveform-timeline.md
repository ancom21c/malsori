# T005 - Waveform/Timeline UX

## Spec

### 문제

- 전사 상세 화면에서 오디오 구조(구간/타임라인)를 직관적으로 파악하기 어렵다.
- 특정 구간 반복 청취/정밀 스크럽 니즈를 충족하지 못한다.

### 목표

- waveform + timeline 기반 탐색 UX를 추가해 전사 검토 효율을 높인다.

### 범위

- 포함:
  - waveform 시각화
  - 타임라인 스크럽
  - 구간 선택/반복(루프 마커)
  - 전사 세그먼트 클릭 시 타임라인 동기화
- 제외:
  - 고급 오디오 편집(자르기/믹싱)
  - 서버 측 미디어 처리 파이프라인 변경

### 수용 기준 (AC)

- [x] 전사 세그먼트와 재생 위치가 양방향으로 동기화된다.
- [x] 사용자가 특정 구간을 쉽게 반복 청취할 수 있다.
- [x] 모바일에서도 기본 탐색 조작이 가능하다.

## Plan (Review 대상)

1. 기술 스택 선택(Wavesurfer 등) 및 번들 영향 평가
2. 데이터 모델(세그먼트 타이밍/루프 마커) 정의
3. 상세 페이지에 waveform 컴포넌트 통합
4. 접근성/모바일 조작성 점검
5. 성능 검증(대용량 오디오/긴 세션)

## Review Checklist (Plan Review)

- [x] 번들 사이즈 증가가 허용 범위 내인가?
- [x] 긴 오디오에서 렌더링 성능 저하를 방지하는가?
- [x] 키보드/스크린리더 접근성을 보장하는가?

## Implementation Log

- [x] 라이브러리 통합
  - 외부 waveform 라이브러리(Wavesurfer) 대신 경량 커스텀 컴포넌트로 구현해 번들 증가를 최소화
- [x] UI/상호작용 구현
  - `webapp/src/components/SegmentWaveformTimeline.tsx` 추가
  - 전사 상세/공유 뷰에서 세그먼트 선택 시 타임라인-재생 위치 동기화
  - 루프 시작/종료 마커, 활성 세그먼트 루프, 루프 토글/해제 동작 반영
- [x] 테스트 및 성능 측정
  - `npm --prefix webapp run lint`
  - `npm --prefix webapp test`
  - `npm --prefix webapp run build`
  - `npm --prefix webapp run bundle:check`

## Review Checklist (Implementation Review)

- [x] 세그먼트 클릭 -> 재생 위치 이동이 정확한가?
- [x] 루프 on/off 동작이 일관적인가?
- [x] 기존 상세 페이지 기능(재생/다운로드/공유)에 회귀가 없는가?

## Verify

- `cd webapp && npm run build`
- 수동 스모크: 긴 녹음 파일 + 다중 세그먼트 탐색
- 번들 리포트 비교(도입 전/후)
