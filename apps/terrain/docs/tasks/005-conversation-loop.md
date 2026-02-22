# 005 — Conversation Loop (Backend)

## Goal

Implement the core conversation loop from the tech spec: learner speaks → extract implicit signals → capture claims → read trust state → determine response → deliver. This is the engine that powers every interaction.

## Acceptance Criteria

- [x] API route for conversation turns: accepts learner utterance, returns agent response + any trust updates
- [x] On every learner utterance:
  - [x] Calls `extractImplicitSignals` (engine services)
  - [x] Applies implicit signal write policy (tech spec 2.1): auto-write fail-side signals, success-side only when concept is verified/inferred + confidence >= 0.85 + reasoning trace present
  - [x] `self_correction` signals always written
  - [x] Non-qualifying success signals stored as app-local candidate signals (not written to core)
  - [x] Extracts claim language → calls `recordClaim` (tech spec 2.2): only explicit self-assessments, not tone/hedging/questions
  - [x] Reads current trust state via `getTrustState`
- [x] Agent response generated via LLM, informed by current trust state
- [x] Signal deduplication: identical implicit signals within 10-minute window per conceptId + signalType are discarded (tech spec 2.4)
- [x] Conversation history maintained per session
- [x] Anthropic provider configured and used for all LLM calls

## Files to Create

- `apps/terrain/app/src/app/api/chat/route.ts`
- `apps/terrain/app/src/lib/conversation-loop.ts`
- `apps/terrain/app/src/lib/signal-write-policy.ts`
- `apps/terrain/app/src/lib/claim-extractor.ts`
- `apps/terrain/app/src/lib/signal-deduplicator.ts`

## Dependencies

- 001 (project setup — engine wired)
- 002 (domain loaded — concepts available for trust state reads)

## Completion Log

- Conversation loop: processUtterance orchestrates signals → policy → dedupe → write → claims → LLM response
- Signal write policy: fail-side always writes, success-side requires verified/inferred + confidence >= 0.85 + evidence length, self_correction always writes
- Claim extractor: LLM-powered, only explicit self-assessments, filters to known concepts, clamps confidence
- Signal deduplicator: 10-minute rolling window per conceptId + signalType
- API route: POST /api/chat with session management and domain auto-load
- Agent system prompt enforces no-praise, no-urgency, mapmaker-not-guide policies
- 29 new tests: signal write policy (10), deduplicator (6), claim extractor (6), conversation loop integration (7)
