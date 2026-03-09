# T506 - Dark Studio Console Visual Refinement v4 설계/적용

## Spec

### 문제

- 현재 dark Studio Console 방향은 의도는 강하지만 ornament 비중이 높아 작업 패널 가독성을 해칠 수 있다.
- form/editing 영역과 status/accent 영역의 시각 우선순위가 충분히 분리되지 않았다.
- realtime 오디오 피드백도 중복되어 화면이 과밀해질 수 있다.

### 목표

- dark Studio Console 방향을 유지하면서 더 차분하고 작업 친화적인 visual system으로 정리한다.
- 사용자가 "어디를 읽고, 어디를 눌러야 하는지"가 즉시 드러나는 UI를 만든다.

### 범위

- 포함:
  - shell/surface/status 3계층 visual token 정리
  - form/workspace 영역의 contrast/shadow/motion 절제
  - realtime/list/settings/detail에 공통으로 적용 가능한 시각 원칙 정의
  - single audio feedback component 원칙 반영
- 제외:
  - 신규 feature 추가

### 해결방안

- 배경은 분위기 레이어 1개만 유지하고, 실제 작업 패널은 더 solid한 surface로 정리한다.
- CTA와 상태 accent는 밝은 teal/peach를 쓰되 사용 면적을 줄인다.
- typography hierarchy를 강화해 title, meta, control label, code/json 영역을 확실히 구분한다.
- motion은 정보 전달에 필요한 경우만 사용하고, 대부분의 지속적 움직임은 제거한다.

### 상세 설계

- Surface tiers:
  - Tier A `Shell`: 앱 배경/상단 바, 약한 blur와 낮은 대비
  - Tier B `Work Surface`: 카드/리스트/편집기, 높은 가독성의 불투명 또는 준불투명 면
  - Tier C `Status Accent`: CTA, active state, connection status, audio meter
- Typography:
  - page title은 무게감 있게 유지하되 meta/body 대비를 더 벌린다.
  - JSON/editor 영역은 monospace와 낮은 장식으로 안정감 우선.
- Realtime:
  - HUD + transcript + transport의 역할 대비를 더 명확히 하고, audio feedback은 한 컴포넌트만 남긴다.
- List/Settings/Detail:
  - 장식보다 밀도 제어와 scanability를 우선한다.

### 수용 기준 (AC)

- [x] 공통 visual token이 shell/work/status 3계층으로 문서화됨
- [x] form/workspace 가독성이 현 상태보다 개선되는 방향으로 설계됨
- [x] route별 primary/secondary emphasis 원칙이 명문화됨
- [x] motion/audio feedback이 과밀하지 않은 상태로 정리됨

## Plan (Review 대상)

1. 현재 dark theme에서 과장된 요소와 유지할 요소를 분리한다.
2. 3계층 surface/token system을 확정한다.
3. route별 emphasis 원칙과 audio feedback 원칙을 문서화한다.
4. 이후 구현 순서를 list -> realtime -> settings/detail 순으로 제안한다.

## Review Checklist (Plan Review)

- [x] 현재 방향을 완전히 되돌리지 않고, 좋은 점은 유지한 채 과한 요소만 절제하는가?
- [x] 시각 원칙이 실제 route별 구현 결정으로 이어질 정도로 구체적인가?
- [x] status accent와 form readability의 우선순위가 분명한가?

## Self Review (Spec/Plan)

- [x] 디자인 task를 미적 취향이 아니라 작업성 개선으로 정의했다.
- [x] 토큰/계층/route 원칙이 후속 구현의 기준이 된다.
- [x] 오디오 meter 단일화 요구를 시각 설계 안에 포함시켰다.

## Implementation Log

- [x] visual noise inventory 작성
- [x] 3계층 token system 반영
- [x] route별 emphasis 조정
- [x] audio feedback component 정리
- [x] before/after evidence 정리

## Review Checklist (Implementation Review)

- [x] ornament 축소가 밋밋함으로 가지 않고 hierarchy 개선으로 이어졌는지 확인
- [x] dark mode contrast가 실제 입력/읽기 작업에 충분한지 확인
- [x] 모바일에서 시각 밀도가 과도하지 않은지 확인

## Verify

- [x] mobile before-after 비교 (`T503/T504` evidence -> `T506` evidence)
- [x] desktop after spot-check (`/`, `/realtime`, `/settings`, `/transcriptions/:id`)
- [x] a11y quick notes 갱신: `docs/todo/2026-03-06-ui-remediation-loop/evidence/t506-visual-refinement/20260306/a11y-notes.md`
- [x] 사용자 동선 기준 spot-check (`/`, `/realtime`, `/settings`, `/transcriptions/:id`)
