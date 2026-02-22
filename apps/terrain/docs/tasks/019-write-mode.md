# 019 — Write Mode (Phase 3)

## Goal

Implement write mode — the Feynman technique. The learner explains a concept in their own words, the agent provides real-time feedback on gaps without correcting.

## Acceptance Criteria

- [ ] Write mode renders inline in conversation — expanded input area for the learner to write
- [ ] Agent detects gaps: skipped important parts, contradictions, terms used without explanation
- [ ] Agent flags gaps but does NOT rewrite or correct — lets the learner fix it
- [ ] Trust signals: coherent complete explanation → strong verification, teaching-level explanation → very strong, self-corrections → active model-building
- [ ] Learner's writing in `--font-hand` (their voice)
- [ ] Mode transition trigger: "Let me explain this back to you" / "I want to write about this"
- [ ] Signals extracted and written to core via `recordVerification` with `write:explanation` or `write:teaching` modality

## Files to Create

- `apps/terrain/app/src/components/WriteMode.tsx`
- `apps/terrain/app/src/lib/write-engine.ts`

## Dependencies

- 005 (conversation loop)
- 015 (mode transitions)
