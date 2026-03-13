# T1111 - Docker Compose HTTPS Self-Signed Ingress

## Spec

### 문제

- 현재 `infra/docker-compose/docker-compose.yml` 경로의 webapp는 nginx `80` 포트만 노출해서 `http://localhost:4173`로만 접근된다.
- 이 구성은 secure-context가 필요한 브라우저 검증이나 OAuth redirect, same-origin HTTPS smoke를 compose 경로에서 바로 재현하기 어렵다.

### 목표

- compose webapp를 `https://localhost:4173`로 띄우고 `/api/*` 프록시를 same-origin HTTPS 경로에서 유지한다.
- 자가서명 인증서는 compose 실행 경로에서 자동 생성되거나 재사용돼 재기동 시 계속 유지된다.

### 범위

- 포함:
  - webapp nginx/Dockerfile에 HTTPS entrypoint를 추가한다.
  - compose webapp service가 self-signed cert를 생성/재사용하도록 mount와 env를 구성한다.
  - README와 durable docs에 compose HTTPS 사용 방법을 남긴다.
- 제외:
  - Helm/production ingress의 TLS 전략 변경
  - 공인 인증서 발급 자동화

### 해결방안

- nginx HTTP/HTTPS 설정을 분리하고, container entrypoint script가 env에 따라 active config를 선택한다.
- compose에서는 `infra/docker-compose/certs/` bind mount를 사용해 self-signed cert/key를 보존한다.
- cert가 없으면 컨테이너 시작 시 `openssl`로 `localhost` SAN이 포함된 cert를 생성한다.

### 수용 기준 (AC)

- [ ] `docker compose -f infra/docker-compose/docker-compose.yml up -d --build` 이후 `https://localhost:4173/healthz`가 self-signed cert와 함께 응답한다.
- [ ] webapp는 same-origin `https://localhost:4173`에서 `/api/*` 프록시를 계속 사용한다.
- [ ] 생성/재사용 방법과 cert 위치가 문서에 남아 있다.

## Plan

1. active loop 문서에 task를 등록하고 HTTPS scope/rollback을 명시한다.
2. nginx config 선택 + self-signed cert 생성 entrypoint + compose volume/env를 구현한다.
3. README/doc index를 갱신하고 compose config/build/up/curl 검증을 남긴다.

## Review Checklist (Plan Review)

- [x] boundary / safe default / rollback이 맞는가?
- [x] scope가 다른 task와 겹치지 않는가?
- [x] verify 경로가 미리 정리돼 있는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current loop 목표와 직접 연결되는가?

## Self Review 2 - Safety

- [x] failure가 core flow에 전이되지 않는가?

## Self Review 3 - Executability

- [x] 구현 단위와 verify 명령을 바로 적을 수 있는가?

## Implementation Log

- [x] nginx/Docker/compose HTTPS support 구현
- [x] docs/README 및 knowledge doc 갱신
- [x] compose smoke/verify 기록

## Review Checklist (Implementation Review)

- [x] regression / UX drift / ops risk가 없는가?
- [x] diff와 실제 구현이 spec을 벗어나지 않는가?

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
- [x] `sh -n webapp/docker-entrypoint.d/40-configure-https.sh`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `docker compose -f infra/docker-compose/docker-compose.yml config`
- [x] `docker compose -f infra/docker-compose/docker-compose.yml build webapp`
- [x] `infra/deploy/run-malsori-docker.sh`
- [x] `curl -sk https://localhost:4173/healthz`
- [x] `curl -sk https://localhost:4173/api/v1/health`
- [x] `openssl x509 -in infra/docker-compose/certs/tls.crt -noout -subject -ext subjectAltName`

검증 메모:

- raw `docker compose ... up -d --build`는 staged `~/.pip` config 없이 실행하면 기존 `python-api` 이미지 빌드 단계에서 `ERROR: No matching distribution found for rtzr`로 실패할 수 있다.
- repo의 지원 경로인 `infra/deploy/run-malsori-docker.sh`는 local `~/.pip`를 임시 staging한 뒤 compose를 띄우며, same-origin `/api` build arg와 함께 실제 `https://localhost:4173/healthz` 및 `/api/v1/health` 응답을 정상 확인했다.
