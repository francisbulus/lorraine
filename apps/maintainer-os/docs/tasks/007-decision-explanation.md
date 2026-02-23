# 007 — Decision Explanation (Phase 1)

## Goal

Implement `mos why` to explain any trust state or decision with a full evidence chain. Every number traces to an event.

## Acceptance Criteria

- [ ] `mos why --person <id> --concept <id>` prints the full trust derivation for that concept
- [ ] Shows: current level, confidence, verification history (each event with timestamp, modality, result, context), claim history, inference chain if inferred, decay computation
- [ ] `mos why --decision <type> --id <id>` explains a specific decision (reviewer assignment, readiness evaluation)
- [ ] Calls `explainDecision` from engine epistemics
- [ ] Output is readable narrative, not raw JSON (unless --format json)
- [ ] Tests: explain a verified concept, an inferred concept, a contested concept; verify evidence chain is complete

## Files to Create

- `apps/maintainer-os/cli/src/commands/why.ts`
- `apps/maintainer-os/cli/src/lib/explain.ts`
- `apps/maintainer-os/cli/src/lib/explain.test.ts`

## Dependencies

- 005 (trust state exists to explain)
