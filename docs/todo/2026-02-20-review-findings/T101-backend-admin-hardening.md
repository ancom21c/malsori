# T101 - Backend endpoint 관리자 보호/비공개화

## Spec

### 문제

- `/v1/backend/endpoint` 변경 API가 외부에 노출되어 있어 무인증 설정 변경 위험이 있다.
- 운영 환경에서 관리자 기능이 사용자 UI와 동일 경로로 노출되어 공격면이 넓다.

### 목표

- 운영에서는 backend 설정 변경 기능을 기본 비활성화하고, 필요한 환경에서만 명시적으로 활성화한다.
- 활성화된 경우에도 관리자 인증 없이는 조회/변경이 불가능하도록 보호한다.
- 운영 정책은 외부 공개가 아닌 `내부망/관리자 인증 전제`로 명시한다.

### 범위

- 포함:
  - python API backend 설정 endpoint 접근 제어
  - webapp settings의 backend 관리자 영역 노출 제어
  - helm values 기본값 보안 강화(운영 기본 비공개)
  - 스모크 스크립트의 관리자 헤더 처리(필요 시)
- 제외:
  - 전면적인 사용자 계정/권한 체계 도입
  - 외부 IAM/OIDC 연동

### 해결방안

- 서버 기능 플래그 도입:
  - `BACKEND_ADMIN_ENABLED` (기본 `false`)
  - 비활성 시 `/v1/backend/*` 관리자 endpoint는 `404` 또는 `403` 반환
- 관리자 토큰 기반 보호:
  - `X-Malsori-Admin-Token` 헤더 검증
  - 토큰 불일치 시 `401/403`, 민감정보는 마스킹 반환
- UI capability 기반 노출:
  - `/v1/health`에 `backendAdminEnabled` 포함
  - webapp에서 `false`면 Backend settings 탭 렌더링 금지
- 배포 기본값:
  - `infra/deploy/values.malsori.yaml`에서 관리자 기능 기본 비활성화
  - dev 전용 values에서만 활성화 + 토큰 주입

### 수용 기준 (AC)

- [x] 운영 기본 배포에서 관리자 endpoint 직접 호출 시 차단된다.
- [x] 관리자 기능이 꺼진 환경에서 Settings UI에 backend 관리 탭이 나타나지 않는다.
- [x] 관리자 기능 활성 환경에서도 올바른 토큰 없이는 설정 조회/변경이 불가하다.

## Plan (Review 대상)

1. 현재 `/v1/backend/*` endpoint와 호출자(webapp/smoke) 목록 확정
2. python API에 feature flag + admin token 검증 미들웨어 추가
3. capabilities 응답(또는 대체 계약) 확정 후 webapp 노출 분기 반영
4. helm values에서 prod/dev 기본값 분리
5. 스모크에 "관리자 기능 off가 기본" 검증 케이스 추가

## Review Checklist (Plan Review)

- [x] 관리자 기능 비활성 시 기존 사용자 흐름에 영향이 없는가?
- [x] 토큰 누출 가능성을 낮추는 로그/마스킹 정책이 있는가?
- [x] 롤백 시 feature flag로 즉시 복구 가능한가?

## Implementation Log

- [x] API 접근제어 구현
  - `python_api/api_server/main.py`: `BACKEND_ADMIN_ENABLED` + `X-Malsori-Admin-Token` 검증 가드 적용
  - `python_api/api_server/models.py`: health 응답에 `backend_admin_enabled` 추가
  - `python_api/api_server/config.py`: `BACKEND_ADMIN_*` 설정 필드 추가
- [x] UI 노출 제어 구현
  - `webapp/src/services/api/rtzrApiClient.ts`: health 조회 + 관리자 헤더 전송 지원
  - `webapp/src/pages/SettingsPage.tsx`: health 기반 backend 섹션 숨김 + 관리자 토큰 입력 필드 추가
  - `webapp/src/i18n/translations.ts`: 관리자 토큰 안내 문구 추가
- [x] 배포 values/문서 업데이트
  - `infra/deploy/values.malsori.yaml`: `BACKEND_ADMIN_ENABLED: "false"` 기본화
  - `scripts/post-deploy-smoke.sh`: admin off(404) / admin on(401 또는 token 제공 시 200) 분기 검증
  - `README.md`, `infra/deploy/README.md`: 운영 변수/보호 정책 문서화

## Review Checklist (Implementation Review)

- [x] 무인증 호출이 실제로 차단되는가(수동 curl 포함)?
- [x] 관리자 활성/비활성 전환 시 UI가 즉시 일관되게 반응하는가?
- [x] 스모크/CI에 보안 회귀 방지 검증이 포함되었는가?

## Verify

- `curl -skS -o /tmp/backend-endpoint.json -w "%{http_code}\n" https://<host>/v1/backend/endpoint`
- `curl -skS -H "X-Malsori-Admin-Token: <token>" -o /tmp/backend-endpoint-admin.json -w "%{http_code}\n" https://<host>/v1/backend/endpoint`
- `npm --prefix webapp test`
- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
- `python3 -m compileall python_api/api_server`
- `bash -n scripts/post-deploy-smoke.sh`
