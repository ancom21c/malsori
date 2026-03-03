# T208 - Connection HUD + Empty State 디자인 적용

## Spec

### 문제

- 실시간 연결 품질/재연결 상태가 사용자에게 분산된 메시지로 전달되어 즉시 파악이 어렵다.
- 전사 리스트 빈 상태는 행동 유도는 있지만 “작업 시작 컨텍스트”가 약하다.

### 목표

- 실시간 화면에 `Connection HUD`를 도입해 상태 가시성을 높인다.
- 리스트 빈 상태를 작업 중심 CTA 카드 구조로 개선해 첫 행동 전환율을 높인다.

### 범위

- 포함:
  - Realtime: 연결 상태/지연/권한/재시도 상태를 하나의 HUD로 통합
  - List Empty: 업로드/실시간 시작/도움말 진입 CTA 재배치
  - 모션 정책(`prefers-reduced-motion`) 준수
- 제외:
  - 실시간 인식 엔진 자체 성능 튜닝

### 해결방안

- HUD 컴포넌트 설계:
  - 상태 배지(Stable/Delayed/Critical)
  - 마지막 이벤트 메시지
  - 즉시 액션(재시도/중단/설정 이동)
- Empty state 설계:
  - 상황 설명 + 2개의 primary CTA + 1개의 secondary 도움 링크
  - 모바일에서는 sticky CTA bar와 일관성 있게 배치
- 디자인 언어:
  - 색/아이콘/카피를 상태 머신 코드와 1:1 매핑

### 수용 기준 (AC)

- [x] 실시간 화면에서 연결 상태를 HUD 하나로 확인할 수 있다.
- [x] 빈 상태에서 업로드/실시간 시작 액션이 즉시 보인다.
- [x] reduced-motion 환경에서 과도한 애니메이션이 제거된다.

## Plan (Review 대상)

1. 현재 실시간 상태 소스(`connectionUxState`, `errorMessage`, latency)를 HUD 모델로 매핑
2. HUD 컴포넌트 API 정의 및 화면 배치(모바일/데스크톱) 확정
3. 리스트 빈 상태 CTA 재구성 및 카피 정리
4. 모션/접근성(aria-live, focus order) 검증 계획 수립

## Review Checklist (Plan Review)

- [x] HUD가 기존 알림(snackbar)과 충돌하지 않는가?
- [x] 빈 상태 CTA가 FAB/SpeedDial과 중복 혼란을 만들지 않는가?
- [x] 접근성(색 대비, 스크린리더) 기준을 만족하는가?

## Implementation Log

- [x] `webapp/src/pages/RealtimeSessionPage.tsx`에 연결 상태 HUD 카드 삽입 (상태/지연/재시도 액션 통합)
- [x] `webapp/src/pages/TranscriptionListPage.tsx` 빈 상태 레이아웃/CTA 재구성 (desktop CTA + mobile sticky CTA)
- [x] 기존 i18n 키 재사용으로 상태 라벨/행동 문구 정렬
- [x] HUD transition에 `prefers-reduced-motion` 대응 추가

## Review Checklist (Implementation Review)

- [x] HUD 상태가 실제 연결 상태 전이와 동기화되는가?
- [ ] 모바일에서 CTA 가림/겹침 문제가 없는가?
- [x] 기존 기능 버튼(FAB/SpeedDial)의 역할이 명확한가?

## Verify

- [ ] 수동 점검: 정상/지연/오류/재시도 상태별 HUD 노출 확인
- [ ] 수동 점검: 빈 상태에서 업로드/실시간 시작 전환 확인
- [x] `npm --prefix webapp run test`
