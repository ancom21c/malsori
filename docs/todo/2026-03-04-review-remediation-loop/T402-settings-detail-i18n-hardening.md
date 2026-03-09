# T402 - Settings/Detail 신규 카피 i18n 정합성 복구

## Spec

### 문제

- S2/S3 확장 과정에서 일부 신규 문자열이 하드코딩 영어로 들어가 locale 혼합 노출이 발생한다.
- `ja` 지원이 있는 코드베이스에서 `ko|en` 분기만 쓰는 부분이 존재한다.

### 목표

- Settings/Detail 신규 문자열을 모두 i18n 키로 전환해 `ko/en/ja` 일관 노출을 보장한다.

### 범위

- 포함:
  - `SettingsPage`, `TranscriptionDetailPage` 하드코딩 문구 제거
  - translations 키 추가 및 키 누락 점검
  - 관련 테스트/검증 업데이트
- 제외:
  - 전체 문구 재번역 프로젝트

### 해결방안

- 화면 코드의 직렬 문자열을 `t("...")` 기반으로 치환한다.
- `detailCopy` locale 분기를 제거하고 공통 번역 키를 사용한다.
- `npm --prefix webapp run i18n:check`를 검증 루틴에 포함한다.

### 수용 기준 (AC)

- [x] 신규 S2/S3 UI 문자열이 코드상 하드코딩 영어 없이 번역 키로 참조된다.
- [x] `ko/en/ja`에서 동일 UI 요소가 각 언어로 표시된다.
- [x] i18n 키 체크 스크립트가 통과한다.

## Plan (Review 대상)

1. 하드코딩 문자열 목록을 라인 단위로 확정한다.
2. 번역 키 네이밍 규칙에 맞춰 신규 키를 정의한다.
3. 컴포넌트 로직을 키 기반으로 전환한다.
4. i18n 체크/린트/빌드로 회귀를 확인한다.

## Review Checklist (Plan Review)

- [x] 기존 번역 키 네이밍 규칙과 충돌이 없는가?
- [x] locale fallback 동작을 해치지 않는가?
- [x] 번역 키 증가로 유지보수성이 저하되지 않는가?

## Implementation Log

- [x] `webapp/src/pages/SettingsPage.tsx` 하드코딩 문자열 제거
  - Overview/permission/preset/backend summary 문자열을 `t(...)` 기반으로 치환
- [x] `webapp/src/pages/TranscriptionDetailPage.tsx` locale 분기 문자열 i18n 키화
  - `detailCopy`의 `ko/en` 하드코딩 분기를 제거하고 번역 키 기반으로 통합
- [x] `webapp/src/i18n/translations.ts` 키 추가
  - Settings/Detail 신규 UI 카피에 대한 `ko/en/ja` 키 추가

## Review Checklist (Implementation Review)

- [x] ko/en/ja에서 Settings overview/Detail overview 문구가 일관 표시되는가?
- [x] 화면 레이아웃 깨짐(문구 길이 증가)이 없는가?
- [x] i18n check/lint/build가 모두 통과하는가?

## Verify

- [x] `npm --prefix webapp run i18n:check`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
