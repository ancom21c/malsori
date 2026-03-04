# T304 - Studio Console 디자인 확장 적용 계획

## Spec

### 문제

- Studio Console 방향성은 정해졌지만 일부 화면만 적용되어 시각/정보구조 일관성이 부족하다.

### 목표

- Settings/Realtime/Detail까지 디자인 시스템 토큰과 정보구조를 단계적으로 확장한다.

### 범위

- 포함: 적용 순서, 공통 컴포넌트/토큰화 계획, 위험도(접근성/성능) 검토
- 제외: 전체 화면 동시 전면 개편

### 해결방안

- 화면군별 점진 적용 순서 정의(Realtime -> Settings -> Detail)
- 공통 스타일 토큰/레이아웃 컴포넌트 식별
- 성능/접근성 회귀 체크 항목을 사전에 명시

### 수용 기준 (AC)

- [x] 단계별 적용 순서와 완료 정의(DoD)가 문서화된다.
- [x] 각 단계별 회귀 체크리스트가 준비된다.
- [x] 기존 기능 동선을 해치지 않는 롤아웃 전략이 제시된다.

## Plan (Review 대상)

1. 현재 적용된 Studio Console 요소를 인벤토리화한다.
2. 다음 적용 대상 화면과 우선순위를 확정한다.
3. UI/UX/성능/접근성 리스크를 단계별로 정리한다.

## Review Checklist (Plan Review)

- [x] 디자인 변경이 기능 discoverability를 악화시키지 않는가?
- [x] 모바일/데스크톱 동시 지원 계획이 있는가?
- [x] 번들/렌더 성능 비용을 관리 가능한가?

## Implementation Log

- [x] `docs/studio-console-rollout-plan-2026-03-04.md` 추가
  - S1(realtime) -> S2(settings) -> S3(detail) 단계 정의
  - 단계별 DoD, 회귀 체크리스트(functional/a11y/perf/mobile), 롤백 전략 명시
- [x] 기존 Studio Console 기준 문서/시안과 연결
  - `docs/plan-studio-console-v3.md`
  - `docs/ui-proposed/2026-03-03-studio-console-v3/*.svg`

## Review Checklist (Implementation Review)

- [x] 단계별 스냅샷/검증 증적이 남았는가?
- [x] 이전 테마와 공존/롤백이 가능한가?

## Verify

- [x] 디자인 스펙 문서 업데이트
  - `docs/studio-console-rollout-plan-2026-03-04.md`
- [x] 대표 화면 스크린샷/비교 자료 확보
  - `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-desktop.svg`
  - `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-mobile.svg`
