# T102 - Drive OAuth 상태/저장소 내구성 강화

## Spec

### 문제

- OAuth state를 프로세스 메모리에서만 관리하면 재시작/다중 파드에서 콜백 검증 실패 위험이 있다.
- 토큰/설정 저장이 비영속 스토리지면 재배포 시 연동 상태가 유실될 수 있다.

### 목표

- OAuth state 검증을 재시작/스케일 이벤트에 견디는 방식으로 바꾼다.
- 운영 기본값에서 Drive 관련 상태가 의도치 않게 사라지지 않도록 저장소 내구성을 확보한다.
- 운영 정책상 `재시작 후 토큰 유지`를 필수로 간주한다.

### 범위

- 포함:
  - OAuth state 생성/검증 메커니즘 개선
  - 토큰/override 저장 경로 영속화 정책 정립
  - helm values 기본값 정렬(운영 기준)
  - 장애 시 복구/로그 가시성 강화
- 제외:
  - Google Drive 연동 자체 UX 전면 개편
  - 외부 DB 신규 도입

### 해결방안

- Stateful OAuth state로 전환:
  - 메모리 dict 의존 제거
  - 서명 + TTL 기반 state(예: HMAC 서명 payload) 또는 영속 저장 nonce 검증으로 콜백 정합성 확보
- 저장소 정책 강화:
  - Drive 토큰/설정 저장 경로를 PVC 기반으로 고정
  - 운영 values에서 `storage.enabled=true`를 기본화
  - 저장소 비활성화 시 Drive 기능 비활성 또는 경고 fail-fast
- 운영 가시성:
  - state 검증 실패 사유를 구조화 로그로 기록(민감정보 제외)
  - `/v1/cloud/google/status`에 저장소 상태/모드 노출

### 수용 기준 (AC)

- [x] 재시작 직후에도 OAuth callback state 검증이 안정적으로 동작한다.
- [x] 운영 배포에서 Drive 토큰/설정이 파드 재생성 후 유지된다.
- [x] 저장소 미구성 상태가 로그/API에서 명확히 식별된다.

## Plan (Review 대상)

1. 현재 state 생성/소비 경로와 저장 데이터 목록 정리
2. state 검증 방식(서명형 vs 영속 nonce형) 선택 및 위협모델 리뷰
3. 저장소 경로/PVC 설정값과 helm 기본값 정렬
4. 상태 API와 로그 포맷 보강
5. 재시작/스케일 시나리오 스모크 케이스 추가

## Review Checklist (Plan Review)

- [x] CSRF/replay 방어가 기존 대비 약화되지 않는가?
- [x] 저장소 영속화가 운영 비용/복잡도를 과도하게 올리지 않는가?
- [x] 장애 시 임시 우회(runbook)가 준비되어 있는가?

## Implementation Log

- [x] OAuth state 검증 로직 교체
  - `python_api/api_server/google_drive_oauth.py`: 메모리 state dict 제거, HMAC 서명+TTL 기반 stateless state 도입
  - callback에서 state 서명/TTL/session 검증 및 구조화 경고 로그 추가
- [x] 저장소 설정/helm 값 반영
  - `infra/charts/malsori/templates/deployment.yaml`: `STT_STORAGE_PERSISTENT` 자동 주입
  - `infra/deploy/values.malsori.yaml`: `pythonApi.storage.enabled=true` 기본화
  - `python_api/api_server/config.py`: `STT_STORAGE_PERSISTENT`, `GOOGLE_OAUTH_ALLOW_EPHEMERAL_STORAGE` 반영
- [x] 상태 API/로그 및 문서 업데이트
  - `python_api/api_server/google_drive_oauth.py`: `/v1/cloud/google/status`에 `storage_persistent`, `configuration_warning` 노출
  - `README.md`, `infra/deploy/README.md`: OAuth state secret/저장소 정책 문서화

## Review Checklist (Implementation Review)

- [x] 단일 파드/다중 파드/재시작 시나리오에서 콜백 성공률이 안정적인가?
- [x] 토큰 파일 권한/마스킹/백업 정책이 적절한가?
- [x] 기능 비활성 fallback이 사용자에게 명확히 안내되는가?

## Verify

- `python3 -m compileall python_api/api_server`
- `npm --prefix webapp test`
- `npm --prefix webapp run build`
- `bash -n scripts/post-deploy-smoke.sh`
- 배포 후 확인(다음 단계):
  - `kubectl -n malsori rollout restart deploy/malsori-api`
  - `curl -skS https://<host>/v1/cloud/google/status | jq`
  - OAuth 로그인 플로우 수동 확인(재시작 전/후)
