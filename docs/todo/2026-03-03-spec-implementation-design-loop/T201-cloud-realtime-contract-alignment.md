# T201 - Cloud Realtime 계약 정렬 (RTZR spec)

## Spec

### 문제

- RTZR realtime 가이드와 현재 cloud 경로 구현 간 핸드셰이크/종료 시그널 처리 방식이 충돌할 수 있다.
- 현재 클라이언트는 ACK 의존(`STREAM_ACK_TIMEOUT`)인데, 서버가 ACK를 주지 않는 환경에서는 재연결 루프 위험이 있다.
- Python API cloud 프록시는 브라우저 `start` 메시지를 업스트림으로 그대로 전달해, 쿼리 기반 설정 계약과 충돌 가능성이 있다.

### 목표

- RTZR 공식 realtime 계약과 malsori 브라우저-프록시-업스트림 흐름을 일치시킨다.
- ACK 유무와 무관하게 예측 가능한 연결 성공/실패 기준을 제공한다.
- 종료 시그널(`final`/`EOS`) 처리 규칙을 단일화한다.

### 범위

- 포함:
  - `python_api/api_server/main.py` cloud streaming relay 프로토콜 정렬
  - `python_api/api_server/stt_client.py` cloud streaming URL/config 적용 정렬
  - `webapp/src/services/api/rtzrStreamingClient.ts` handshake 상태기계 보강
  - 관련 테스트/문서 갱신
- 제외:
  - on-prem gRPC 프로토콜 전면 재설계
  - 오디오 인코딩 파이프라인 재작성

### 해결방안

- 브라우저 내부 프로토콜과 RTZR 업스트림 프로토콜을 분리한다.
  - 브라우저는 `start`/binary/`final` 유지
  - cloud 프록시는 decoder config를 쿼리로 변환해 업스트림 연결
  - 필요 시 `final`을 업스트림 `EOS`로 매핑
- handshake 완료 조건을 다중 조건으로 허용한다.
  - explicit `ready` ACK 수신
  - 또는 첫 정상 recognition payload 수신
- ACK 타임아웃은 cloud/onprem 모드별 정책값으로 분리한다.

### 수용 기준 (AC)

- [ ] cloud 모드에서 ACK 부재 서버에서도 세션 시작이 정상 동작한다.
- [ ] 정상 종료 시 final 텍스트 누락 없이 세션이 닫힌다.
- [ ] 실패 시 사용자 메시지가 `재시도 가능/불가`를 구분해 안내한다.

## Plan (Review 대상)

1. RTZR realtime 문서 기준 최소 계약(연결, 메시지, 종료)을 코드 주석과 함께 확정
2. cloud 프록시에서 `start` 처리와 업스트림 연결 파라미터 매핑 로직 분리
3. 프론트 handshake 완료 조건을 `ACK 또는 첫 유효 결과`로 확장
4. `STREAM_ACK_TIMEOUT` 정책을 deployment-aware로 적용
5. 단위 테스트 + 수동 smoke 시나리오(ACK 없음/ACK 지연/EOS 종료) 추가

## Review Checklist (Plan Review)

- [x] RTZR 문서 계약을 벗어나는 임의 규칙이 없는가?
- [x] on-prem 경로 회귀 없이 cloud 경로만 안전하게 개선되는가?
- [x] 장애 시 롤백 플래그/설정값이 준비되어 있는가?

## Implementation Log

- [x] `python_api/api_server/main.py` cloud relay가 `start`를 내부에서 소비하고 업스트림 메시지로 직접 전달하지 않도록 변경
- [x] `python_api/api_server/main.py` cloud/on-prem relay에서 `final/stop/eos` 처리 후 즉시 task를 끊지 않고 upstream final 결과를 수신할 수 있도록 정리
- [x] `python_api/api_server/stt_client.py`의 streaming URL/query 구성 경로와 relay 경로를 일치화(`stream_config`의 `epd_time`, `max_utter_duration` 평탄화 포함)
- [x] `webapp/src/services/api/rtzrStreamingClient.ts` handshake 성공 조건을 `ACK 또는 첫 인식 payload`로 확장
- [x] `webapp/src/services/api/rtzrStreamingClient.test.ts`에 첫 결과 기반 open 케이스 추가
- [x] README realtime 계약 설명 업데이트 (`README.md`, `webapp/README.md`)

## Review Checklist (Implementation Review)

- [ ] cloud realtime 초기 발화 누락 회귀가 없는가?
- [x] 오류 코드와 토스트 메시지가 코드 기준으로 일관적인가?
- [x] 배포 시 기존 녹음/저장 흐름이 깨지지 않는가?

## Verify

- [x] `npm --prefix webapp test -- rtzrStreamingClient`
- [x] `python3 -m compileall python_api/api_server`
- [ ] 수동 smoke: 시작 직후 발화, 중간 네트워크 단절, normal stop/finalize 확인
