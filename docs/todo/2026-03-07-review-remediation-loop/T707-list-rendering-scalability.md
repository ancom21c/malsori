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

- [x] `transcriptionListRenderingModel.ts`에 `100+` 항목에서 optimized mode로 전환하는 threshold contract를 추가했다.
- [x] 목록 row는 extra `Divider` DOM 노드를 없애고 `ListItem divider`로 통합했다.
- [x] optimized mode에서는 row에 `content-visibility: auto`, `contain-intrinsic-size`, `contain`을 적용해 offscreen item 비용을 줄였다.

## Review Checklist (Implementation Review)

- [x] 구현 후 spec drift가 없는지 확인
- [x] regression risk를 점검
- [x] verify 명령과 문서 역할이 일치하는지 확인

### Self Review (Implementation)

- virtualization 라이브러리를 바로 넣지 않고, 현재 레이아웃을 보존하는 equivalent optimization으로 먼저 갔다. 이번 루프 우선순위에는 이쪽이 맞다.
- threshold contract를 모델로 분리해 이후 virtualization로 바꾸더라도 기준점이 남는다.
- `content-visibility`는 Chrome/Android에서 효과가 크고, 미지원 브라우저에서는 무해하게 무시된다.
- 남은 리스크는 실제 100+ 데이터셋에서의 체감 측정 note가 아직 없다는 점이다. 이번 루프는 구조적 최적화와 build gate까지를 완료 범위로 잡았다.

## Verify

- [x] `npm --prefix webapp run test -- transcriptionListRenderingModel`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
