# T702 - Local Dev API Contract Alignment

## Spec

### 문제

- README는 dev에서 `/api` proxy를 기본으로 안내하지만, runtime default는 `/`다.
- Vite는 `/api`만 proxy하고 `/v1`는 proxy하지 않는다.
- fresh local dev에서 기본 실행 경로가 self-consistent 하지 않다.

### 목표

- local dev와 production contract를 같은 mental model로 정리한다.
- fresh `npm run dev`에서 manual settings 변경 없이 API에 도달하게 만든다.

### 범위

- 포함:
  - Vite dev proxy 계약 정리
  - README/dev 안내 갱신
  - runtime default와 dev contract 정렬
- 제외:
  - production ingress 구조 변경

### 해결방안

- public runtime base는 계속 `/`를 canonical로 둔다.
- dev server가 `/v1/*`를 backend로 proxy하도록 맞춘다.
- 필요 시 `/api`는 legacy alias로만 유지하되, docs default는 `/` 하나로 통일한다.

### 상세 설계

- `normalizePublicApiBaseUrl`와 settings default는 그대로 `/` 유지 가능하다.
- `vite.config.ts`에 `/v1` proxy를 추가한다.
- README의 dev 설명은 `/api` 문구를 제거하고 `/` 기준으로 재작성한다.
- local visual review note도 새 계약 기준으로 다시 적는다.

### 수용 기준 (AC)

- [ ] fresh local dev에서 default API base로 `/v1/health` 호출이 동작
- [ ] README, runtime default, Vite proxy가 같은 계약을 설명
- [ ] production same-origin `/` contract는 유지

## Plan (Review 대상)

1. dev/prod/public/internal 경로 계약을 표로 정리한다.
2. default를 하나로 고정한다.
3. backward compatibility가 필요하면 alias만 남긴다.
4. README 예시를 새 계약으로 바꾼다.

## Review Checklist (Plan Review)

- [x] production contract를 흐리지 않는가?
- [x] dev-only 예외를 줄이는가?
- [x] README와 코드가 다시 어긋나지 않도록 단일 source를 택했는가?

## Self Review (Spec/Plan)

- [x] `/` canonical + `/v1` dev proxy가 가장 일관된 모델이다.
- [x] `/api` default 유지보다 환경별 mental model 차이를 줄일 수 있다.
- [x] 문서 drift까지 함께 해결한다.

## Implementation Log

- [ ] 구현 전

## Review Checklist (Implementation Review)

- [ ] 구현 후 spec drift가 없는지 확인
- [ ] regression risk를 점검
- [ ] verify 명령과 문서 역할이 일치하는지 확인

## Verify

- [ ] 구현 후 검증 명령 기록
