# 004 — Manual Event Ingest (Phase 1)

## Goal

Implement `mos ingest run --source file` to ingest structured verification events from JSON or CSV. This is how teams bootstrap trust data before external integrations are live.

## Acceptance Criteria

- [ ] `mos ingest run --source file --file <path>` reads a JSON array of verification events
- [ ] Each event must include: personId, conceptId, modality, result, context, source
- [ ] Source defaults to `external` for file-ingested events
- [ ] For each valid event: calls `recordVerification` then `propagateTrust`
- [ ] Invalid events are skipped with a warning line (not a crash)
- [ ] Summary printed after ingest: N events processed, N skipped, N concepts affected
- [ ] CSV support: column headers map to event fields
- [ ] Tests: ingest valid JSON file, verify trust state updated; ingest file with invalid rows, verify partial success

## Files to Create

- `apps/maintainer-os/cli/src/commands/ingest.ts`
- `apps/maintainer-os/cli/src/lib/ingest.ts`
- `apps/maintainer-os/cli/src/lib/ingest.test.ts`
- `apps/maintainer-os/cli/fixtures/example-events.json`

## Dependencies

- 003 (store and domain loaded)
