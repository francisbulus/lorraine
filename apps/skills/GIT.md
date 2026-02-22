---
description: Git best practices for commit hygiene, commit messages, branching, and safe push workflow
alwaysApply: false
---

Use these standards whenever creating commits or preparing a push.

## Commit Scope and Hygiene

- Keep commits atomic: one logical change per commit.
- Do not mix refactors, formatting, and feature work unless they are inseparable.
- Stage intentionally with `git add <file>` or `git add -p` instead of broad staging by default.
- Re-check staged diff before commit with `git diff --cached`.
- Avoid committing secrets, generated build artifacts, local env files, and machine-specific config.

## Commit Message Format

Prefer Conventional Commits:

`<type>(<scope>): <short summary>`

Examples:

- `feat(api): add instance status endpoint`
- `fix(dashboard): handle websocket reconnect loop`
- `docs(skills): add git best practices skill`

Recommended types:

- `feat` for new behavior
- `fix` for bug fixes
- `docs` for documentation-only changes
- `refactor` for code structure changes without behavior change
- `test` for test additions/changes
- `chore` for maintenance and tooling

Message rules:

- Use imperative mood (`add`, `fix`, `update`), not past tense.
- Keep subject concise (about 50-72 chars).
- Explain _why_ in the body when context is not obvious.
- Add breaking-change note explicitly when applicable.

## Branch and History Practices

- Work from a short-lived branch for non-trivial changes.
- Rebase branch on latest `main` before merging to keep history linear.
- Prefer clean commits over noisy "wip" history on shared branches.
- Avoid force-pushing shared branches unless explicitly coordinated.

## Pre-Push Checklist

- Run relevant tests/lint for changed areas.
- Confirm no accidental file additions with `git status`.
- Verify remote and branch with `git branch -vv` and `git remote -v`.
- Push with upstream on first push: `git push -u origin <branch>`.

## Pull Request Guidance

- Keep PRs focused and reviewable.
- Use a clear title aligned with the main commit intent.
- Include: summary, key changes, risk areas, and test evidence.
- Call out migrations, config changes, and rollback considerations.
