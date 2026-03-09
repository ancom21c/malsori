# T904 - Settings Operator Boundary Polish

## Spec

### 문제

- `/settings`에서 public setup과 operator tools의 시각적 경계가 아직 약하다.
- internal-only/admin token 기능이 일반 설정과 동급으로 읽힐 수 있다.

### 목표

- public user path와 internal operator path를 한눈에 구분되게 만든다.
- 내부망/관리자 전제 기능임을 copy와 hierarchy로 명확히 드러낸다.

### 범위

- 포함:
  - settings 상단 section copy, card grouping, tone adjustment
  - operator 전용 badge/helper/warning copy
  - mobile/desktop 모두에서 읽히는 boundary hierarchy
- 제외:
  - settings route 분리
  - backend operator feature 추가

### 해결방안

- settings 메인 레이아웃을 `Public Setup`과 `Operator Tools` 두 zone으로 분리한다.
- operator zone은 warning/neutral accent, boundary label, internal network copy를 사용한다.
- admin token 및 backend override 관련 CTA는 operator zone 내부로만 묶는다.

### 상세 설계

- `StudioPageShell` 아래 settings body에 zone-level heading/subcopy를 둔다.
- transcription/presets/permissions는 public zone, backend/admin은 operator zone으로 그룹화한다.
- operator zone은 stronger border, muted surface, advisory copy를 사용하되 과한 danger tone은 피한다.
- copy는 "internal network", "operator", "not public"를 명시적으로 사용한다.

### 수용 기준 (AC)

- [ ] public setup과 operator tools가 시각적으로 분리된다.
- [ ] backend/admin 관련 기능이 internal-only path임을 즉시 읽을 수 있다.
- [ ] mobile에서도 zone hierarchy가 유지된다.

## Plan (Review 대상)

1. 현재 settings 섹션 구조를 유지한 채 zone wrapper를 추가한다.
2. operator zone copy와 surface token을 조정한다.
3. mobile에서 card stacking 시 hierarchy가 무너지지 않는지 점검한다.

## Review Checklist (Plan Review)

- [x] route/section 구조를 바꾸지 않고 hierarchy만 강화하는가?
- [x] operator zone이 과도하게 alarmist하지 않은가?
- [x] boundary copy가 기능 정책과 정확히 맞는가?

## Self Review (Spec/Plan)

- [x] 사용자 요청의 design 방향을 직접 spec에 반영했다.
- [x] 보안/정책 경계를 시각 hierarchy와 copy로 풀어내는 방향이 타당하다.
- [x] write scope가 settings 화면에 국한돼 있어 안전하다.

## Implementation Log

- [x] settings summary card에서 operator 상태를 warning tone으로 분리했다.
- [x] `/settings` 본문을 `Public Setup` zone과 `Operator Tools` zone wrapper로 구획했다.
- [x] transcription/permissions card는 public zone 안에 묶고, backend card는 operator zone 안에 묶었다.
- [x] internal admin URL 입력을 warning subpanel로 분리해 internal-only boundary를 더 빨리 읽히게 했다.
- [x] `ContextCard`에 warning tone을 추가하고 관련 i18n copy를 보강했다.

## Review Checklist (Implementation Review)

- [x] operator controls가 visually quarantined 되었는가?
- [x] mobile/desktop 모두에서 hierarchy가 유지되는가?
- [x] copy가 실제 internal-only 정책과 충돌하지 않는가?

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
