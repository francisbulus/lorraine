# 002 — Init + Config Management (Phase 1)

## Goal

Implement `mos init` to create a local workspace and configuration file. Config is TOML, read on every command invocation.

## Acceptance Criteria

- [ ] `mos init --repo <owner/repo> --db <path>` creates config at `~/.config/maintaineros/config.toml`
- [ ] Config file contains store backend, db path, repo, and placeholder sections for LLM, integrations, notifications
- [ ] Running `mos init` when config exists prompts or warns (no silent overwrite)
- [ ] Config reader utility: loads and validates config from default path or `--config` override
- [ ] All subsequent commands fail with exit code 3 and clear message if config is missing
- [ ] Tests: init creates valid config, config reader loads it, missing config produces error

## Files to Create

- `apps/maintainer-os/cli/src/commands/init.ts`
- `apps/maintainer-os/cli/src/lib/config.ts`
- `apps/maintainer-os/cli/src/lib/config.test.ts`

## Dependencies

- 001 (project setup)
