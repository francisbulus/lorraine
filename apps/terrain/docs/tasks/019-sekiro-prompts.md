# 019 — Sekiro Prompts (Phase 3)

## Goal

Implement cross-domain principle recognition — the Sekiro moments. When the learner enters new territory that rhymes with a foundational principle they already own, the agent prompts recognition without making the connection for them.

## Acceptance Criteria

- [ ] Agent detects when a new concept shares foundational principles with verified territory
- [ ] Agent prompts recognition, not revelation: "You've seen a problem structured like this before. What in your owned territory feels similar?"
- [ ] If learner makes the connection: transfer-level verification event (the strongest signal)
- [ ] If learner doesn't see it: gentle nudge — "The principle here is one you've already derived. Look at the map — anything feel related?"
- [ ] Never: "This is just like TCP's retransmission mechanism" — the learner must make the connection
- [ ] Sekiro grill: cross-domain transfer questions ("You know how TCP guarantees delivery. Databases have a similar problem — how would you guarantee a write survives a crash?")
- [ ] Connection visible on map when made (edge or highlight between related territories)

## Files to Create

- `apps/terrain/app/src/lib/sekiro-detector.ts`

## Dependencies

- 005 (conversation loop)
- 006 (grill mode — Sekiro grill is a transfer question)
- 013 (visual map — connections shown on map)
