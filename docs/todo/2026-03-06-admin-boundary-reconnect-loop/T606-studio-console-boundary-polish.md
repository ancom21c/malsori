# T606 - Studio Console Boundary / Copy / Header Polish

## Spec

### 문제

- list empty-state는 explicit CTA를 보여주면서도 여전히 위치 기반 안내 문구를 남기고 있다.
- mobile header는 global chrome 비중이 높아 route 작업 맥락보다 먼저 눈에 들어올 수 있다.
- public 작업 영역과 internal operator 영역의 시각 경계가 더 분명해질 필요가 있다.

### 목표

- 행동 지시 중심의 copy로 first-run clarity를 높인다.
- mobile header density를 낮춰 route 작업 맥락을 우선시한다.
- public/operator 경계를 Studio Console 안에서 더 즉시 읽히게 만든다.

### 범위

- 포함:
  - list empty-state copy 정리
  - mobile header action density 조정
  - settings operator/public 경계 표현 토큰 정리
- 제외:
  - 기능적 routing/API 구조 변경

### 해결방안

- empty-state 설명은 "어디를 누르라"가 아니라 "무엇을 할 수 있다"로 바꾼다.
- mobile top bar는 install CTA를 settings/help로 이동하고, header에는 고빈도 글로벌 컨트롤만 남긴다.
- operator 카드군은 `Internal only` label, 대비 있는 border/accent, 짧은 helper copy로 묶는다.

### 상세 설계

- list empty-state 본문은 `Upload a file to start a transcript or open a real-time session.` 계열의 verb-first copy로 교체한다.
- mobile header는 `menu + brand + drive/language` 정도로 단순화한다.
- public/operator 경계는 색을 과하게 늘리지 않고 label + outline + helper text 조합으로 만든다.
- Studio Console의 dark shell/work/accent 3계층 규칙은 유지한다.

### 수용 기준 (AC)

- [ ] empty-state copy가 실제 CTA 구조와 모순되지 않는다.
- [ ] mobile header가 더 단순해지고 route 작업 맥락을 가리지 않는다.
- [ ] settings에서 public/operator 경계가 한눈에 읽힌다.

## Plan (Review 대상)

1. empty-state/header/operator boundary의 current UI inventory를 정리한다.
2. copy/IA 수정안을 먼저 확정한다.
3. visual token 조정은 최소한으로 두고 hierarchy 위주로 반영한다.
4. mobile screenshot 기준 점검 항목을 만든다.

## Review Checklist (Plan Review)

- [x] 장식보다 hierarchy/clarity를 우선하는가?
- [x] 기존 Studio Console 다크 방향을 버리지 않고 경계 표현만 강화하는가?
- [x] 기능적 task와 시각 polish task의 순서를 뒤바꾸지 않았는가?

## Self Review (Spec/Plan)

- [x] 이번 루프의 디자인 작업이 operator boundary라는 실제 문제에 연결되어 있다.
- [x] copy/IA 조정으로 빠른 체감 개선을 만들 수 있다.
- [x] P2로 두어 기능적 P0/P1 작업을 막지 않도록 했다.

## Implementation Log

- [x] UI inventory / copy draft 작성
- [x] empty-state / mobile header / operator boundary 반영
- [x] screenshot / note 정리

### 구현 메모

- list empty-state copy를 verb-first 문장으로 교체했다.
- install CTA를 app bar에서 menu item으로 이동시켜 mobile header density를 줄였다.
- mobile 언어 선택을 icon/flag 중심 compact control로 줄였다.
- settings operator boundary box에 warning/success outline 토큰을 추가해 public/operator 경계를 더 빨리 읽히게 했다.

## Review Checklist (Implementation Review)

- [x] copy가 실제 CTA와 모순되지 않는지 확인
- [x] mobile header가 crowded 해지지 않는지 확인
- [x] operator boundary 표현이 과장되거나 noisy 하지 않은지 확인

## Self Review (Implementation)

- [x] 기능 동작은 유지하고 chrome density와 hierarchy만 조정했다.
- [x] install CTA를 제거한 대신 menu 경로를 유지해 기능 회귀를 피했다.
- [x] operator boundary는 색을 늘리기보다 outline/helper 중심으로 보강해 noisy 해지지 않도록 제한했다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] mobile/desktop screenshot note 작성
