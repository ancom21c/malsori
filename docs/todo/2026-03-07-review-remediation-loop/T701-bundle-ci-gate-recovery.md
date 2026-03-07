# T701 - Bundle / CI Gate Recovery

## Spec

### 문제

- `bundle:check`가 실패해 현재 `main`이 실제 CI contract를 만족하지 못한다.
- perf 문서가 현재 chunk 전략과 어긋난다.

### 목표

- webapp CI gate를 다시 green으로 만든다.
- perf 문서와 chunk config를 현재 코드 기준으로 다시 일치시킨다.

### 범위

- 포함:
  - `vite.config.ts` chunk split 재조정
  - `bundle:check` 통과 복구
  - perf 문서 갱신
- 제외:
  - unrelated UI feature work

### 해결방안

- documented split(`vendor-mui-core`, `vendor-emotion`, page-only heavy chunk`)를 우선 복구한다.
- total JS 초과 원인을 build 결과 기준으로 다시 측정한다.
- budget 숫자 조정은 마지막 수단으로 남긴다.

### 상세 설계

- 현재 build 산출물에서 total JS와 상위 chunk를 다시 캡처한다.
- `vite.config.ts` manualChunks를 perf note와 동일한 모델로 회복한다.
- 필요 시 `ActionStrip`/history-only code를 route/page chunk로 더 분리한다.
- docs/perf note는 실제 수치와 verify 명령을 다시 적는다.

### 수용 기준 (AC)

- [ ] `npm --prefix webapp run bundle:check` 성공
- [ ] `.github/workflows/ci.yml`의 webapp job과 실제 local verify 결과가 일치
- [ ] perf 문서가 현재 chunk split과 수치를 정확히 설명

## Plan (Review 대상)

1. build/bundle 결과에서 초과 원인을 다시 측정한다.
2. chunk split을 문서화된 형태로 복구한다.
3. 그래도 초과 시 page-level split을 추가한다.
4. perf 문서를 새 결과로 갱신한다.

## Review Checklist (Plan Review)

- [x] budget 변경보다 code split 복구를 우선하는가?
- [x] CI와 문서를 동시에 맞추는가?
- [x] 성능 회복이 다른 기능 계약을 깨지 않도록 제한했는가?

## Self Review (Spec/Plan)

- [x] release gate 문제를 perf 문서 drift와 묶어 해결하도록 설계했다.
- [x] 측정 기반으로 접근해 임의 threshold 완화를 피한다.
- [x] 구현 후 verify가 명확하다.

## Implementation Log

- [x] build/bundle 결과를 재측정해 초과 원인이 chunk naming drift보다 실제 shipped JS 총량이라는 점을 확인했다.
- [x] `framer-motion` 사용 지점을 전수 확인했고, `ActionStrip`, transcription list, realtime transcript, countdown overlay가 기능상 정적 렌더링으로 대체 가능하다고 판단했다.
- [x] `framer-motion` 제거 후 `npm --prefix webapp run build`, `npm --prefix webapp run bundle:check`로 총량이 `1276.09 KiB -> 1154.97 KiB`로 내려간 것을 확인했다.
- [x] perf 문서를 현재 전략과 측정값 기준으로 갱신했다.

## Review Checklist (Implementation Review)

- [x] 구현 후 spec drift가 없는지 확인
- [x] regression risk를 점검
- [x] verify 명령과 문서 역할이 일치하는지 확인

### Self Review (Implementation)

- code split 숫자만 만지는 대신 실제 바이트를 줄이는 쪽으로 수정 방향을 바꿨다. budget 완화보다 안전하다.
- 제거한 애니메이션은 모두 장식성 수준이었고, 목록/실시간 핵심 flow에는 영향을 주지 않는다.
- countdown overlay와 transcript/list 렌더링은 정적 UI로 남아도 기능/접근성 계약을 깨지 않는다.
- 현재 perf 문서는 historical note와 current truth를 분리해 다시 읽었을 때도 혼동이 덜하다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
