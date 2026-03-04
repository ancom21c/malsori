# T407 - 모바일 배경 렌더링 비용 최적화

## Spec

### 문제

- 전역 배경이 다중 gradient + 격자 패턴 + `background-attachment: fixed` 조합으로 구성되어 저사양 모바일에서 페인트 비용이 커질 수 있다.
- 스크롤 체감 저하가 UX 신뢰도를 떨어뜨릴 수 있다.

### 목표

- 모바일 환경에서 시각 컨셉은 유지하되 렌더링 비용을 낮춘다.

### 범위

- 포함:
  - 모바일 전용 배경 단순화 fallback
  - `prefers-reduced-motion`/성능 우선 환경 대응
  - 최소 성능 측정 기준 문서화
- 제외:
  - 전체 테마 리디자인

### 해결방안

- `index.css`에 모바일 브레이크포인트 fallback 배경을 추가한다.
- `background-attachment: fixed`는 모바일에서 비활성화한다.
- 시각 아이덴티티는 색조/톤만 유지하고 패턴 밀도는 축소한다.

### 수용 기준 (AC)

- [ ] 모바일에서 스크롤 시 페인트 부담을 줄인 fallback 배경이 적용된다.
- [ ] 데스크톱 비주얼 톤은 기존 콘셉트를 유지한다.
- [ ] 시각 회귀 없이 성능 체감이 개선된다.

## Plan (Review 대상)

1. 모바일 대상 fallback 배경 스펙을 정한다.
2. CSS 분기(브레이크포인트/미디어쿼리)를 추가한다.
3. 실제 모바일 장치 또는 에뮬레이터에서 체감 확인한다.
4. 운영 가이드에 성능 점검 항목을 추가한다.

## Review Checklist (Plan Review)

- [ ] 브랜딩 톤이 과도하게 훼손되지 않는가?
- [ ] 특정 브라우저에서 CSS 호환 이슈가 없는가?
- [ ] 접근성 대비(텍스트 가독성)가 유지되는가?

## Implementation Log

- [ ] `webapp/src/index.css` 모바일 fallback 배경 적용
- [ ] 필요 시 theme surface 대비값 미세 조정
- [ ] 성능 점검 문서 업데이트

## Review Checklist (Implementation Review)

- [ ] 모바일에서 스크롤/탭 전환 체감이 개선되었는가?
- [ ] 배경 단순화로 카드/텍스트 대비가 깨지지 않는가?
- [ ] 데스크톱 렌더링 회귀가 없는가?

## Verify

- [ ] 모바일 실기기 또는 Playwright mobile screenshot 비교
- [ ] `npm --prefix webapp run build`
