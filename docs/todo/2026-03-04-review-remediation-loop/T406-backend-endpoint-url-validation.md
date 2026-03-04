# T406 - Backend endpoint URL 입력/저장 검증 강화

## Spec

### 문제

- backend override API는 `api_base_url`을 non-empty 문자열로만 확인해, 형식이 잘못된 URL이 저장될 수 있다.
- 잘못 저장된 값은 이후 API 호출 실패/운영 장애로 이어질 수 있다.

### 목표

- backend endpoint URL을 API/프론트 양쪽에서 엄격 검증해 잘못된 설정 저장을 차단한다.

### 범위

- 포함:
  - 서버측 URL 스키마 검증(`http/https`, host 포함)
  - 프론트 폼 선검증 및 오류 피드백 개선
  - 오류 코드/문구 문서 정리
- 제외:
  - endpoint reachability 실시간 헬스체크 시스템 도입

### 해결방안

- `BackendEndpointUpdateRequest`에 URL validator를 추가한다.
- 서버는 형식 불일치 시 명시적 오류 코드(`BACKEND_API_BASE_INVALID`)를 반환한다.
- 프론트에서 동일 규칙 선검증 후 사용자에게 즉시 안내한다.

### 수용 기준 (AC)

- [ ] 잘못된 URL 형식은 서버 저장 단계에서 4xx로 거부된다.
- [ ] 프론트에서 저장 전 검증 에러를 즉시 보여준다.
- [ ] 정상 URL은 기존과 동일하게 적용된다.

## Plan (Review 대상)

1. 허용 URL 규칙(스킴, 호스트, trailing slash 처리)을 확정한다.
2. 서버 validator와 오류 계약을 정의한다.
3. 프론트 선검증과 메시지 매핑을 추가한다.
4. 단위 테스트/문서 업데이트를 수행한다.

## Review Checklist (Plan Review)

- [ ] cloud/onprem 두 배포 모드 모두 규칙과 호환되는가?
- [ ] 기존 저장 데이터와 충돌 시 마이그레이션 필요가 없는가?
- [ ] 오류 코드가 프론트 메시지와 일관 매핑되는가?

## Implementation Log

- [ ] `python_api/api_server/models.py` URL validator 추가
- [ ] `python_api/api_server/main.py` 오류 계약 정리
- [ ] `webapp/src/pages/SettingsPage.tsx` 선검증/메시지 반영

## Review Checklist (Implementation Review)

- [ ] 비정상 URL 케이스가 모두 차단되는가?
- [ ] 정상 URL 적용 흐름이 회귀하지 않는가?
- [ ] 테스트가 경계값 케이스를 커버하는가?

## Verify

- [ ] API 단위 테스트 또는 curl 검증
- [ ] `npm --prefix webapp run lint && npm --prefix webapp run build`
- [ ] `python3 -m compileall python_api/api_server`
