# 014 — Scheduled Decay Scan (Phase 2)

## Goal

Implement a decay scan that identifies stale concepts across all tracked persons, with optional alerting.

## Acceptance Criteria

- [ ] `mos decay-scan` runs `decayTrust` for all persons in the store
- [ ] Reports concepts whose decay-adjusted confidence has dropped below configurable thresholds
- [ ] Output grouped by person, sorted by severity (most decayed first)
- [ ] `--bundle <name>` filters to concepts required by a specific role gate
- [ ] `--threshold <n>` overrides the default staleness threshold (default 0.5)
- [ ] Summary: total stale concepts, persons affected, most critical gaps
- [ ] Can run as a cron job: `mos decay-scan --format json` produces parseable output
- [ ] Tests: verify decay detection after time passes, verify bundle filtering

## Files to Create

- `apps/maintainer-os/cli/src/commands/decay-scan.ts`
- `apps/maintainer-os/cli/src/commands/decay-scan.test.ts`

## Dependencies

- 005 (trust state display patterns)
- 006 (role gate definitions for bundle filtering)
