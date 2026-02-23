# 023 — Daemon Mode (Phase 4)

## Goal

Implement `mos daemon start` to run ingest workers, probe scheduler, notifier, and retry queue as a long-running background process.

## Acceptance Criteria

- [ ] `mos daemon start --profile local` starts all workers in a single process
- [ ] Workers: GitHub ingest (periodic poll), incident ingest (periodic poll), probe scheduler (periodic scan), notifier (queue consumer)
- [ ] Configurable intervals per worker in config.toml
- [ ] Durable job queue: jobs survive process restart (SQLite-backed for local profile)
- [ ] Retry policy: transient failures use exponential backoff with jitter; poison messages go to dead-letter queue
- [ ] `mos daemon status` shows running workers, queue depth, last run timestamps
- [ ] `mos daemon stop` graceful shutdown
- [ ] Dead-letter inspection: `mos daemon dlq` lists failed jobs
- [ ] Logging: structured logs to stdout with configurable verbosity
- [ ] Tests: start/stop lifecycle, job queue persistence, retry behavior, dead-letter handling

## Files to Create

- `apps/maintainer-os/cli/src/commands/daemon.ts`
- `apps/maintainer-os/cli/src/lib/daemon.ts`
- `apps/maintainer-os/cli/src/lib/queue.ts`
- `apps/maintainer-os/cli/src/lib/queue.test.ts`
- `apps/maintainer-os/cli/src/lib/daemon.test.ts`

## Dependencies

- 012 (GitHub ingest)
- 018 (probe scheduler)
- 019 (notifier)
- 020 (incident ingest)
