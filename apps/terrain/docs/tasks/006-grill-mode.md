# 006 — Grill Mode

## Goal

Implement grill mode — adaptive questioning across four difficulty axes (recall, inference, transfer, discrimination). The agent generates verification questions, the learner responds, the response is interpreted and written to the core.

## Acceptance Criteria

- [ ] Agent can initiate grill by calling `generateVerification` with appropriate difficulty axis and modality
- [ ] Difficulty axis selection based on current trust state: if recall verified → try inference, if inference verified → try transfer. Target the frontier.
- [ ] Grill questions feel conversational, not quiz-like (framing calibrated to `applicationContext: 'learning'`)
- [ ] Learner response interpreted via `interpretResponse` → structured trust updates
- [ ] Trust updates written to core via `recordVerification`
- [ ] Contested detection: if `interpretResponse` returns `contestedDetected: true`, the concept enters contested state
- [ ] Implicit signals from grill responses also captured
- [ ] Grill renders inline in the conversation — no mode switch UI, the conversation just becomes a question
- [ ] Agent can suggest grill: "Want to check if you own this ground?" — learner can decline
- [ ] `requestSelfVerification` works: learner can say "test me on this" and trigger grill
- [ ] Inline trust update annotation appears after grill result

## Files to Create

- `apps/terrain/app/src/lib/grill-engine.ts`
- `apps/terrain/app/src/components/GrillQuestion.tsx` (if inline rendering needs a distinct component)

## Dependencies

- 005 (conversation loop — grill happens within conversation)
