# T604 - Realtime Media Capture Source-of-Truth Hardening

## Spec

### 문제

- camera preview/capture가 transcription recorder와 별도의 audio track을 다시 획득한다.
- 브라우저에 따라 mic 재요청/경합/실패가 날 수 있고, video artifact의 audio와 STT audio가 어긋날 수 있다.

### 목표

- realtime audio source of truth를 하나로 고정한다.
- camera preview/capture는 transcription correctness를 훼손하지 않는 방식으로 단순화한다.

### 범위

- 포함:
  - camera `getUserMedia` 요청에서 audio track 정책 정리
  - session video artifact semantics 정리
  - permission prompt 경로 정리
- 제외:
  - post-session muxing/encoding 고도화

### 해결방안

- camera preview는 기본적으로 `video`만 요청한다.
- recorder PCM stream이 transcription canonical audio이며, session video는 우선 silent artifact로 저장한다.
- UI copy는 "video is supplementary"를 분명히 한다.
- future muxing이 필요하면 별도 spec/task로 분리한다.

### 상세 설계

- `cameraEnabled` flow는 `getUserMedia({ video, audio: false })` 또는 `video` only constraint로 맞춘다.
- permission copy는 audio permission과 camera permission을 분리해서 안내한다.
- detail page/video preview는 audio presence를 metadata 기준으로 표현한다.
- 테스트/문서에서는 "camera on does not imply second mic capture"를 명시한다.

### 수용 기준 (AC)

- [ ] camera 활성화가 별도 microphone contention을 만들지 않는다.
- [ ] session transcription audio source는 recorder PCM 하나로 유지된다.
- [ ] UI copy가 video의 보조적 성격을 정확히 설명한다.

## Plan (Review 대상)

1. current camera/media capture flow와 artifact expectations를 inventory로 정리한다.
2. camera stream request를 video-only contract로 단순화한다.
3. detail/realtime copy를 artifact semantics에 맞게 조정한다.
4. permission/capture smoke 기준을 정리한다.

## Review Checklist (Plan Review)

- [x] transcription correctness를 video completeness보다 우선하는 결정이 분명한가?
- [x] browser permission friction을 줄이는 방향인가?
- [x] future muxing 요구를 현재 task 범위 밖으로 명확히 분리했는가?

## Self Review (Spec/Plan)

- [x] 현재 결함의 핵심인 duplicate audio capture를 정확히 겨냥한다.
- [x] task 결과가 T602의 transport correctness를 방해하지 않는다.
- [x] 사용자 기대와 artifact semantics의 차이를 카피/문서까지 포함해 정리한다.

## Implementation Log

- [x] camera/media capture inventory 작성
- [x] video-only capture contract 반영
- [x] UI copy / artifact semantics 조정
- [x] capture smoke note 작성

### 구현 메모

- camera preview/capture의 `getUserMedia()`를 `audio: false`로 바꿨다.
- session video MIME 후보를 video-only codec 우선으로 정리했다.
- realtime screen과 detail screen 모두에 "session video is supplementary" 카피를 반영했다.

## Review Checklist (Implementation Review)

- [x] camera on/off 시 microphone 재획득 문제가 없는지 확인
- [x] saved video artifact semantics가 화면 문구와 맞는지 확인
- [x] permission failure 시 recovery copy가 여전히 이해 가능한지 확인

## Self Review (Implementation)

- [x] duplicate audio capture 제거에 집중하고, post-session muxing 같은 후속 범위는 건드리지 않았다.
- [x] detail page notice를 추가해 silent/supplementary video artifact semantics를 화면에서도 바로 설명한다.
- [x] T602와 충돌하지 않도록 transcription audio source는 recorder PCM 하나로 그대로 유지했다.

## Verify

- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] realtime camera smoke note 작성
