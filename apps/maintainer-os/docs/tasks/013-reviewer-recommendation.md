# 013 — Reviewer Recommendation (Phase 2)

## Goal

Implement `mos reviewers` to recommend PR reviewers based on concept coverage from trust state.

## Acceptance Criteria

- [ ] `mos reviewers --pr <number> --top <n>` fetches PR files, maps to concepts, scores candidates
- [ ] Scoring: for each candidate, `getBulkTrustState` for PR concepts. Score based on: coverage (how many concepts verified or inferred), confidence (average across matched concepts), directness (verified > inferred), recency (decay-adjusted)
- [ ] Contested concepts penalize the candidate's score for that concept
- [ ] Stale concepts (decayed below threshold) penalize the score
- [ ] Output: ranked list with name, coverage score, verification ratio, contested flags
- [ ] Each recommendation includes an explanation handle: "Run `mos why --decision reviewer_assignment --id pr-<N>` for full reasoning"
- [ ] `--format json` returns machine-readable output for CI integration
- [ ] Tests: recommend from a pool with varied trust states; verify scoring, penalization, ranking

## Files to Create

- `apps/maintainer-os/cli/src/commands/reviewers.ts`
- `apps/maintainer-os/cli/src/lib/reviewer-scoring.ts`
- `apps/maintainer-os/cli/src/lib/reviewer-scoring.test.ts`

## Dependencies

- 011 (file mapper for PR concept resolution)
- 012 (GitHub ingest for trust data)
- 007 (explanation infrastructure)
