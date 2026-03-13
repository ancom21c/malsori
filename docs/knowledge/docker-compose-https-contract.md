# Docker Compose HTTPS Contract

`infra/docker-compose/docker-compose.yml` 경로의 local stack은 webapp nginx에서 TLS를 종료하고, browser -> nginx -> python-api 흐름을 same-origin HTTPS로 유지한다.

## Contract

- compose webapp 기본 포트는 `https://localhost:4173`이다.
- `/api/*` 요청은 HTTPS webapp nginx에서 받아 내부 `python-api:8000`으로 프록시한다.
- Python API의 compose 외부 포트 `8173`은 기존대로 직접 디버그/`/docs` 접근용 HTTP surface로 남는다.
- compose webapp는 `MALSORI_ENABLE_HTTPS=1`과 `MALSORI_TLS_CERT_MODE=self-signed`를 기본값으로 사용한다.

## Certificate Lifecycle

- 인증서 파일은 host의 `infra/docker-compose/certs/tls.crt`와 `infra/docker-compose/certs/tls.key`에 위치한다.
- compose webapp 시작 시 위 파일이 없고 `MALSORI_TLS_CERT_MODE=self-signed`이면 컨테이너가 self-signed cert를 생성한다.
- 생성된 cert는 bind mount 경로에 남기 때문에 `docker compose down` 이후에도 재사용된다.
- 다른 인증서를 쓰고 싶으면 compose 실행 전에 같은 경로에 `tls.crt`/`tls.key`를 넣으면 된다.

## Hostname Rule

- 기본 인증서 SAN에는 `localhost`와 `127.0.0.1`이 포함된다.
- 다른 로컬 도메인을 쓰려면 `MALSORI_TLS_CERT_HOST=<host>`를 설정한 뒤 기존 cert 파일을 지우고 compose webapp를 다시 기동한다.

## Operational Notes

- local browser 경고를 제거하려면 `infra/docker-compose/certs/tls.crt`를 OS 또는 browser trust store에 추가한다.
- secure-context smoke나 OAuth callback 검증은 `https://localhost:4173` 기준으로 수행한다.
- private `rtzr` / `rtzr-internal` package 해상도가 로컬 `~/.pip` config에 의존하는 환경에서는 `infra/deploy/run-malsori-docker.sh`를 compose entrypoint로 사용한다.
- `infra/deploy/run-malsori-docker.sh`의 webapp API build arg 기본값은 same-origin `/api`다.
- production/Helm ingress TLS 정책은 이 compose contract의 범위 밖이다.
