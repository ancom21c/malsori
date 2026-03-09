# T704 - List Empty-State Copy Alignment

## Spec

### 문제

- empty-state copy가 여전히 위치 기반 문구를 사용한다.
- 현재 CTA owner 구조와 설명 문장이 어긋난다.

### 목표

- empty-state를 action-based copy로 정리한다.
- desktop/mobile CTA 구조와 문장 semantics를 일치시킨다.

### 범위

- 포함:
  - empty-state helper copy 수정
  - 관련 i18n key 정리
- 제외:
  - CTA layout 자체 변경

### 해결방안

- 위치 지시를 없애고 현재 가능한 행동을 직접 말한다.
- 같은 의미가 desktop inline CTA와 mobile sticky CTA에 공통으로 읽히게 만든다.

### 상세 설계

- 추천 문장 예시: `Upload a file to request transcription or open a real-time session.`
- 위치 표현(`bottom right`, `button below`)은 금지한다.
- key 이름도 semantics 기준으로 재정리한다.

### 수용 기준 (AC)

- [ ] empty-state copy가 현재 CTA 구조와 모순되지 않음
- [ ] 모바일/데스크톱에서 같은 행동 의미를 전달
- [ ] i18n key가 현재 의미를 반영

## Plan (Review 대상)

1. 현재 empty-state copy와 CTA owner를 대조한다.
2. action-based 문장을 확정한다.
3. i18n key와 usage를 함께 정리한다.

## Review Checklist (Plan Review)

- [x] 위치가 아니라 행동을 설명하는가?
- [x] CTA 구조를 바꾸지 않고 drift만 제거하는가?
- [x] 번역 키 의미도 함께 정리하는가?

## Self Review (Spec/Plan)

- [x] 작은 수정이지만 first-run clarity에 직접 영향이 있다.
- [x] T606 구현 메모와 현재 코드의 차이를 바로 메운다.
- [x] 회귀 위험이 낮다.

## Implementation Log

- [x] empty-state helper key를 위치 기반 이름에서 행동 기반 의미로 교체했다.
- [x] helper 문구를 `file transcription 요청` 또는 `real-time session 시작`이라는 실제 행동 기준으로 다시 썼다.
- [x] mobile sticky CTA의 realtime 라벨도 `startRealTimeTranscription`으로 맞춰 desktop/mobile semantics를 통일했다.

## Review Checklist (Implementation Review)

- [x] 구현 후 spec drift가 없는지 확인
- [x] regression risk를 점검
- [x] verify 명령과 문서 역할이 일치하는지 확인

### Self Review (Implementation)

- 실제 layout을 건드리지 않고 copy/key 이름만 정리해 회귀 위험을 낮췄다.
- helper 문구와 버튼 라벨이 모두 동사형이 되어 first-run empty state에서 다음 행동이 더 분명해졌다.
- semantics rename이 번역 키까지 포함되므로 나중에 다시 읽어도 의미 drift가 덜하다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
