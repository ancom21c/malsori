# T504 - 접근성/모션/다크모드 브라우저 정합성 보강

## Spec

### 문제

- icon-only control에 명시적 label이 없는 지점이 있다.
- item-level motion과 smooth auto-scroll이 reduced motion contract를 따르지 않는다.
- dark theme 전환 이후 browser chrome/native control 정합성 계약이 문서화되지 않았다.
- 새 UI 카피는 translation completeness gate에 연결되어야 한다.

### 목표

- Studio Console refresh가 접근성/모션/브라우저 정합성 기준을 명시적으로 만족하게 만든다.
- 시각 방향은 유지하되, 감각적 연출보다 사용성 기준을 우선한다.

### 범위

- 포함:
  - icon-only `aria-label` 보강
  - reduced motion branch 도입
  - `color-scheme: dark` 및 native control 정합성 정리
  - 새 UI 카피/버튼 label의 localization completeness 규칙 문서화
- 제외:
  - 전체 WCAG 자동화 파이프라인 구축

### 해결방안

- motion 컴포넌트는 모두 reduced-motion-aware wrapper 또는 conditional props를 사용한다.
- smooth scroll은 reduced motion 환경에서 `auto` 또는 no-animation으로 degrade한다.
- 전역 dark theme는 `color-scheme: dark`를 선언하고 native date/input 렌더링을 점검한다.
- icon button과 FAB는 tooltip이 아니라 `aria-label`을 source of truth로 갖는다.

### 상세 설계

- `framer-motion`을 쓰는 list/transcript/realtime 컴포넌트에서 `useReducedMotion` 또는 동등 로직을 공통 적용한다.
- item-level stagger는 제거하거나 desktop only/normal motion 환경에서만 허용한다.
- `body` 또는 root에 `color-scheme: dark`를 선언한다.
- localization completeness는 `i18n:check`로 gate하고, 신규 컴포넌트 PR checklist에 포함한다.

### 수용 기준 (AC)

- [x] icon-only control에 누락 `aria-label`이 없음
- [x] reduced motion 환경에서 smooth scroll/item spring animation이 비활성화됨
- [x] dark theme 환경에서 native control/date picker의 시각 정합성이 유지됨
- [x] localization completeness 기준이 문서와 verify에 반영됨

## Plan (Review 대상)

1. icon-only control과 motion 사용 지점을 인벤토리한다.
2. reduced motion 공통 전략을 정한다.
3. dark mode browser chrome contract를 CSS/root 수준에서 정리한다.
4. a11y/localization verify checklist를 문서화한다.

## Review Checklist (Plan Review)

- [x] tooltip 유무와 접근성 label을 분리해서 다루고 있는가?
- [x] reduced motion 적용 범위를 CSS와 JS motion 모두에 걸치게 했는가?
- [x] dark mode 정합성을 단순 색상 변경이 아닌 browser chrome contract로 정의했는가?

## Self Review (Spec/Plan)

- [x] 접근성, motion, localization을 같은 release quality 범주로 묶는 것이 타당하다.
- [x] 시각 디자인 요구와 충돌하지 않는 최소 계약을 정의했다.
- [x] 검증 가능 항목으로 환원되어 있다.

## Implementation Log

- [x] control/motion inventory 작성
- [x] reduced motion 전략 반영
- [x] `aria-label` 누락 보강
- [x] `color-scheme: dark` 적용 및 native control 점검
- [x] a11y/localization verify 문서 갱신

## Review Checklist (Implementation Review)

- [x] reduced motion 분기에서 layout collapse나 state mismatch가 없는지 확인
- [x] screen reader/keyboard 관점에서 tooltip 없는 상태도 의미 전달이 되는지 확인
- [x] 다국어 추가 시 누락을 다시 허용하지 않는 gate가 유지되는지 확인

## Verify

- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run test -- AppRouter`
- [x] `npm --prefix webapp run build`
- [x] reduced motion emulation 확인: `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true`
- [x] keyboard first-tab audit: `docs/todo/2026-03-06-ui-remediation-loop/evidence/t504-a11y-motion/20260306/home-first-tab.yaml`
- [x] dark mode native control spot-check: `docs/todo/2026-03-06-ui-remediation-loop/evidence/t504-a11y-motion/20260306/settings-dark-controls-mobile.png`
- [x] reduced motion mobile spot-check: `docs/todo/2026-03-06-ui-remediation-loop/evidence/t504-a11y-motion/20260306/list-reduced-motion-mobile.png`
