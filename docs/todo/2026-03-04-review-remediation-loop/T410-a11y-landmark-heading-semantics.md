# T410 - 접근성 시맨틱 정합성 보강 (landmark/heading/skip-link)

## Spec

### 문제

- 주요 화면 레이아웃에 명시적 `main` landmark/skip-link/h1 체계가 약해 스크린리더 내비게이션 효율이 낮다.
- Studio Console 고도화 이후 구조가 복잡해지면서 탭 순서/포커스 이동의 예측 가능성이 떨어질 수 있다.

### 목표

- 화면 공통 레이아웃에 접근성 랜드마크와 heading 체계를 표준화해 키보드/스크린리더 사용성을 높인다.

### 범위

- 포함:
  - `MainLayout`에 skip-link + `main` landmark 도입
  - 주요 라우트(`/`, `/settings`, `/realtime`, `/transcriptions/:id`)의 페이지 제목 `h1` 정합성 확보
  - 포커스 가시성/탭 순서 점검 및 문서화
- 제외:
  - 전체 WCAG 감사 자동화 파이프라인 도입

### 해결방안

- 공통 layout에서 `#main-content` anchor와 skip-link를 제공하고, 콘텐츠 래퍼를 semantic main으로 교체한다.
- 각 페이지 상단 타이틀 typography를 시각 스타일 유지한 채 semantic heading(`component="h1"`)으로 정리한다.
- 빠른 a11y 스모크 체크리스트(키보드 탭 순서, 랜드마크 탐색)를 추가한다.

### 수용 기준 (AC)

- [ ] 키보드 첫 탭으로 skip-link 접근이 가능하고 main 영역으로 이동한다.
- [ ] 핵심 라우트마다 고유 `h1`이 1개 존재한다.
- [ ] 기본 tab 순서와 focus ring이 주요 CTA에서 일관되게 보인다.

## Plan (Review 대상)

1. 레이아웃/페이지별 현재 landmark + heading 구조를 인벤토리한다.
2. `MainLayout` 시맨틱 구조 변경(하위 화면 영향 최소화)을 설계한다.
3. 각 화면 상단 타이틀의 semantic heading 적용 지점을 확정한다.
4. 수동 a11y 점검 절차를 문서에 추가한다.

## Review Checklist (Plan Review)

- [ ] 시맨틱 변경으로 기존 스타일/레이아웃이 깨지지 않는가?
- [ ] 스크린리더 landmark 탐색에서 중복 main/h1이 발생하지 않는가?
- [ ] 모바일에서 skip-link가 시야를 가리지 않고 정상 동작하는가?

## Implementation Log

- [ ] `webapp/src/layouts/MainLayout.tsx` skip-link + `main` landmark 반영
- [ ] 핵심 페이지 `h1` semantic 정리
- [ ] 포커스 스타일/탭 순서 미세조정
- [ ] a11y 점검 노트 문서 업데이트

## Review Checklist (Implementation Review)

- [ ] 주요 브라우저(Chrome/Edge/Safari 계열)에서 skip-link 동작이 일관적인가?
- [ ] 키보드만으로 첫 액션까지 도달 시간이 개선되는가?
- [ ] Studio Console 신규 컴포넌트(T408 예정)와 충돌 여지가 없는가?

## Verify

- [ ] `npm --prefix webapp run lint && npm --prefix webapp run build`
- [ ] `npm --prefix webapp run test -- AppRouter --reporter=basic`
- [ ] 수동 점검: tab 순서/skip-link/h1 구조 체크리스트 기록

