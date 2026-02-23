# 022 — Permissioned Readiness Views (Phase 4)

## Goal

Add permission controls so managers and engineers see appropriate trust data. Not everyone sees everything.

## Acceptance Criteria

- [ ] `mos status --person <id> --as <actor>` applies visibility rules based on actor's role
- [ ] Engineers see their own full trust state (self view)
- [ ] Managers see readiness summaries for their reports, not raw event details unless requested
- [ ] `mos ready --team <team>` shows aggregate readiness for a team (manager view)
- [ ] Team view: per-person pass/fail against each bundle, no individual event details
- [ ] Permission config in policy file or config.toml: who is a manager, who manages whom
- [ ] Unauthorized access returns clear error, not empty data
- [ ] Tests: self view, manager view, unauthorized view; team aggregate

## Files to Create

- `apps/maintainer-os/cli/src/lib/permissions.ts`
- `apps/maintainer-os/cli/src/lib/permissions.test.ts`

## Dependencies

- 005 (status command)
- 006 (readiness evaluation)
- 015 (policy files for permission config)
