# T403 - Settings 저장값 이상치 방어 (`realtimeAutoSaveSeconds`)

## Spec

### 문제

- 설정 hydrate 시 `realtimeAutoSaveSeconds`를 검증 없이 `Number()`로 반영해 `NaN/0/음수/비정상 큰 값`이 상태로 들어올 수 있다.
- 잘못된 값이 autosave 간격 계산에 전달되면 예기치 않은 동작을 유발할 수 있다.

### 목표

- 설정 저장/로드 경로에서 autosave 주기를 안정 범위로 정규화한다.

### 범위

- 포함:
  - hydrate 시 숫자 검증/기본값 fallback
  - 입력 시 최소/최대 범위 clamp
  - 단위 테스트 추가
- 제외:
  - 설정 스키마 전체 마이그레이션

### 해결방안

- 공통 `sanitizeAutoSaveSeconds` 유틸을 도입한다.
- hydrate/update 모두 해당 유틸을 통과시키고, 비정상 값은 기본값(10초) 또는 허용 범위로 정규화한다.
- 필요 시 기존 잘못된 저장값을 재저장해 데이터 정합성을 복구한다.

### 수용 기준 (AC)

- [x] `NaN`, `0`, 음수, 문자열 이상치가 들어와도 상태는 유효한 정수(>=1)로 유지된다.
- [x] Realtime autosave interval 계산이 비정상 값으로 깨지지 않는다.
- [x] 설정 저장/로드 관련 테스트가 추가되어 회귀를 막는다.

## Plan (Review 대상)

1. 현재 hydrate/update 경로를 추적해 정규화 적용 지점을 확정한다.
2. 최소/최대 정책값(예: `1~3600`)을 정의한다.
3. store/화면 입력 처리에 일관 적용한다.
4. store 단위 테스트와 회귀 테스트를 추가한다.

## Review Checklist (Plan Review)

- [x] 사용자 입력 UX(경고/보정)와 내부 정규화가 충돌하지 않는가?
- [x] 기존 저장 데이터와의 하위호환이 보장되는가?
- [x] 경계값 정책이 운영/UX 요구와 맞는가?

## Implementation Log

- [x] `webapp/src/store/settingsStore.ts` hydrate/update 정규화 적용
  - `sanitizeRealtimeAutoSaveSeconds` 도입 (`1~3600` clamp + invalid fallback 10)
- [x] Settings 입력 처리 경계값 정리
  - store 레벨에서도 최소/최대 경계 강제해 비정상 호출 방어
- [x] 관련 테스트 추가
  - `webapp/src/store/settingsStore.test.ts` 추가

## Review Checklist (Implementation Review)

- [x] 이상치 데이터 주입 시 정상 fallback 되는가?
- [x] Realtime 페이지 autosave가 안정적으로 동작하는가?
- [x] 테스트가 경계값 케이스를 충분히 커버하는가?

## Verify

- [x] `npm --prefix webapp run test -- settingsStore runtimeErrorReporter --reporter=basic`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
