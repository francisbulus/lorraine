# 011 — Explain Mode (Phase 2)

## Goal

Implement explain mode with the depth ladder calibrated to the learner's derived trust state. The agent explains concepts at the right level — intuition, abstraction, mechanism, or implementation — based on what the learner already knows.

## Acceptance Criteria

- [ ] Depth ladder implemented: intuition → abstraction → mechanism → implementation
- [ ] Agent reads trust state on concept prerequisites before generating explanation
- [ ] If prerequisites are verified: skip intuition, go to mechanism or implementation
- [ ] If prerequisites are untested: start at intuition
- [ ] Learner controls depth: "explain that more simply" or "show me the code" adjusts the level
- [ ] Implicit signals extracted from questions asked during explanation (questions reveal gaps, sophistication increase, natural connections)
- [ ] Explain renders inline in conversation — no mode switch, the conversation just becomes an explanation
- [ ] Mode transition triggers: learner asks "what is X?", "how does X work?", "explain X"

## Files to Create

- `apps/terrain/app/src/lib/explain-engine.ts`
- `apps/terrain/app/src/lib/depth-ladder.ts`

## Dependencies

- 005 (conversation loop — explain happens within conversation)
