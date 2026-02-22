# 011 — Explain Mode (Phase 2)

## Goal

Implement explain mode with the depth ladder calibrated to the learner's derived trust state. The agent explains concepts at the right level — intuition, abstraction, mechanism, or implementation — based on what the learner already knows.

## Acceptance Criteria

- [x] Depth ladder implemented: intuition → abstraction → mechanism → implementation
- [x] Agent reads trust state on concept prerequisites before generating explanation
- [x] If prerequisites are verified: skip intuition, go to mechanism or implementation
- [x] If prerequisites are untested: start at intuition
- [x] Learner controls depth: "explain that more simply" or "show me the code" adjusts the level
- [x] Implicit signals extracted from questions asked during explanation (questions reveal gaps, sophistication increase, natural connections)
- [x] Explain renders inline in conversation — no mode switch, the conversation just becomes an explanation
- [x] Mode transition triggers: learner asks "what is X?", "how does X work?", "explain X"

## Files to Create

- `apps/terrain/app/src/lib/explain-engine.ts`
- `apps/terrain/app/src/lib/depth-ladder.ts`

## Dependencies

- 005 (conversation loop — explain happens within conversation)

## Completion Log

- depth-ladder.ts: selectDepth (untested→intuition, prereqs-verified→abstraction, inferred→mechanism, verified→implementation, contested→mechanism), adjustDepth (simpler/deeper with bounds clamping), getDepthIndex, isDeeper
- explain-engine.ts: detectExplainRequest (pattern matching for "what is"/"how does"/"explain"), detectDepthAdjustment ("simpler"/"deeper" patterns), createExplainEngine with startExplanation (auto-depth from trust state + prereqs), adjustExplanation, LLM generation with depth-calibrated system prompt
- 30 new tests: depth-ladder (15), explain-engine (15)
