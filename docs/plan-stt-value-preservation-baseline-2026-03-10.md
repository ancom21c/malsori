# STT Value Preservation Baseline (2026-03-10)

> Status: current preservation baseline for Soniox-inspired workspace expansion. New workspace features must remain additive to this contract.

## Goal

`malsori`는 현재 shipped STT 가치가 먼저다.  
workspace, artifact, translate, future TTS 확장은 모두 이 baseline을 통과하는 additive change여야 한다.

## Core User Value

다음 4개가 현재 제품의 핵심 가치다.

1. 파일 전사를 요청하고, 상태를 확인하고, 상세 결과를 다시 열 수 있다.
2. 실시간 전사를 시작하고, 재연결 중에도 가능한 한 수집을 유지하고, 종료 후 세션을 저장할 수 있다.
3. 세션 상세에서 transcript를 읽고, seek/play/export/share 같은 핵심 작업을 계속 수행할 수 있다.
4. 설정 화면에서 core STT 연결과 preset/runtime behavior를 조정할 수 있다.

신규 workspace feature는 이 4개를 대체하면 안 된다.

## Preservation Matrix

| Surface | Current user value | Must not regress | Additive rule |
|---|---|---|---|
| File capture | 업로드, preset 선택, pending/ready/failed 상태 확인 | 업로드 실패율, polling, 상세 진입 | summary/search/artifact는 detail rail로 추가 |
| Realtime capture | mic permission, countdown, stream start, reconnect, stop/save | mobile viewport, transcript viewport, transport dock | translate/note/search는 secondary layer로 추가 |
| Session detail | transcript reading, audio playback, segment correction, export/share | blank screen, h1/route/detail loading states, playback controls | summary/ask/search rail을 additive로 붙임 |
| Settings | API base, admin/operator path, preset CRUD | draft/save contract, internal-only admin boundary | backend profile/binding UI는 operator tools 안에 추가 |

## Golden Paths

### 1. File transcription

1. 사용자가 업로드 dialog를 연다.
2. 파일과 preset/config를 선택한다.
3. local row가 생성되고 polling이 상태를 갱신한다.
4. ready/failed 상태에서 detail로 이동 가능해야 한다.

### 2. Realtime transcription

1. 사용자가 realtime 화면을 연다.
2. 권한을 확보하고 session을 시작한다.
3. reconnect/degraded가 발생해도 source transcript 수집은 가능한 한 유지한다.
4. 중지 후 local session detail로 안정적으로 이동한다.

### 3. Session detail

1. list 또는 direct route로 detail을 연다.
2. transcript를 읽고, 필요한 경우 seek/play/edit/share/export를 수행한다.
3. additive rail이 실패해도 transcript core는 계속 usable해야 한다.

### 4. Settings / operator

1. public connection/preset 설정을 저장할 수 있다.
2. internal operator surface는 별도 boundary 안에서만 동작한다.
3. backend binding/operator 기능 실패가 public STT flow를 깨면 안 된다.

## Mobile Realtime Guardrail

mobile realtime는 별도 hard constraint다.

1. transcript viewport는 fixed/flex ownership 아래에서 내부 스크롤만 사용한다.
2. transport dock는 transcript 증가에 밀려 내려가면 안 된다.
3. viewport/PWA/system bar 처리 실패가 신규 feature보다 우선적으로 회귀로 간주된다.
4. quality/status/options는 transcript와 경쟁하지 않는 compact rail/sheet 형태를 유지한다.

## Failure Isolation Rules

1. summary failure는 artifact failure다. transcription failure처럼 보이면 안 된다.
2. translate failure는 variant failure다. source transcript 수집을 막으면 안 된다.
3. operator binding/profile misconfiguration은 operator failure다. public STT surface에 즉시 전이되면 안 된다.
4. 신규 workspace feature의 hidden/disabled state는 정상 상태다. core STT와 같아 보이면 안 된다.

## Smoke Anchors

다음은 모든 expansion 단계에서 유지되는 최소 anchor다.

### Route / shell

- `/`
- `/realtime`
- `/settings`
- `/transcriptions/:id`

### Additive alias compatibility

- `/sessions`
- `/capture/realtime`
- `/sessions/:id`

### API / policy

- `/v1/health`
- `/v1/transcribe`
- `/v1/streaming`
- public/internal `/v1/backend/*` policy
- public `/v1/observability/runtime-error` policy

### UX / runtime

- page error 0
- console error 0
- mobile realtime transcript viewport ownership 유지
- detail blank screen 없음

## Rollback Anchor

확장 기능 rollback은 항상 아래 순서로 수행한다.

1. additive feature flag off
2. additive capability/binding off
3. legacy/core STT route로 복귀

rollback이 core STT 저장 구조나 route를 제거하는 방식이면 안 된다.

## Release Gate Mapping

이 baseline을 지키는 최소 게이트는 다음이다.

- `npm --prefix webapp run lint`
- `npm --prefix webapp run i18n:check`
- `npm --prefix webapp run build`
- `npm --prefix webapp run bundle:check`
- `npm --prefix webapp run test`
- `./scripts/post-deploy-smoke.sh`

## Notes

- 이 문서는 feature roadmap이 아니라 no-regression contract다.
- Soniox-inspired UI/feature task는 모두 이 baseline을 참조해야 한다.
