# 024 — Observability + Metrics (Phase 4)

## Goal

Add operational metrics and health checks for CLI and daemon use.

## Acceptance Criteria

- [ ] `mos metrics` shows operational summary: events ingested by source, contested count by team, stale required concepts by role, calibration distribution, queue depth
- [ ] Metrics computed from store queries, not a separate metrics store
- [ ] `--since <duration>` filters to a time window
- [ ] `--format json` for CI/monitoring integration
- [ ] Daemon mode: periodic metrics emission to structured logs
- [ ] Health check: `mos health` verifies store connectivity, LLM provider reachability, config validity
- [ ] Tests: metrics with known data, health check pass/fail scenarios

## Files to Create

- `apps/maintainer-os/cli/src/commands/metrics.ts`
- `apps/maintainer-os/cli/src/commands/health.ts`
- `apps/maintainer-os/cli/src/lib/metrics.ts`
- `apps/maintainer-os/cli/src/lib/metrics.test.ts`

## Dependencies

- 023 (daemon mode for operational context)
