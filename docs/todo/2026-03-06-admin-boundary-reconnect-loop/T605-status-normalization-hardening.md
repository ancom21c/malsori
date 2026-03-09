# T605 - Status Normalization and Failure Surfacing Hardening

## Spec

### 문제

- unknown upstream transcription status가 모두 `processing`으로 눌려 terminal failure가 숨겨질 수 있다.
- 사용자는 실제 실패/미지원 상태를 끝없이 진행중으로 오해할 수 있다.

### 목표

- 예상하지 못한 upstream status도 user-visible 상태로 surface 한다.
- raw upstream signal을 보존하면서도 UI가 안전한 기본값을 유지하게 만든다.

### 범위

- 포함:
  - client status normalization contract 재정의
  - unknown/raw status detail 보존 방식 정리
  - UI failure surfacing/copy 정리
- 제외:
  - upstream API 자체 변경

### 해결방안

- client normalization은 unknown status를 그대로 `processing`으로 숨기지 않는다.
- 최소안은 `failed`로 승격하고 raw status detail을 metadata/error에 보존하는 것이다.
- 가능하면 `unknown` branch를 별도 detail signal로 보존하되, list/detail UI가 이를 읽을 수 있게 만든다.

### 상세 설계

- status normalization helper에서 raw status를 별도 필드로 반환하거나 metadata에 저장한다.
- list/detail/status chip은 `unsupported status` 또는 `unknown upstream status` copy를 표시할 수 있어야 한다.
- 로그/telemetry에는 raw status를 남겨 디버깅 가능해야 한다.
- 기존 known statuses에는 회귀가 없어야 한다.

### 수용 기준 (AC)

- [ ] unknown upstream status가 무기한 `processing`으로 보이지 않는다.
- [ ] raw upstream status detail이 디버깅 가능한 형태로 보존된다.
- [ ] list/detail 화면에서 사용자에게 오해 없는 상태 문구를 제공한다.

## Plan (Review 대상)

1. current status normalization path를 inventory로 정리한다.
2. `failed + raw detail` 또는 `unknown branch` 중 최소 회귀 경로를 결정한다.
3. list/detail/status chip copy를 새 contract에 맞게 정리한다.
4. regression test를 추가한다.

## Review Checklist (Plan Review)

- [x] 사용자에게 "진행중으로 보이지만 사실 실패"인 상태를 줄이는 방향인가?
- [x] raw upstream status를 잃지 않도록 디버깅 경로를 남겼는가?
- [x] 기존 known status UX를 깨지 않는 최소 변경 경로를 택했는가?

## Self Review (Spec/Plan)

- [x] 작은 task지만 운영 오류 인지를 크게 개선한다.
- [x] backend를 크게 바꾸지 않고 client contract 중심으로 해결 가능하다.
- [x] T602 degraded signaling과 겹치지 않도록 범위를 분리했다.

## Implementation Log

- [x] status normalization inventory 작성
- [x] unknown/raw status contract 반영
- [x] list/detail/status copy 조정
- [x] regression test 추가

### 구현 메모

- client normalization을 `failed + rawStatus + statusReason` 계약으로 바꿨다.
- local transcription metadata에 `upstreamStatusRaw`, `upstreamStatusReason`를 저장한다.
- list/detail 화면에 unknown upstream status surfacing을 추가했다.
- request submit response와 polling response 둘 다 regression test로 고정했다.

## Review Checklist (Implementation Review)

- [x] unknown status가 processing으로 fallback되지 않는지 확인
- [x] raw detail이 디버깅 가능한 형태로 남는지 확인
- [x] known status chip/filters가 회귀하지 않는지 확인

## Self Review (Implementation)

- [x] unknown status를 `processing`으로 숨기지 않고 terminal failure로 승격해 polling stuck 상태를 끊었다.
- [x] request submit 응답이 이미 unknown/failure일 때 success snackbar를 띄우던 문제도 함께 정리했다.
- [x] raw upstream status는 detail chip과 local metadata 양쪽에 남겨 디버깅 경로를 확보했다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run test -- rtzrApiClient`
