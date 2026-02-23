# 018 — Probe Scheduler (Phase 3)

## Goal

Build the probe scheduler that scans for stale, contested, and untested required concepts and queues probe generation jobs.

## Acceptance Criteria

- [ ] Scheduler scans all persons against all loaded role gates
- [ ] Priority order: contested required > stale required > untested required > low-confidence inferred required
- [ ] Generates a prioritized list of (person, concept) pairs to probe
- [ ] `mos probe-scan` runs the scan once and prints the queue
- [ ] `mos probe-scan --generate` also generates prompts for each queued pair
- [ ] Rate limiting: configurable max probes per person per day
- [ ] Deduplication: does not re-probe a concept that was probed within a configurable cooldown window
- [ ] Tests: verify priority ordering, rate limiting, deduplication, filtering by bundle

## Files to Create

- `apps/maintainer-os/cli/src/lib/probe-scheduler.ts`
- `apps/maintainer-os/cli/src/lib/probe-scheduler.test.ts`
- `apps/maintainer-os/cli/src/commands/probe-scan.ts`

## Dependencies

- 016 (LLM worker for prompt generation)
- 014 (decay scan for staleness detection)
