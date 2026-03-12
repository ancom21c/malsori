# Todo Template Guide

이 폴더는 `malsori`의 현재 loop 운영 형식에 맞춘 최소 template를 제공한다.

## Files

- `plan-template.md` - 새 execution loop를 열 때 쓰는 plan template
- `loop-board-template.md` - `docs/todo/<loop>/README.md`용 board template
- `task-template.md` - `Txxxx` task 문서 template

## Usage

1. 새 theme가 current loop에 들어가지 않으면 새 plan doc을 만든다.
2. 새 loop folder를 만들고 `loop-board-template.md`를 `README.md`로 복사한다.
3. 필요한 수만큼 `task-template.md`를 복사해 `T<id>-<slug>.md`를 만든다.
4. placeholder를 채운 뒤 `AGENTS.md`, `README.md`, `docs/README.md`, `docs/knowledge/README.md`를 함께 갱신한다.
5. loop를 닫을 때는 `docs/todo-workflow.md`의 `archive-in-place` 규칙을 따른다.
