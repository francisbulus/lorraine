# 012 — GitHub Ingest Adapter (Phase 2)

## Goal

Implement `mos ingest run --source github` to pull PR and review data from GitHub, map it to concepts, and record verification events.

## Acceptance Criteria

- [ ] `mos ingest run --source github --since <duration>` fetches merged PRs from configured repo
- [ ] Uses GitHub API (via `gh` CLI or octokit) to fetch PR metadata: files changed, author, reviewers, review comments
- [ ] Maps changed files to concepts via the file mapper (task 011)
- [ ] PR author gets a verification event per matched concept (modality: `external:observed`, result: `partial` by default)
- [ ] Review comments that catch real issues upgrade the reviewer's event to `demonstrated` (policy-based)
- [ ] Each recorded event includes PR number, file paths, and review context in the context field
- [ ] `propagateTrust` called after each batch of events
- [ ] Summary: PRs processed, events recorded, concepts touched
- [ ] Tests: mock GitHub API responses, verify correct events written for various PR shapes

## Files to Create

- `apps/maintainer-os/cli/src/lib/github-ingest.ts`
- `apps/maintainer-os/cli/src/lib/github-ingest.test.ts`
- `apps/maintainer-os/cli/src/lib/evidence-policy.ts`
- `apps/maintainer-os/cli/src/lib/evidence-policy.test.ts`

## Dependencies

- 011 (file mapper)
- 004 (ingest command structure)
