# 006 — Role Gates + Readiness Evaluation (Phase 1)

## Goal

Implement `mos ready` to evaluate a person against a capability bundle's role gate. This is the core readiness decision command.

## Acceptance Criteria

- [ ] `mos ready --person <id> --bundle <name>` evaluates all role gate requirements
- [ ] For each required concept: checks trust level and confidence against gate thresholds
- [ ] Output shows: pass/fail per concept, current level, current confidence, decay-adjusted confidence
- [ ] Blockers section lists concepts that fail the gate, with reason (untested, contested, insufficient confidence, wrong level)
- [ ] Suggestions section lists next best verification actions for each blocker
- [ ] Overall pass/fail with exit code 0 (pass) or 2 (unmet)
- [ ] `mos ready --person <id> --bundle <name> --verbose` shows full trust state per concept
- [ ] Tests: fully passing gate, partially passing, fully failing; verify exit codes

## Files to Create

- `apps/maintainer-os/cli/src/commands/ready.ts`
- `apps/maintainer-os/cli/src/lib/role-gates.ts`
- `apps/maintainer-os/cli/src/lib/role-gates.test.ts`

## Dependencies

- 003 (domain with bundles and role gates loaded)
- 005 (status display patterns, formatter utilities)
