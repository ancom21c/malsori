# RTZR Web STT App — Agents & Collaboration Charter

## 1. 프로젝트 개요
- **목표**: RTZR STT File/Streaming API를 활용해 안드로이드 폰 및 일반 웹브라우저에서 동작하는 100% 프런트엔드 웹앱을 구축한다.
- **핵심 기능**: 파일 전사 업로드, 실시간 전사(스트리밍), 전사 결과 열람/재생, 설정 프리셋 관리, 로컬 저장/다운로드.
- **참고 구현**: `rtzr/rtzr-tools` 저장소의 `vitospeech-qc-webapp` (Next.js + MUI + react-query 패턴)에서 UX, API 래핑, 설정 편집 UI 방식을 벤치마킹한다.

## 2. 필수 참고 자료
- 일반 STT API 명세: https://developers.rtzr.ai/docs/stt-file/
- 스트리밍 STT API 명세: https://developers.rtzr.ai/docs/stt-streaming/
- 레퍼런스 앱: https://github.com/rtzr/rtzr-tools/tree/main/vitospeech-qc-webapp

## 3. 제약 및 전제
- **서버 미사용**: 모든 로직은 브라우저에서 수행. API 토큰은 사용자가 직접 입력하고 브라우저 내 저장(선택적 암호화).
- **스토리지**: 전사 메타데이터, 설정, 녹음/업로드 파일은 IndexedDB(Dexie/localForage) 사용.
- **네트워크**: Fetch + WebSocket만 사용. gRPC는 브라우저 제약으로 불가, WebSocket 프로토콜 선택.
- **오디오 처리**: Web Audio API + MediaRecorder/AudioWorklet로 16kHz PCM(또는 Opus) 스트리밍. 실패 대비 로컬 백업 필수.
- **UX**: MUI 또는 유사한 컴포넌트 라이브러리를 활용해 QC Webapp과 유사한 사용자 흐름 제공.
- **오프라인/에러 대응**: 스트리밍 중단, 네트워크 오류 시 상태 복원 및 파일 보존.

## 4. 주요 화면 & 기능 매핑
- **전사 목록 화면**: 파일/실시간 전사 로그 시간순 표시, 상태 뱃지, 검색/필터, 무한 스크롤 또는 페이지네이션. IndexedDB 동기화 + API 상태 업데이트.
  - 삭제 플로우: 일반 전사는 서버 기록만 제거, 실시간 전사는 연동된 IndexedDB 오디오 블랍·메타데이터까지 일괄 삭제.
- **전사 상세 화면**: 말풍선 UI에 화자 구분, 발화 시간, 텍스트 표시. 오디오 Waveform/Timeline 연동, 구간 선택 재생. (파일 다운로드/삭제/설정 정보 노출 포함)
- **설정 관리 화면**: 파일 STT 설정 프리셋, 스트리밍 STT 설정 프리셋을 각각 CRUD. JSON 편집 + 폼 기반 보조 입력. 프리셋 적용/복제 기능.
- **파일 전사 플로팅 버튼**: FAB → 모달. 파일 업로드, 적용할 일반 STT 설정 선택, API 요청/진행 상태 표시, 오류 처리.
- **실시간 전사 버튼 & 화면**:
  - 3초 카운트다운 후 Recorder 시작.
  - 일정 주기(n초, 기본 10초 가정)로 녹음 조각을 IndexedDB에 임시 저장.
  - WebSocket 스트림 관리 (Partial/Final 결과 → 말풍선 실시간 출력).
  - 종료 버튼 → 스트림 닫기, 최종 파일 조합 → 전사 결과 화면으로 이동.
  - 비정상 종료 시에도 임시 파일 유지 및 복구 옵션 제공.
- **전사 목록과 상세 간 내비게이션**: React Router/SPA 패턴. 모바일 반응형 고려.
- **토큰/환경 설정**: 별도 모달 또는 Settings Drawer에서 API Base URL, 토큰, 샘플 레이트 등 전역 옵션 관리.

## 5. 에이전트 구성 및 역할
- **Product/UX Agent**
  - 페르소나/시나리오 정의, 우선순위 도출, QA 웹앱 UX 패턴 리서치.
  - 와이어프레임, 사용자 플로우, 모달/FAB 상호작용 명세화.
- **Platform Architect Agent**
  - 기술 스택 확정(Vite + React + TypeScript + MUI + React Query + Dexie 제안).
  - 모듈 구조, 상태 관리(Zustand/Redux 여부), 라우팅 전략 문서화.
  - PWA/서비스워커 여부 및 보안(토큰 저장 정책) 정의.
- **API Integrator Agent**
  - File STT REST 호출 래퍼, 폴링 로직, 에러 맵핑.
  - 스트리밍 WebSocket 세션 관리, 프로토콜(payload format, keepalive) 분석 및 추상화.
  - 인증 토큰 갱신 절차 및 실패 대응 설계.
- **Audio/Realtime Agent**
  - MediaDevices 권한, 샘플레이트 변환, AudioWorklet 기반 버퍼링/인코딩.
  - 실시간 결과 처리 파이프라인 조정(partial → final 전환).
  - 전사 종료 및 비정상 종료 시 파일 조립/저장 로직.
- **Data Persistence Agent**
  - IndexedDB 스키마 설계(Transcription, Segments, Settings, AudioBlobs).
  - 마이그레이션/정리 전략, 용량 관리, 파일 다운로드 구현.
- **Sharing & Security Agent**
  - 공유 페이지를 그대로 보고 듣는 UX 설계, 오디오 포함 여부 토글 및 로컬 뷰 재현 흐름 설계.
  - 공유 토큰/URL 관리, 암호 설정/해제 흐름, 콘텐츠 암호화(IndexedDB/Blob 암호화 키) 및 복호화 UX.
  - 공유 콘텐츠를 내 목록에 추가하는 퍼블리셔-신규 레코드 생성, 실시간 공유(WebRTC 멀티미디어 방) 연결 관리.
  - 화면 녹화/캡처된 세션 또는 실시간 세션에 대한 공유와 보안 정책 일관성 확보.
- **Model & Device Agent**
  - 온디바이스/인브라우저 모델(Whisper, Gemma3n 등) 실행 전략, WebWorker/WebAssembly 기반 추론 흐름, 메모리/성능 예측.
  - 폴백/우선순위 정책(로컬 모델 vs 클라우드 STT) 및 폼/환경 설정 반영.
  - 스크린 녹화나 영상/멀티채널 입력이 들어올 때 로컬 모델과 서버 모델 전환 시나리오 정의.
- **Frontend Engineer Agent**
  - 페이지/컴포넌트 구현, 상태 연동, 접근성(A11y) 체크.
  - MUI 테마, 반응형, 다국어(ko/en) 토글 여부 결정.
- **QA & Tooling Agent**
  - 테스트 전략 (단위/통합/E2E smoke), 음성 Mock 데이터 준비.
  - 린트/포맷/CI 시나리오(가능시 GitHub Actions) 정의.
  - 에러 로깅(브라우저 console + optional Sentry) 가이드.
- **Documentation & Release Agent**
  - 차후 산출물(Requirements.md, Architecture.md, API.md, Testing.md) 템플릿 준비.
  - 사용자 가이드(토큰 입력, 설정 프리셋 내보내기/가져오기) 작성 계획.
  - 릴리즈 체크리스트 및 버전 태깅 방안.

## 6. 확장 기능 & 기술 검토
- **레코드별 고유 ID**: 꼭 필요한 메타데이터(ShareToken, SourceType, CreatedAt)를 포함한 GUID/ULID를 도입해 IndexedDB, 공유 URL, 동기화 파이프라인에서 참조 및 병합 기준으로 활용.
- **공유 UX & 보안**: 공유된 페이지는 원본 뷰를 그대로 재현하되 오디오 포함 여부를 토글 가능하게 하고, 공유 토큰은 pageId+version을 포함. 공유 받으면 로컬 목록에 레코드 복제와 사용자 동기화, 암호 설정 시 AES-GCM/LKDF로 콘텐츠(텍스트+audio blob)를 암호화/복호화하고 키는 사용자가 입력한 패스워드로 유도.
- **실시간 공유(공유 WebRTC 룸)**: 방송자/참여자를 WebRTC SFU(Room)로 묶고, Audio/Data 채널을 실시간 스트림에 연결. 실시간 공유 방은 STT 스트림과 Playback 스트림을 동시에 구독하며, 기존 실시간 전사 세션을 그대로 링크하여 말풍선·타임라인 재생.
- **비디오 파일 지원**: 업로드/실시간 세션에 영상(예: mp4)을 허용하고, 트랙 추출(오디오/비디오)과 연결된 Waveform/Canvas 재생기 구성, 메타데이터에는 비디오 속성(프레임레이트, orientation) 저장.
- **화자 이름 관리**: 설정에서 "기본 화자 이름"을 정의할 수 있도록 하고, 전사 결과에서 화자 구분/추가 UI를 열어 실시간/파일 전사 모두에서 이름 수정·추가·삭제 가능하도록. 변경사항은 동기화 및 공유된 세션에도 반영.
- **화면 녹화/캡처**: 화면+오디오 캡처 옵션을 추가해 MediaStream을 받아 전사/공유, WebRTC 실시간 공유 및 공유 페이지 재생용 소스로 연결. 캡처 세션은 IndexedDB에 segment 단위로 저장해 끊어진 세션 복구.
- **온디바이스/인브라우저 모델(Whisper, Gemma3n)**: WebAssembly/WebWorker 기반 Whisper/Gemma3n 런타임을 도입해 네트워크가 없을 때에도 전사 처리. 대용량 멀티채널은 클라이언트 병렬 워커로 분산하고, 인증/속도 제약에 따라 로컬 모델 vs 서버 STT 자동 판별. 모델 상태는 설정 프리셋에 노출해 사용자가 선택할 수 있게 함.

## 7. 협업 플로우
1. **Discovery**: Product/UX + Architect가 요구사항 세부화, 정보구조 설계.
2. **Architecture Sign-off**: Architect → API/Audio/Data 에이전트가 기술 검증, 프로토타입 계획.
3. **Design & Spec**: UX → 컴포넌트 스펙, API Integrator → OpenAPI/WS payload 문서화.
4. **Implementation Sprints**:
   - Sprint 1: 토큰/설정 UI + 파일 전사 기본 흐름.
   - Sprint 2: 전사 상세 뷰 + 오디오 플레이백 + 설정 프리셋 CRUD.
   - Sprint 3: 실시간 전사(녹음, 스트리밍, 복구) + IndexedDB 백업.
5. **Stabilization**: QA Agent가 테스트, 버그 이슈 정리. Audio/Data Agent와 함께 복구/에러 플로우 점검.
6. **Delivery**: Documentation Agent가 사용자 가이드 배포, Product가 최종 리뷰.

## 8. 기술 리스크 & 오픈 이슈
- API WebSocket 프로토콜 상세(메시지 포맷, 인증, keepalive) 추가 확인 필요.
- 브라우저에서 JWT 보관 시 보안 리스크 → 안전한 저장 UX 옵션(세션만 저장 vs 암호화) 결정.
- 긴 실시간 세션(>1h) 저장 시 IndexedDB 용량 및 메모리 관리 전략 수립.
- 모바일(안드로이드 크롬) 마이크 권한, 화면 꺼짐 시 녹음 지속 여부 테스트 필요.
- 오디오 구간 재생 구현 방식(HTMLAudioElement vs Web Audio) 선택 및 성능 검증.

## 9. 다음 산출물 제안
- `REQUIREMENTS.md`: 사용자 요구사항/유스케이스 명세.
- `ARCHITECTURE.md`: 모듈 구조, 데이터 플로우, 상태 다이어그램.
- `UX-FLOWS.md` 또는 피그마 링크: 화면 전환/상호작용.
- `API-ADAPTER.md`: STT REST/WS 래퍼 인터페이스 정의.
- `TEST-STRATEGY.md`: QA 플랜 및 시나리오.

---
에이전트들은 위 합의된 역할과 플로우를 바탕으로 다음 단계(요구사항/아키텍처 상세화) 산출물 작성을 시작한다.
