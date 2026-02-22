# 005 — Conversation Loop (Backend)

## Goal

Implement the core conversation loop from the tech spec: learner speaks → extract implicit signals → capture claims → read trust state → determine response → deliver. This is the engine that powers every interaction.

## Acceptance Criteria

- [ ] API route for conversation turns: accepts learner utterance, returns agent response + any trust updates
- [ ] On every learner utterance:
  - [ ] Calls `extractImplicitSignals` (engine services)
  - [ ] Applies implicit signal write policy (tech spec 2.1): auto-write fail-side signals, success-side only when concept is verified/inferred + confidence ≥ 0.85 + reasoning trace present
  - [ ] `self_correction` signals always written
  - [ ] Non-qualifying success signals stored as app-local candidate signals (not written to core)
  - [ ] Extracts claim language → calls `recordClaim` (tech spec 2.2): only explicit self-assessments, not tone/hedging/questions
  - [ ] Reads current trust state via `getTrustState`
- [ ] Agent response generated via LLM, informed by current trust state
- [ ] Signal deduplication: identical implicit signals within 10-minute window per conceptId + signalType are discarded (tech spec 2.4)
- [ ] Conversation history maintained per session
- [ ] Anthropic provider configured and used for all LLM calls

## Files to Create

- `apps/terrain/app/src/app/api/chat/route.ts`
- `apps/terrain/app/src/lib/conversation-loop.ts`
- `apps/terrain/app/src/lib/signal-write-policy.ts`
- `apps/terrain/app/src/lib/claim-extractor.ts`
- `apps/terrain/app/src/lib/signal-deduplicator.ts`

## Dependencies

- 001 (project setup — engine wired)
- 002 (domain loaded — concepts available for trust state reads)
