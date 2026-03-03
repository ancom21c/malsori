# T203 - Backend Admin UI 내부망 운영 정책 정렬

## Spec

### 문제

- `/v1/backend/endpoint`는 내부망/관리자 인증 전제인데, 일반 사용자 흐름(업로드/실시간)에서도 즉시 적용 UI가 노출된다.
- 운영 정책과 사용자 노출면이 불일치해 오용/혼란 가능성이 있다.

### 목표

- 관리자 endpoint 변경 기능은 Settings의 관리자 영역에서만 노출되게 정렬한다.
- 일반 사용자 플로우에서는 서버 endpoint를 변경하지 않고 로컬 preset 선택만 허용한다.

### 범위

- 포함:
  - Upload/Realtime 화면의 `BackendEndpointPresetSelector` 노출 정책 변경
  - Settings(backend admin enabled + token) 기반 관리자 모드 분기 강화
  - 사용자용/관리자용 안내 문구 분리
- 제외:
  - RBAC/OIDC 같은 계정 권한 체계 신규 도입

### 해결방안

- `backendAdminEnabled` capability와 관리자 토큰 존재를 모두 만족할 때만 서버 변경 UI를 노출한다.
- Upload/Realtime에서는 기본적으로 읽기 전용 endpoint 표시만 제공한다.
- 관리자 기능 필요 시 Settings의 Backend 섹션으로 유도하는 링크/가이드를 제공한다.

### 수용 기준 (AC)

- [x] Upload/Realtime에서 관리자 endpoint 변경 컨트롤이 기본 숨김된다.
- [x] Settings에서만 관리자 인증 후 endpoint 변경이 가능하다.
- [x] 내부망 정책 문서와 UI 동작이 일치한다.

## Plan (Review 대상)

1. endpoint 변경 호출 경로(컴포넌트/훅)와 사용자 진입점 전수 확인
2. capability + token 기반 렌더링 가드 컴포넌트 추가
3. Upload/Realtime UI를 읽기 전용 endpoint 정보 카드로 대체
4. 관리자 안내 문구 및 help 문서 동기화

## Review Checklist (Plan Review)

- [x] 기존 관리자 운영 플로우가 막히지 않는가?
- [x] 일반 사용자 플로우에 추가 마찰이 생기지 않는가?
- [x] 정책 위반(무인증 변경) 경로가 남아있지 않은가?

## Implementation Log

- [x] `webapp/src/components/BackendEndpointPresetSelector.tsx` 관리자 토큰 필수화(토큰 없이 서버 변경 불가)
- [x] `webapp/src/components/UploadDialog.tsx` 서버 변경 UI 제거 후 읽기 전용 endpoint 카드로 대체
- [x] `webapp/src/pages/RealtimeSessionPage.tsx` 서버 변경 UI 제거 후 읽기 전용 endpoint 카드로 대체
- [x] `webapp/src/pages/SettingsPage.tsx` 관리자 가이드 Alert 추가 및 토큰 기반 운영 흐름 강조
- [x] 운영 문서 업데이트 (`README.md` 내부망 전제 명시)

## Review Checklist (Implementation Review)

- [x] 비관리자 환경에서 서버 변경 호출이 실제로 불가능한가?
- [ ] 관리자 환경에서 변경/초기화가 정상 동작하는가?
- [x] 회귀 없이 파일 전사/실시간 시작 플로우가 유지되는가?

## Verify

- [ ] 수동 확인: 비관리자 환경에서 Upload/Realtime 화면 노출 점검
- [ ] 수동 확인: 관리자 토큰 입력 후 Settings에서 변경/리셋 점검
- [x] `npm --prefix webapp run test`
