# T1114 - Kubernetes Nginx ConfigMap Entrypoint Guard

## Spec

### 문제

- `webapp` image entrypoint의 `40-configure-https.sh`는 startup마다 `/etc/nginx/conf.d/default.conf`를 `http.conf` 또는 `https.conf`로 덮어쓴다.
- Helm deploy에서는 같은 경로를 ConfigMap `subPath`로 주입하므로, container startup 시 file replace가 실패하고 `webapp`이 CrashLoopBackOff에 빠진다.
- 결과적으로 `scripts/build-images.sh`와 `infra/deploy/local/deploy-dev.sh`로 올린 새 image가 runtime smoke 전에 503으로 무너진다.

### 목표

- Kubernetes deploy가 제공하는 nginx `default.conf`를 entrypoint가 다시 쓰지 않도록 막아 dev cluster rollout을 복구한다.
- local compose HTTPS/self-signed 흐름은 그대로 유지한다.

### 범위

- 포함:
  - `webapp` nginx entrypoint의 Kubernetes guard
  - regression test 추가
  - deploy verify 재실행
- 제외:
  - Helm nginx ConfigMap 구조 변경
  - ingress / TLS termination 설계 변경

### 해결방안

- `KUBERNETES_SERVICE_HOST`가 존재하고 `default.conf`가 이미 있으면, `40-configure-https.sh`가 config swap을 건너뛰고 mounted ConfigMap을 그대로 사용한다.
- `vitest`에서 entrypoint 스크립트를 temp nginx root로 실행해 local copy path와 Kubernetes skip path를 모두 고정한다.

### 수용 기준 (AC)

- [x] Kubernetes deploy에서 `webapp` container가 read-only ConfigMap overwrite 없이 기동한다.
- [x] local non-Kubernetes path는 계속 `http.conf`/`https.conf` swap을 수행한다.
- [x] regression test가 두 경로를 자동으로 검증한다.

## Plan

1. nginx entrypoint가 Kubernetes-mounted `default.conf`를 다시 쓰지 않도록 guard를 추가한다.
2. temp filesystem 기반 `vitest` regression을 추가한다.
3. lint/build/test/smoke와 dev deploy를 다시 돌려 rollout 복구를 확인한다.

## Review Checklist (Plan Review)

- [x] Kubernetes-only guard가 compose HTTPS flow를 건드리지 않는가?
- [x] Helm chart의 existing ConfigMap contract와 충돌하지 않는가?
- [x] deploy rollback이 image rollback만으로 가능한가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current operator/deploy loop의 rollout reliability 범위에 직접 연결되는가?

## Self Review 2 - Safety

- [x] local compose/self-signed HTTPS path를 깨지 않는가?

## Self Review 3 - Executability

- [x] local regression과 dev deploy smoke를 같은 turn에서 확인할 수 있는가?

## Implementation Log

- [x] Kubernetes env에서 mounted `default.conf`를 그대로 쓰도록 `40-configure-https.sh` guard를 바꿨다.
- [x] `vitest`로 local copy path와 Kubernetes skip path를 temp nginx root에서 검증했다.
- [x] dev cluster redeploy 후 `webapp` startup log, ingress `200`, post-deploy smoke까지 확인했다.

## Review Checklist (Implementation Review)

- [x] CrashLoop root cause가 `default.conf` overwrite 시도 하나로 수렴하는가?
- [x] Kubernetes guard가 mounted config 존재 시에만 동작하는가?
- [x] deploy helper/wheelhouse staging과 무관한 영역은 건드리지 않았는가?

## Verify

- [x] `git diff --check`
- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `bash -n webapp/docker-entrypoint.d/40-configure-https.sh`
- [x] `npm --prefix webapp run lint`
- [x] `npm --prefix webapp run build`
- [x] `npm --prefix webapp run bundle:check`
- [x] `npm --prefix webapp run test`
- [x] `infra/deploy/local/deploy-dev.sh`
- [x] `./scripts/post-deploy-smoke.sh`
