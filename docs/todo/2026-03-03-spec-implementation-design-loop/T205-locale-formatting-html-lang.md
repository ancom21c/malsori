# T205 - 로케일 날짜/시간 표기 및 문서 lang 정렬

## Spec

### 문제

- 일부 화면이 하드코딩 날짜 포맷(`YYYY-MM-DD HH:mm:ss`)을 사용한다.
- 문서 루트 `lang="en"`이 고정되어 현재 UI 언어와 동기화되지 않는다.

### 목표

- 표시 시간/날짜를 현재 선택 언어 기반 `Intl.*` 포맷으로 정렬한다.
- 문서 루트 `lang`을 i18n locale과 동기화한다.

### 범위

- 포함:
  - 리스트/상세/재생 영역 시간 표기 유틸 통합
  - i18n provider에서 `document.documentElement.lang` 업데이트
  - 관련 테스트/문서 업데이트
- 제외:
  - DB에 저장되는 ISO timestamp 포맷 변경

### 해결방안

- `formatDateTime(locale, value)` 공통 유틸을 도입하고 하드코딩 포맷 사용처를 교체한다.
- 상대시간/절대시간 구분이 필요한 경우 옵션 기반으로 확장 가능한 형태로 설계한다.
- locale 변경 시 `lang` 속성과 시간 포맷이 즉시 반영되도록 effect를 추가한다.

### 수용 기준 (AC)

- [x] ko/en/ja 전환 시 시간 표시가 언어 규칙에 맞게 반영된다.
- [x] `<html lang>`이 현재 locale과 일치한다.
- [x] 하드코딩 날짜 문자열 출력이 제거된다.

## Plan (Review 대상)

1. 하드코딩 시간 포맷 사용처 전수 조사
2. 공통 포맷 유틸 + 타입 정의 추가
3. 페이지별 교체 및 UI 회귀 확인
4. i18n provider에 `lang` 동기화 effect 추가

## Review Checklist (Plan Review)

- [x] 시간대/브라우저별 표시 차이가 의도 범위 내인가?
- [x] 기존 정렬/필터 로직에는 영향이 없는가?
- [x] SSR/정적 빌드와 hydration 충돌이 없는가?

## Implementation Log

- [x] `webapp/src/utils/time.ts` locale-aware datetime formatter(`formatLocalizedDateTime`) 추가
- [x] `webapp/src/pages/TranscriptionListPage.tsx` 생성/동기화 시간 표시를 locale formatter로 교체
- [x] `webapp/src/components/MediaPlaybackSection.tsx` 생성 시간 표시를 locale formatter로 교체
- [x] `webapp/src/i18n/I18nProvider.tsx`의 `<html lang>` 동기화 effect 유지/검증
- [x] `webapp/src/pages/SettingsPage.tsx`, `webapp/src/pages/RealtimeSessionPage.tsx`의 locale 비동기 표기 정렬

## Review Checklist (Implementation Review)

- [x] locale 전환 즉시 포맷 반영이 되는가?
- [x] 숫자/시간 포맷이 언어별로 깨지지 않는가?
- [x] 회귀 테스트가 충분히 추가되었는가?

## Verify

- [x] 수동 점검: Playwright에서 locale `en -> ko` 전환 시 `<html lang>`(`en -> ko`)과 `Last successful check` 시간 문자열이 즉시 언어별 형식으로 갱신됨을 확인
- [x] `npm --prefix webapp run test`
- [x] `npm --prefix webapp run build`
