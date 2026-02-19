# T003 - CI 품질 게이트 강화

## Spec

### 문제

- 현재 lint/test/build는 존재하지만, 번들 크기 회귀와 배포 스모크 조건이 강제되지 않는다.

### 목표

- main 진입 전에 품질 게이트를 명시적으로 강제해 회귀를 사전 차단한다.

### 범위

- 포함:
  - AppRouter 스모크 테스트를 기본 test 파이프라인에 유지
  - 번들 사이즈 budget 체크(청크 임계치)
  - (선택) 배포 스모크 결과 연계
- 제외:
  - 완전한 성능 테스트(웹 바이탈/실사용 메트릭)

### 수용 기준 (AC)

- [ ] PR에서 lint/test/build + bundle budget이 자동 검증된다.
- [ ] 임계치 초과 시 CI가 실패한다.
- [ ] 품질 게이트 문서가 팀 합의 기준으로 고정된다.

## Plan (Review 대상)

1. 현재 GitHub Actions 워크플로우 분석
2. 번들 리포트 파싱/임계치 검증 스크립트 추가
3. CI 단계에 budget check 추가
4. 실패 메시지에 액션 가이드(청크 분할/의존성 점검) 포함

## Review Checklist (Plan Review)

- [ ] 임계치가 현실적인가? (과도한 false positive 방지)
- [ ] 테스트 시간 증가폭이 허용 가능한가?
- [ ] 로컬에서도 동일 체크를 재현할 수 있는가?

## Implementation Log

- [ ] 스크립트 추가
- [ ] CI 연동
- [ ] 임계치 문서화

## Review Checklist (Implementation Review)

- [ ] 현재 빌드가 통과하는 임계치인가?
- [ ] 실패 시 원인 파악이 쉬운가?
- [ ] 유지보수 비용이 과도하지 않은가?

## Verify

- `cd webapp && npm run build`
- `node <bundle-budget-check>.mjs`
- GitHub Actions dry-run 또는 PR 검증
