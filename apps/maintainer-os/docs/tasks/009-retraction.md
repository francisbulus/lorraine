# 009 — Retraction Command (Phase 1)

## Goal

Implement `mos retract` to correct events in the log while preserving the audit trail.

## Acceptance Criteria

- [ ] `mos retract --event-id <id> --reason <reason> --by <actor>` calls `retractEvent`
- [ ] Valid reasons: fraudulent, duplicate, identity_mixup, consent_erasure, data_correction
- [ ] Invalid reason rejected with guidance
- [ ] Output shows: retraction recorded, list of concepts whose trust state changed as a result
- [ ] Confirmation prompt before retraction (unless `--yes` flag)
- [ ] Tests: retract a verification event, verify trust state recomputed; retract with invalid reason rejected

## Files to Create

- `apps/maintainer-os/cli/src/commands/retract.ts`
- `apps/maintainer-os/cli/src/commands/retract.test.ts`

## Dependencies

- 004 (events exist to retract)
