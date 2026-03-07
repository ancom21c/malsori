# T808 - Large-list Scalability v2

## Spec

### 문제

- current optimization은 `content-visibility` 중심이라 mount/update cost를 충분히 줄이지 못한다.

### 목표

- 100+ history에서 더 구조적인 렌더링 비용 절감을 적용한다.

### 범위

- 포함:
  - windowing/incremental render/equivalent optimization 도입
  - large-list threshold contract 보강
  - 관련 test/model 정리
- 제외:
  - server pagination 도입

### 해결방안

- 작은 의존성 또는 repo-local model로 incremental rendering을 도입한다.
- threshold를 넘으면 initial visible slice + progressive expansion 또는 virtualization-equivalent 전략을 사용한다.

### 상세 설계

- default는 현재 behavior 유지.
- `100+`에서는 initial render count를 제한하고 scroll/interaction에 따라 확장한다.
- URL filter / delete / status action과 충돌하지 않도록 item identity를 유지한다.

### 수용 기준 (AC)

- [ ] large-list mode에서 full-mount를 피함
- [ ] interaction/delete/navigation behavior 유지
- [ ] threshold/model tests 갱신

## Plan (Review 대상)

1. 현재 full-map 구조를 분석한다.
2. 최소 의존성 incremental/windowed strategy를 선택한다.
3. threshold/model tests와 list page를 같이 갱신한다.

## Review Checklist (Plan Review)

- [x] UX regression 없이 mount cost를 줄이는가?
- [x] delete/download/sync action과 충돌하지 않는가?
- [x] dependency 추가가 필요하면 정당성이 충분한가?

## Self Review (Spec/Plan)

- [x] `content-visibility`보다 구조적 최적화가 필요한 문제를 정확히 겨냥했다.
- [x] full virtualization 도입 전에도 incremental rendering은 충분히 효과적일 수 있다.
- [x] task를 P2로 두어 correctness/A11y보다 뒤에 배치했다.

## Implementation Log

- [ ] pending

## Review Checklist (Implementation Review)

- [ ] initial render count가 실제로 줄었는가?
- [ ] row identity/action state가 안정적인가?
- [ ] threshold 이하의 기본 path를 깨지 않았는가?

## Verify

- [ ] `npm --prefix webapp run test -- transcriptionListRenderingModel`
- [ ] `npm --prefix webapp run build`
- [ ] `npm --prefix webapp run bundle:check`
