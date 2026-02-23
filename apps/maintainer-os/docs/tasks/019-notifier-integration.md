# 019 — Notifier Integration (Phase 3)

## Goal

Send probes and results to external channels: Slack, email, or GitHub comments. Also support a CLI inbox for pull-based probing.

## Acceptance Criteria

- [ ] Notifier interface: send(channel, recipient, message) with channel-specific adapters
- [ ] Slack adapter: sends probe to Slack DM or channel via webhook
- [ ] GitHub adapter: posts probe as a comment on a PR or issue
- [ ] CLI inbox: `mos challenge pull` lists pending probes for a person, pick one to respond
- [ ] Probe results (post-interpretation summary) sent back to the same channel
- [ ] Configuration in config.toml `[notifications]` section
- [ ] Dry-run mode: `--dry-run` prints what would be sent without sending
- [ ] Tests: mock adapters, verify message formatting, verify delivery calls

## Files to Create

- `apps/maintainer-os/cli/src/lib/notifier.ts`
- `apps/maintainer-os/cli/src/lib/notifier.test.ts`
- `apps/maintainer-os/cli/src/lib/adapters/slack.ts`
- `apps/maintainer-os/cli/src/lib/adapters/github.ts`

## Dependencies

- 017 (challenge workflow produces probes and results to deliver)
