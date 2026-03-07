# T804 - Realtime Accessibility Recovery

## Spec

### 문제

- runtime settings dialog close 후 포커스 복귀가 깨져 있다.
- transcript는 auto-follow만 있고 `aria-live`/follow control이 부족하다.

### 목표

- realtime 화면의 dialog와 transcript를 키보드/스크린리더 친화적으로 만든다.

### 범위

- 포함:
  - dialog focus restore fix
  - transcript `aria-live`/follow-live 개선
  - 필요한 microcopy/UI affordance 추가
- 제외:
  - realtime 전체 IA 재설계

### 해결방안

- toolbar trigger ref를 실제로 연결하고 MUI restore focus contract와 충돌하지 않게 한다.
- transcript는 `follow live` toggle을 제공하고, follow가 꺼지면 강제 auto-scroll을 멈춘다.
- live content container는 polite live region semantics를 가진다.

### 상세 설계

- `RealtimeToolbar`가 settings trigger ref를 forward/ref prop으로 받는다.
- dialog는 restore focus를 기본 동작 또는 explicit fallback으로 보장한다.
- transcript component에 `followLive`, `onFollowLiveChange`를 추가한다.
- auto-scroll은 `followLive === true`일 때만 동작한다.

### 수용 기준 (AC)

- [ ] dialog close 후 settings trigger에 포커스 복귀
- [ ] 사용자가 auto-follow를 끌 수 있음
- [ ] transcript가 적절한 live region semantics를 가짐

## Plan (Review 대상)

1. focus restore bug를 먼저 고친다.
2. transcript follow-live state와 toggle을 추가한다.
3. live region semantics와 reduced-motion을 같이 점검한다.

## Review Checklist (Plan Review)

- [x] focus trap/restore를 직접 꼬지 않는가?
- [x] auto-follow off 시 기존 transcript review가 가능한가?
- [x] screen reader noise가 과도하지 않도록 `polite` 수준을 택했는가?

## Self Review (Spec/Plan)

- [x] 키보드 포커스와 live transcript를 같은 accessibility task로 묶는 편이 응집도가 높다.
- [x] visual IA를 크게 흔들지 않고 affordance를 추가할 수 있다.
- [x] realtime operator task와 screen-reader semantics를 동시에 개선한다.

## Implementation Log

- [ ] pending

## Review Checklist (Implementation Review)

- [ ] focus restore가 실제 trigger에 돌아가는가?
- [ ] follow-live off 상태에서 새 segment가 와도 scroll jump가 없는가?
- [ ] transcript live region이 과도한 재공지 없이 동작하는가?

## Verify

- [ ] `npm --prefix webapp run test -- AppRouter`
- [ ] `npm --prefix webapp run lint`
