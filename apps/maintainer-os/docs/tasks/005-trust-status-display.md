# 005 — Trust Status Display (Phase 1)

## Goal

Implement `mos status` to show a person's trust map summary. Grouped by trust level, with decay and calibration data.

## Acceptance Criteria

- [ ] `mos status --person <id>` calls `getBulkTrustState` and displays results
- [ ] Output grouped into sections: Verified, Inferred, Contested, Untested, Stale (decayed below threshold)
- [ ] Each concept shows: name, confidence, decayed confidence, last verified date, modalities tested
- [ ] Contested concepts show conflicting evidence summary
- [ ] Calibration gap summary at the bottom (if claims exist)
- [ ] Empty state handled: "No trust data for <person>. Run mos ingest or mos challenge to build evidence."
- [ ] Table output is the default, clean and readable in standard terminal widths
- [ ] Tests: status with mixed trust levels displays correctly; empty person shows guidance

## Files to Create

- `apps/maintainer-os/cli/src/commands/status.ts`
- `apps/maintainer-os/cli/src/lib/formatters.ts` (shared table/display utilities)
- `apps/maintainer-os/cli/src/lib/formatters.test.ts`

## Dependencies

- 004 (events ingested so there is trust state to display)
