# Skills

This project uses:
- global skills under `$CODEX_HOME/skills` (usually `~/.codex/skills`)
- repo-local skills under `.codex/skills/` (if present)

## Recommended Global Skills

- `agents-docs-bootstrap`: docs entrypoint and knowledge-index maintenance when repo docs drift
- `repo-plan-review-commit`: plan -> implement -> verify -> review -> commit for non-trivial repo changes
- `verification-loop`: build, lint, test, smoke, and diff review
- `security-review`: security checklist for auth, input handling, secrets, and admin surfaces

## Repo-Local Skills (optional)

- `.codex/skills/repo-workflow/`: repo-specific loop naming, verification commands, and doc update rules
- `.codex/skills/doc-gardening/`: keep `AGENTS.md`, docs indices, and archive pointers healthy
