# UI Remediation + Studio Console Alignment Plan (2026-03-06)

> Status: current canonical UI/spec baseline. Current execution plan lives in `docs/plan-review-remediation-2026-03-07.md`, and the current execution board lives in `docs/todo/2026-03-07-review-remediation-loop/README.md`.

## Goal

현재 워킹트리에서 식별된 `P0~P2` 결함을 출하 가능 상태로 복구하고, 동시에 `Studio Console` 디자인 방향을 문서상 canonical contract로 재정의한다.

## Inputs

현재 기준 핵심 문제는 다음 다섯 축으로 정리된다.

1. releasability 회귀: `lint/build/i18n` 실패
2. realtime correctness 회귀: 종료 후 라우팅, 기본 config fallback, 오디오 meter wiring 불안정
3. mobile IA 충돌: 전역 하단 액션과 route별 sticky action이 중복될 수 있음
4. accessibility/motion drift: icon button label, reduced motion, dark mode browser chrome 정합성 부족
5. spec/design drift: 현재 dark Studio Console 구현과 기존 문서 범위가 어긋남

## Canonical Decisions

### 1. Release Gate Contract

- 배포 전 최소 게이트는 `npm --prefix webapp run lint`, `npm --prefix webapp run build`, `npm --prefix webapp run i18n:check`, `npm --prefix webapp run test -- AppRouter`이다.
- 위 게이트를 통과하지 못하면 Studio Console 관련 문서의 stage 상태를 `verified`로 간주하지 않는다.
- 임시 산출물(`*.tmp`)은 `src/` 아래에 남기지 않는다.

### 2. Realtime Functional Contract

- 실시간 세션 시작 전 config precedence는 다음 순서를 따른다.
  - 직접 편집한 JSON
  - 현재 선택 preset JSON
  - default preset JSON
  - 문서화된 known-good fallback preset JSON
- 위 값 중 유효한 JSON이 하나도 없으면 세션 시작을 차단하고 복구 가능한 오류를 보여준다.
- session 준비는 `prepareSession()` 단일 진입점으로 유지한다.
- countdown UX와 session 준비는 병렬 진행할 수 있지만, caller는 recorder/socket callback이 오기 전까지 외부 stream 상태를 직접 읽지 않는다.
- 오디오 시각화 source of truth는 하나만 둔다. realtime 화면은 recorder level feed를 canonical meter로 사용한다.
- 세션 저장 완료 후 상세 페이지 이동은 라우터 contract(`/transcriptions/:id`)를 반드시 따른다.
- realtime 전용 component family(`RealtimeStatusBanner`, `RealtimeToolbar`, `RealtimeTranscript`, `RealtimeSettingsDialog`)는 허용하되, shared token/IA/mobile ownership contract를 따라야 한다.
- 권한 복구는 HUD primary 영역에서 다루고, transport dock와 겹치지 않도록 snackbar는 상단 anchor를 사용한다.

### 3. Mobile Action Ownership Contract

- 모바일 하단의 primary action owner는 route당 하나만 허용한다.
- `/` 목록 화면: empty state에서는 page-level sticky strip가 owner, 그 외에는 global fallback action 사용
- `/realtime` 화면: transport dock가 owner
- `/settings`, `/transcriptions/:id`: 기본적으로 전역 액션 비노출, 필요한 경우 페이지 내부 CTA만 사용
- `MainLayout`의 전역 하단 액션은 owner가 없는 route에서만 활성화한다.

### 4. Accessibility + Motion Contract

- icon-only control은 모두 명시적 `aria-label`을 가진다.
- `prefers-reduced-motion` 환경에서는 item-level spring animation과 smooth auto-scroll을 끈다.
- dark theme를 유지하는 경우 문서/브라우저 chrome 정합성을 위해 `color-scheme: dark`를 선언한다.
- 신규 UI 카피는 `i18n:check`를 통과해야 merge 가능하다.

### 5. Visual Direction Contract

- 방향성은 `Dark Studio Console`을 유지하되, ornament보다 작업성을 우선한다.
- 시각 계층은 세 단계만 둔다.
  - Shell: 저채도 배경 + 매우 약한 분위기 레이어
  - Work Surface: 실질 입력/목록/트랜스크립트가 올라가는 solid/translucent panel
  - Status Accent: 상태 변화, CTA, active meter
- form/editing 영역에는 과한 glass/shadow를 줄이고 대비와 가독성을 우선한다.
- motion은 page-entry 1개 + state transition 1개 수준으로 제한하고, 리스트/세그먼트 전체에 상시 적용하지 않는다.

### 6. Documentation Contract

- 현재 canonical spec은 `docs/plan-ui-remediation-2026-03-06.md` 하나만 사용한다.
- 현재 구현 추적과 상태 관리는 `docs/plan-review-remediation-2026-03-07.md`와 `docs/todo/2026-03-07-review-remediation-loop/`로 관리한다.
- `docs/todo/2026-03-06-ui-remediation-loop/`는 foundational remediation loop의 historical execution board다.
- `docs/studio-console-rollout-plan-2026-03-04.md`는 execution history 전용 문서다.
- `docs/plan-studio-console-v3.md`는 concept/IA baseline 문서다.
- `docs/plan-p1-ui-refresh.md`는 pre-remediation archive 문서다.
- `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md`와 `docs/todo/2026-03-06-admin-boundary-reconnect-loop/`는 completed loop archive다.
- `verified`, `Done` 같은 상태 표현은 각 문서에 적힌 검증 명령이 실제로 통과했을 때만 사용한다.

## Documentation Roles

| Document | Role | Status rule |
|---|---|---|
| `docs/plan-ui-remediation-2026-03-06.md` | current canonical spec | 현재 코드와 승인된 contract만 유지 |
| `docs/plan-review-remediation-2026-03-07.md` | current execution plan | 현재 review follow-up 범위와 우선순위만 유지 |
| `docs/todo/2026-03-07-review-remediation-loop/README.md` | current execution board | `Spec -> Plan Review -> Implement -> Impl Review -> Verify` 상태 기록 |
| `docs/todo/2026-03-07-review-remediation-loop/T*.md` | current task-level spec/review/verify log | 현재 task evidence와 검증 명령 연결 |
| `docs/todo/2026-03-06-ui-remediation-loop/README.md` | historical execution board | foundational remediation loop의 완료 기록 |
| `docs/todo/2026-03-06-ui-remediation-loop/T*.md` | historical task log | 당시 evidence와 검증 기록 보존 |
| `docs/studio-console-rollout-plan-2026-03-04.md` | historical rollout execution log | 당시 실행/검증 기록만 보존, canonical truth로 사용하지 않음 |
| `docs/plan-studio-console-v3.md` | concept + IA baseline | 현재 구현과 다르면 remediation plan이 우선 |
| `docs/plan-p1-ui-refresh.md` | historical archive | 배경 맥락만 제공, current contract 아님 |
| `docs/plan-admin-boundary-reconnect-resilience-2026-03-06.md` | historical loop plan | completed loop의 target/decision context 보존 |
| `docs/todo/2026-03-06-admin-boundary-reconnect-loop/README.md` | historical execution board | completed boundary/reconnect loop 상태 기록 |

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T501 | P0 | Release gate recovery | lint/build/i18n/test green + temp artifact 정리 |
| T502 | P0 | Realtime correctness recovery | 세션 시작/종료/오디오 meter/기본 config deterministic |
| T503 | P1 | Mobile action ownership | route별 CTA owner 단일화 |
| T504 | P1 | A11y/motion/localization guardrails | reduced motion/aria/dark chrome 정합성 확보 |
| T505 | P1 | Spec/doc realignment | 현재 승인된 UI 구조를 문서상 canonical로 재정의 |
| T506 | P2 | Visual refinement v4 | dark Studio Console을 더 차분하고 작업 친화적으로 재정의 |

## Definition of Done

- P0 완료 후 현재 branch가 배포 게이트를 통과한다.
- P1 완료 후 스펙/구현 간 명시적 모순이 사라진다.
- P2 완료 후 디자인 방향이 문서화되고, 이후 화면 작업이 동일 token/IA contract를 재사용할 수 있다.

## Self Review

- [x] 결함 수정과 디자인 방향이 같은 contract 안에서 충돌 없이 정리되었다.
- [x] 구현 우선순위가 release blocker -> functional regression -> IA/a11y -> visual polish 순으로 배치되었다.
- [x] 각 축이 측정 가능한 수용 기준으로 환원되었다.
