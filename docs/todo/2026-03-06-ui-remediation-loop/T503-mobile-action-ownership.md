# T503 - 모바일 Action Ownership / IA 정렬

## Spec

### 문제

- 전역 하단 액션과 page-level sticky action strip가 동시에 존재할 수 있다.
- 현재 mobile CTA owner가 route별로 명확히 정의되지 않았다.
- safe-area 여백과 CTA discoverability 요구가 같은 contract로 관리되지 않는다.

### 목표

- 모바일에서 route당 하나의 primary action owner만 동작하게 만든다.
- CTA가 잘 보이되, 내용과 겹치지 않는 구조를 문서와 코드 모두에 반영한다.

### 범위

- 포함:
  - route별 모바일 CTA ownership matrix 정의
  - `MainLayout` 전역 액션 노출 조건 정리
  - 목록/실시간/설정/상세의 mobile bottom space contract 정의
- 제외:
  - desktop header IA 전면 재설계

### 해결방안

- 전역 액션은 owner-less route fallback으로만 사용한다.
- list는 page-level sticky strip, realtime은 transport dock, settings/detail은 페이지 내부 CTA 또는 none으로 고정한다.
- bottom padding은 route owner의 높이를 기준으로 계산하거나, owner가 자체 inset contract를 갖도록 정리한다.

### 상세 설계

- `MainLayout`은 현재 route metadata를 보고 `floatingActionsVisible` 기본값을 결정한다.
- list empty state의 CTA는 모바일 primary owner로 명시하고, 동일 시점의 전역 액션은 숨긴다.
- realtime route는 idle 상태 포함 전 구간에서 전역 업로드 바를 끄고 transport 영역만 남긴다.
- safe-area contract는 `env(safe-area-inset-bottom)`을 포함한 route별 bottom padding token으로 정리한다.

### 수용 기준 (AC)

- [ ] 작은 화면에서 CTA owner가 중복 노출되지 않음
- [ ] `/`, `/realtime`, `/settings`, `/transcriptions/:id` 각 route의 모바일 bottom spacing 규칙이 문서화됨
- [ ] primary CTA는 첫 화면에서 발견 가능하고, 폼/목록/도크와 겹치지 않음

## Plan (Review 대상)

1. route별 CTA owner matrix를 확정한다.
2. 전역 action bar의 노출 정책을 route-aware 방식으로 바꾼다.
3. 각 route의 bottom spacing token과 safe-area 규칙을 정리한다.
4. 모바일 스모크/스크린샷 기준을 문서화한다.

## Review Checklist (Plan Review)

- [x] global bar를 전면 삭제하지 않고 fallback owner 개념으로 제한했는가?
- [x] realtime transport dock와 전역 업로드 CTA 충돌을 구조적으로 제거하는가?
- [x] mobile first-run discoverability와 safe-area 요구를 동시에 충족하는가?

## Self Review (Spec/Plan)

- [x] 문제를 단순 CSS 겹침이 아니라 ownership contract 부재로 정의했다.
- [x] route별 책임이 명확하다.
- [x] 후속 디자인 작업이 이 contract 위에서 일관되게 진행될 수 있다.

## Implementation Log

- [ ] CTA owner matrix 문서화
- [ ] `MainLayout` 노출 정책 수정
- [ ] list/realtime route별 bottom spacing 정리
- [ ] 모바일 스모크 기준 업데이트

## Review Checklist (Implementation Review)

- [ ] route 전환 시 CTA owner가 깜빡이거나 중복되는 프레임이 없는지 확인
- [ ] safe-area와 키보드 오픈 상태에서 CTA가 입력 필드를 가리지 않는지 확인
- [ ] desktop 동작이 의도치 않게 바뀌지 않았는지 확인

## Verify

- [ ] 모바일 viewport manual smoke (`/`, `/realtime`, `/settings`, `/transcriptions/:id`)
- [ ] bottom overlap 스크린샷 비교 기록
- [ ] `RUN_UI_SMOKE=1 ./scripts/post-deploy-smoke.sh` 필요 시 재실행
