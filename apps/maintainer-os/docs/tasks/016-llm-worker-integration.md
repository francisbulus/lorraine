# 016 — LLM Worker Integration (Phase 3)

## Goal

Wire the Lorraine engine services (generateVerification, interpretResponse, extractImplicitSignals) with LLM provider configuration from config.toml.

## Acceptance Criteria

- [ ] LLM provider initialized from config.toml `[llm]` section
- [ ] `generateVerification` callable from CLI commands with store + LLM provider
- [ ] `interpretResponse` callable with per-concept result handling (each trust update carries its own result)
- [ ] `extractImplicitSignals` callable for conversational probe responses
- [ ] Fallback behavior on LLM failure: exit code 6, clear error message, no partial state written
- [ ] Retry logic: configurable retries with exponential backoff for transient LLM errors
- [ ] Tests: mock LLM provider, verify generate/interpret/extract pipeline works end to end

## Files to Create

- `apps/maintainer-os/cli/src/lib/llm-worker.ts`
- `apps/maintainer-os/cli/src/lib/llm-worker.test.ts`

## Dependencies

- 002 (config with LLM section)
- 003 (store for trust state reads during interpretation)
