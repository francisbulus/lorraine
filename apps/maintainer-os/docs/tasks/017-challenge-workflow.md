# 017 — Challenge Workflow (Phase 3)

## Goal

Implement `mos challenge` for person-initiated or manager-initiated verification. Generate a probe, accept a response, interpret it, record evidence.

## Acceptance Criteria

- [ ] `mos challenge --person <id> --concept <id>` generates a verification prompt via `generateVerification`
- [ ] Prompt printed to stdout with clear framing
- [ ] Interactive mode: waits for response input (stdin or editor via `$EDITOR`)
- [ ] Non-interactive mode: `--response <text>` or `--response-file <path>` for scripted use
- [ ] Response interpreted via `interpretResponse`; per-concept results displayed
- [ ] For each trust update: `recordVerification` then `propagateTrust` called
- [ ] Updated trust state displayed after recording
- [ ] `mos challenge --person <id>` without concept auto-selects the highest-priority gap (contested > stale > untested)
- [ ] Tests: full challenge loop with mock LLM; auto-concept selection logic

## Files to Create

- `apps/maintainer-os/cli/src/commands/challenge.ts`
- `apps/maintainer-os/cli/src/lib/challenge.ts`
- `apps/maintainer-os/cli/src/lib/challenge.test.ts`

## Dependencies

- 016 (LLM worker for generate and interpret)
- 006 (role gate priorities for auto-selection)
