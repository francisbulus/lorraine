# 006 — Grill Mode

## Goal

Implement grill mode — adaptive questioning across four difficulty axes (recall, inference, transfer, discrimination). The agent generates verification questions, the learner responds, the response is interpreted and written to the core.

## Acceptance Criteria

- [x] Agent can initiate grill by calling `generateVerification` with appropriate difficulty axis and modality
- [x] Difficulty axis selection based on current trust state: if recall verified → try inference, if inference verified → try transfer. Target the frontier.
- [x] Grill questions feel conversational, not quiz-like (framing calibrated to `applicationContext: 'learning'`)
- [x] Learner response interpreted via `interpretResponse` → structured trust updates
- [x] Trust updates written to core via `recordVerification`
- [x] Contested detection: if `interpretResponse` returns `contestedDetected: true`, the concept enters contested state
- [x] Implicit signals from grill responses also captured
- [x] Grill renders inline in the conversation — no mode switch UI, the conversation just becomes a question
- [x] Agent can suggest grill: "Want to check if you own this ground?" — learner can decline
- [x] `requestSelfVerification` works: learner can say "test me on this" and trigger grill
- [x] Inline trust update annotation appears after grill result

## Files to Create

- `apps/terrain/app/src/lib/grill-engine.ts`
- `apps/terrain/app/src/components/GrillQuestion.tsx` (if inline rendering needs a distinct component)

## Dependencies

- 005 (conversation loop — grill happens within conversation)

## Completion Log

- Grill engine: selectDifficultyAxis (recall→inference→transfer→discrimination frontier), selectGrillTarget (contested > claimed-untested > stale > untested), detectGrillRequest (pattern matching for "test me"/"quiz me"/etc.), interpretGrillResponse (LLM-powered with JSON parsing and fallback)
- createGrillEngine: stateful engine with startGrill (calls generateVerification with correct axis/modality) and processGrillResponse (interprets via LLM, records to core via recordVerification)
- Conversation loop integration: grill state tracking, self-verification request detection, grill response routing with implicit signal extraction, agent response generation with grill result context
- No separate GrillQuestion.tsx needed — grill renders inline as conversation messages (agent question + trust annotations)
- 27 new tests: selectDifficultyAxis (5), selectGrillTarget (3), detectGrillRequest (7), interpretGrillResponse (6), createGrillEngine integration (6)
