# Admin Boundary + Reconnect Resilience Loop Plan (2026-03-06)

## Goal

현재 코드베이스의 운영 경계/실시간 복원력/Studio Console UX 결함을 다음 루프에서 정리한다.
이번 문서는 "현재 구현 truth"를 덮어쓰는 문서가 아니라, 다음 구현 사이클의 target spec이다.

## Inputs

이번 루프의 핵심 문제는 여섯 축이다.

1. public/internal ingress 분리 정책과 프런트의 단일 `apiBaseUrl` 모델이 충돌한다.
2. chart 기본값의 `/api` fallback이 실제 nginx 구성과 맞지 않아 fresh install 기본 경로가 깨진다.
3. realtime 세션 준비 순서와 reconnect buffer 정책이 약해 fast network / microphone failure / reconnect storm에서 잘못된 결과를 남길 수 있다.
4. camera capture가 transcription recorder와 별도의 audio track을 다시 획득한다.
5. settings operator UX가 safe default / manual intent / internal-only boundary를 충분히 반영하지 못한다.
6. empty-state copy와 mobile header density가 현재 Studio Console 방향 대비 덜 명확하다.

## User Decisions

- internal admin surface는 public API와 분리된 별도 URL을 사용한다.
- reconnect 중 음성은 tolerance budget 안에서 버퍼에 쌓고, 재연결 후 FIFO로 다시 보낸다.
- tolerance budget을 넘겨 드롭이 발생하면 session을 `degraded`로 표시한다.

## Canonical Decisions

### 1. API Surface Contract

- public API와 internal admin API는 별도 base URL을 가진다.
- public surface는 `apiBaseUrl`을 사용한다.
- internal-only surface는 `adminApiBaseUrl`을 사용한다.
- `/v1/backend/*`와 `/v1/observability/runtime-error`는 절대 public base URL로 호출하지 않는다.
- `adminApiBaseUrl`이 비어 있으면 operator 기능은 disabled 상태로 남고, runtime error telemetry도 전송하지 않는다.
- public API 기본값은 dead `/api` fallback이 아니라 same-origin root contract로 맞춘다.
- chart default와 SPA default는 fresh install 기준으로 self-consistent 해야 한다.

### 2. Operator Settings Contract

- `/settings`는 public settings와 internal operator settings를 시각적으로 구분한다.
- operator section은 다음 조건을 모두 만족할 때만 활성화한다.
  - `adminApiBaseUrl`이 설정되어 있음
  - public `/v1/health` 응답이 `backendAdminEnabled === true`를 명시함
- `backendAdminEnabled`가 응답에 없으면 기본값은 `false`다.
- admin token 입력은 component-local 상태로만 유지하고 persistent storage에 저장하지 않는다.
- admin 상태 조회/적용은 explicit button intent로만 실행한다. 입력 중 자동 fetch는 허용하지 않는다.

### 3. Realtime Transport Contract

- session 준비는 `prepareSession()` 단일 진입점을 유지하되, microphone/recorder 준비가 WebSocket connect보다 먼저 성공해야 한다.
- audio buffer는 `chunk count`가 아니라 `누적 duration` 기준으로 관리한다.
- reconnect tolerance budget은 transport 설정값으로 명시한다.
- tolerance budget 안의 buffered audio는 reconnect 성공 직후 FIFO로 재전송한다.
- tolerance budget을 초과해 drop이 발생하면 session에 `degraded` 신호를 올린다.
- degraded 판단은 절대량과 비율을 같이 본다.
  - 예: `droppedBufferedAudioMs >= 2000` 또는 `droppedBufferedAudioRatio >= 0.1`
- degraded 상태는 HUD/banner/chip에 노출하고, 세션 저장 시 metadata에도 남긴다.

### 4. Media Capture Contract

- realtime transcription의 canonical audio source는 recorder PCM stream 하나다.
- camera preview/capture는 기본적으로 `video`만 획득한다.
- session video artifact는 우선 silent capture를 허용한다.
- video artifact에 audio를 합치는 기능이 필요하면 후속 task에서 명시적 muxing 설계로 분리한다.
- 브라우저 permission prompt는 audio/video를 각각 예측 가능하게 요청해야 한다.

### 5. Status / Failure Contract

- upstream에서 예상하지 못한 status가 오면 이를 계속 `processing`으로 숨기지 않는다.
- unknown status는 최소한 user-visible failure state로 surface 하거나, raw status detail을 보존하는 `unknown` branch로 다룬다.
- session/connectivity degradation과 terminal failure는 별도 신호로 유지한다.

### 6. Visual Direction Contract

- Studio Console 다크 방향은 유지하되, 이번 루프의 시각 목표는 "경계의 명확화"다.
- public 작업 영역과 internal operator 영역은 배경/라벨/보조 설명으로 구분한다.
- empty-state copy는 위치 지시가 아니라 행동 지시를 사용한다.
- mobile header는 route 작업 맥락보다 global chrome가 앞서지 않도록 단순화한다.

## Design Direction

### Settings

- `Public API`와 `Internal Operator`를 별도 카드 군으로 분리한다.
- operator 영역에는 `Internal only` 배지, network boundary 설명, token-required 설명을 한 군데에 모은다.
- operator action은 `Check internal settings`, `Apply override`, `Reset to server default`처럼 verb-first로 유지한다.

### Realtime

- HUD는 `connection`, `latency`, `degraded`를 한 줄에서 스캔 가능하게 유지한다.
- reconnect 중에는 `buffering voice for replay` 상태를 분명히 보여준다.
- tolerance budget 초과 시 `degraded` 배지와 helper text를 즉시 노출한다.

### List / Global Chrome

- empty-state는 현재 CTA 2개를 유지하되, 설명 문구를 "지금 할 수 있는 일" 중심으로 교체한다.
- mobile top bar는 menu/title + 1~2 global controls 수준으로 줄이고, install CTA는 settings/help로 내린다.

## Work Breakdown

| ID | Priority | Theme | Primary outcome |
|---|---|---|---|
| T601 | P0 | Public/Internal API boundary split | `apiBaseUrl` / `adminApiBaseUrl` 분리 + self-consistent defaults |
| T602 | P0 | Realtime reconnect resilience | recorder-first prepare, duration-budget buffering, replay, degraded signaling |
| T603 | P1 | Operator settings hardening | safe default, manual refresh, internal-only UX boundary |
| T604 | P1 | Realtime media capture hardening | camera/audio capture source of truth 단일화 |
| T605 | P1 | Status normalization hardening | unknown upstream status/failure surfacing 개선 |
| T606 | P2 | Studio Console boundary polish | empty-state copy, mobile header density, operator/public 시각 경계 정리 |

## Definition of Done

- P0 완료 후 public/internal surface가 명시적으로 분리되고, realtime reconnect가 deterministic 하다.
- P1 완료 후 operator UX와 media/status handling의 safe default가 정리된다.
- P2 완료 후 public 작업 흐름과 operator 경계가 UI 카피/레이아웃에서 즉시 읽힌다.

## Self Review

- [x] user가 명시한 두 결정(별도 admin URL, buffered replay + degraded 표시)을 상위 contract에 반영했다.
- [x] infra/API/realtime/UX를 서로 충돌 없이 분리된 task로 나눴다.
- [x] 현재 구현 truth를 덮어쓰지 않고, 다음 루프 target spec으로 위치를 분명히 했다.
