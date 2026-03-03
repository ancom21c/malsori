# T206 - README/API 계약 문구 모호성 제거

## Spec

### 문제

- README의 일부 설명이 현재 구현과 정확히 일치하지 않는다(예: token subprotocol 표현).
- `/v1/transcribe/{id}/audio`(로컬 아티팩트)와 RTZR upstream `/download` 개념 구분이 문서에서 모호하다.

### 목표

- 운영/개발자가 오해 없이 이해할 수 있게 API 계약 문구를 정밀화한다.
- cloud/onprem 경로 차이를 명시하고, 내부망 관리자 정책을 문서에 고정한다.

### 범위

- 포함:
  - 루트 README API/streaming 설명 정정
  - 필요한 경우 `infra/deploy/README.md`와 정책 문구 동기화
  - RTZR upstream endpoint vs malsori proxy endpoint 구분 표 추가
- 제외:
  - API 엔드포인트 자체 변경

### 해결방안

- README에 “프록시 계약” 표를 추가한다.
  - 브라우저 호출 경로
  - 프록시 내부 매핑 경로
  - upstream RTZR 경로
- streaming handshake/종료 시그널 규칙을 구현 기준으로 명시한다.
- 관리자 endpoint 정책(`내부망 + 토큰`)을 명확히 표기한다.

### 수용 기준 (AC)

- [x] README가 현재 코드 동작과 충돌하지 않는다.
- [x] `/audio`와 upstream `/download` 차이가 명시된다.
- [x] 관리자 정책 문구가 배포 문서와 일치한다.

## Plan (Review 대상)

1. README/infra 문서의 계약 관련 문구 전수 점검
2. 구현 기준으로 모호 문구 정정
3. 경로 매핑표 추가 및 예시 request/response 보강
4. 리뷰 후 문서 lint/링크 확인

## Review Checklist (Plan Review)

- [x] 문서가 코드보다 앞서거나 뒤처지지 않는가?
- [x] 운영자 관점에서 필요한 정보(보안/경로/예외)가 충분한가?
- [x] 중복 문서 간 상충 표현이 없는가?

## Implementation Log

- [x] `README.md` realtime/API 설명 정정
- [x] `README.md`에 proxy/upstream 경로 매핑표 추가
- [x] `infra/deploy/README.md` 내부망 관리자 정책 문구 동기화
- [x] 관련 todo/spec 문서와 구현 경로 매칭 점검

## Review Checklist (Implementation Review)

- [x] 문서와 실제 코드 라우트가 1:1 매핑되는가?
- [x] 보안 정책 문구가 누락되지 않았는가?
- [x] 온보딩 관점에서 이해 가능한 흐름인가?

## Verify

- [x] README 섹션 수동 리뷰
- [x] `rg -n`으로 경로/변수명 표기 일치 점검
