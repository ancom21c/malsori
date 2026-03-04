# T408 - Studio Shell 공통 컴포넌트화 + 비주얼 시스템 고도화

## Spec

### 문제

- S1/S2/S3에서 Studio Console 방향은 적용됐지만, 화면별로 유사 패턴이 페이지 내부에 분산돼 재사용성과 일관성이 낮다.
- 상태칩/헤더/액션스트립/컨텍스트 카드가 화면마다 다른 방식으로 구현돼 확장 비용이 크다.

### 목표

- Studio Console 핵심 패턴을 공통 컴포넌트로 추출해 IA/시각 언어 일관성과 구현 속도를 함께 확보한다.

### 범위

- 포함:
  - `StudioPageShell`, `StatusChipSet`, `ActionStrip`, `ContextCard` 공통화
  - `/`, `/settings`, `/realtime`, `/transcriptions/:id` 단계적 적용 설계
  - 접근성/모바일 규칙 포함
- 제외:
  - 전체 화면 동시 리디자인 강행

### 해결방안

- 공통 컴포넌트 API를 먼저 정의한 뒤, 화면별 adapter 형태로 순차 적용한다.
- variant 토큰(밀도, 강조도, sticky 동작)을 공통 props로 통합한다.
- 도입 시점마다 UI smoke + screenshot evidence를 묶어 회귀를 통제한다.

### 수용 기준 (AC)

- [ ] 4개 주요 화면에서 공통 shell 패턴이 일관된 정보 위계를 제공한다.
- [ ] 공통 컴포넌트 도입 후 페이지별 중복 UI 로직이 감소한다.
- [ ] 모바일에서 sticky CTA/FAB 충돌이 재발하지 않는다.

## Plan (Review 대상)

1. 공통 컴포넌트 인터페이스와 토큰 의존성을 확정한다.
2. 저위험 화면부터 순차 적용 순서를 정한다.
3. 각 단계별 회귀 체크리스트(기능/접근성/성능)를 수립한다.
4. 최종적으로 디자인 가이드 문서와 코드 구조를 동기화한다.

## Review Checklist (Plan Review)

- [ ] 공통화가 페이지별 특수 요구를 과도하게 제한하지 않는가?
- [ ] 컴포넌트 API가 과복잡해지지 않는가?
- [ ] 단계적 롤백이 가능한 단위로 쪼개졌는가?

## Implementation Log

- [ ] 공통 Studio shell 컴포넌트 초안 구현
- [ ] 주요 화면 순차 마이그레이션
- [ ] 디자인 가이드/문서 업데이트

## Review Checklist (Implementation Review)

- [ ] 시각/동선 일관성이 실제로 개선되었는가?
- [ ] 성능/접근성 회귀가 없는가?
- [ ] 코드 중복 감소 효과가 확인되는가?

## Verify

- [ ] `npm --prefix webapp run lint && npm --prefix webapp run build`
- [ ] `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh`
- [ ] stage별 desktop/mobile 스크린샷 비교
