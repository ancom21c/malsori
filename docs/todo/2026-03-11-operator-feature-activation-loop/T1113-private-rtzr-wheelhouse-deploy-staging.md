# T1113 - Private RTZR Wheelhouse Deploy Staging

## Spec

### 문제

- `python_api` 이미지는 `rtzr` / `rtzr-internal` private package 해상도가 필요하지만, 현재 repo에는 gitignored build-context placeholder만 있고 compose/build/deploy 경로가 local wheelhouse staging을 공통으로 처리하지 않는다.
- 결과적으로 local compose, direct image build, dev cluster deploy가 각자 ad-hoc 방식이나 누락된 local script에 의존해 repeatable하지 않다.

### 목표

- private RTZR wheelhouse를 git에 올리지 않고도 compose/build/deploy helper가 같은 staging 규칙으로 사용할 수 있게 한다.
- local source dir에서 docker build context의 gitignored staging dir로 임시 복사하고, 종료 후 cleanup하는 경로를 공통화한다.

### 범위

- 포함:
  - gitignored `python-api-pip` staging dir 구조 명확화
  - stage / cleanup helper script 추가
  - `scripts/build-images.sh` 및 local compose helper 연동
  - deploy/doc 경로에 local source layout과 사용법 문서화
- 제외:
  - cluster 내부 PyPI registry 구축
  - private wheel/artifact 자체를 git에 저장

### 해결방안

- local source root를 `~/.local/share/malsori/python-api-pip/`로 표준화하고 `PYTHON_API_PIP_SOURCE_DIR` override를 지원한다.
- build 전에 helper script가 source dir를 `infra/docker-compose/docker-build/python-api-pip/`로 stage하고, build/deploy 종료 시 cleanup한다.
- compose와 image build가 같은 helper를 재사용하도록 경로를 맞춘다.

### 수용 기준 (AC)

- [x] private wheelhouse/pip config source dir와 gitignored staging dir가 명확히 구분된다.
- [x] compose/build/deploy helper가 같은 staging helper를 재사용한다.
- [x] stage된 파일은 git에 올라가지 않고, helper 종료 시 cleanup된다.
- [x] deploy/operator 문서에 local source layout과 사용 경로가 남아 있다.

## Plan

1. active loop 문서에 task를 등록하고 local source/staging/deploy scope를 고정한다.
2. common stage/cleanup helper와 compose/build 경로 integration을 구현한다.
3. deploy docs와 knowledge doc을 갱신하고 local helper 검증을 남긴다.

## Review Checklist (Plan Review)

- [x] boundary / safe default / rollback이 맞는가?
- [x] scope가 다른 task와 겹치지 않는가?
- [x] verify 경로가 미리 정리돼 있는가?

## Self Review 1 - Scope Fit

- [x] 이 task가 current loop 목표와 직접 연결되는가?

## Self Review 2 - Safety

- [x] private artifact나 credential이 git tracked surface로 새지 않는가?

## Self Review 3 - Executability

- [x] 구현 단위와 verify 명령을 바로 적을 수 있는가?

## Implementation Log

- [x] gitignored `python-api-pip/wheels/` placeholder와 common stage helper를 추가했다.
- [x] `scripts/build-images.sh`와 local compose helper가 same helper로 stage/cleanup을 재사용하게 맞췄다.
- [x] deploy README 및 compose knowledge doc에 local source layout과 사용법을 남겼다.

## Review Checklist (Implementation Review)

- [x] tracked repo에는 placeholder/script/doc만 남고 private wheel/pip config는 계속 ignored 상태인가?
- [x] compose/build/deploy 경로가 같은 source/staging contract를 공유하는가?
- [x] failure 시 staged build context가 cleanup되는가?

## Verify

- [x] `node scripts/check-todo-board-consistency.mjs`
- [x] `git diff --check`
- [x] `bash -n scripts/stage-python-api-pip.sh`
- [x] `bash -n scripts/build-images.sh`
- [x] `bash -n infra/deploy/local/run-malsori-docker.sh`
- [x] `PYTHON_API_PIP_SOURCE_DIR="$(mktemp -d)"` source fixture로 `scripts/stage-python-api-pip.sh stage`
- [x] `PYTHON_API_PIP_SOURCE_DIR="$(mktemp -d)"` source fixture로 `scripts/stage-python-api-pip.sh cleanup`
- [x] `PYTHON_API_PIP_SOURCE_DIR=<fixture>` `infra/deploy/local/run-malsori-docker.sh config`
