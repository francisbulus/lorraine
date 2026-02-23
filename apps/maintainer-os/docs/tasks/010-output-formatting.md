# 010 — Output Formatting + Exit Codes (Phase 1)

## Goal

Add `--format` flag to all commands and standardize exit codes. Phase 1 exit criteria: the full local pilot loop works end to end.

## Acceptance Criteria

- [ ] Global `--format` option: `table` (default), `json`, `yaml`
- [ ] All commands (status, ready, why, calibrate, retract, ingest, domain) respect --format
- [ ] JSON output is machine-parseable (valid JSON, consistent structure)
- [ ] YAML output uses standard formatting
- [ ] Exit codes standardized across all commands: 0 success, 2 policy/readiness unmet, 3 config error, 4 upstream ingest error, 5 storage error
- [ ] End-to-end test: init, domain load, ingest, status, ready, why, calibrate, retract. Full loop, zero errors.
- [ ] Tests: each command produces valid JSON when --format json; exit codes match spec

## Files to Modify

- All command files in `src/commands/`
- `apps/maintainer-os/cli/src/lib/formatters.ts`

## Files to Create

- `apps/maintainer-os/cli/src/lib/output.ts` (format dispatcher)
- `apps/maintainer-os/cli/src/lib/output.test.ts`
- `apps/maintainer-os/cli/tests/e2e/local-pilot.test.ts`

## Dependencies

- 005-009 (all Phase 1 commands implemented)
