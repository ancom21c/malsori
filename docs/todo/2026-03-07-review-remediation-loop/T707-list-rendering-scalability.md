# T707 - List Rendering Scalability

## Spec

### 문제

- history list는 전체 item을 animation과 함께 한 번에 렌더한다.
- record 수가 많아질수록 스크롤/필터 interaction 비용이 커질 수 있다.

### 목표

- large history에서도 interaction cost를 예측 가능하게 유지한다.

### 범위

- 포함:
  - large-list rendering 전략 도입
  - animation threshold 정리
  - perf note 또는 verify 기준 추가
- 제외:
  - backend pagination

### 해결방안

- 우선 권장안은 virtualization이다.
- virtualization 도입이 과하면 threshold 기반으로 `content-visibility` + animation disable을 임시 전략으로 둔다.
- large list에서 `AnimatePresence` layout animation은 축소 또는 비활성화한다.

### 상세 설계

- 기준 예시:
  - `0~50`: 현행 interaction 유지 가능
  - `51~100`: layout animation off
  - `100+`: virtualization 또는 equivalent optimization on
- semantic list/a11y는 유지한다.

### 수용 기준 (AC)

- [ ] large history에서 스크롤/필터가 눈에 띄게 버벅이지 않음
- [ ] item count threshold에 따라 rendering 전략이 바뀜
- [ ] a11y/keyboard semantics 유지

## Plan (Review 대상)

1. 현재 list render path와 animation cost를 정리한다.
2. threshold-based optimization과 virtualization 중 구현비를 비교한다.
3. 우선순위가 맞는 최소 전략부터 적용한다.
4. perf verify note를 남긴다.

## Review Checklist (Plan Review)

- [x] perf 문제를 느낌이 아니라 threshold contract로 정의했는가?
- [x] virtualization이 과한 경우 fallback 전략을 두었는가?
- [x] UX/a11y regression 위험을 따로 점검하는가?

## Self Review (Spec/Plan)

- [x] 현재 filter URL state task(T706)와 잘 이어진다.
- [x] large history 사용자를 위한 실질적 개선이다.
- [x] 디자인보다 작업성 우선이라는 현재 방향과 맞는다.

## Implementation Log

- [ ] 구현 전

## Review Checklist (Implementation Review)

- [ ] 구현 후 spec drift가 없는지 확인
- [ ] regression risk를 점검
- [ ] verify 명령과 문서 역할이 일치하는지 확인

## Verify

- [ ] 구현 후 검증 명령 기록
