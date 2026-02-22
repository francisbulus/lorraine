# 019 — Sketch Mode (Phase 3)

## Goal

Implement sketch mode — the learner draws their mental model, the agent critiques structure not aesthetics.

## Acceptance Criteria

- [ ] Drawing canvas renders inline in conversation
- [ ] Agent analyzes submitted sketch for: correct components, correct relationships, missing elements, wrong connections
- [ ] Agent critiques structure, not aesthetics
- [ ] Trust signals: structurally accurate diagram → medium-strong verification, missing components → gap signal, wrong connections → misconception signal
- [ ] Spontaneous additions (things agent didn't ask for) captured as implicit signals
- [ ] Mode transition trigger: "Can you draw that?" / "Let me sketch this out"
- [ ] Signals written to core via `recordVerification` with `sketch:diagram` or `sketch:process` modality

## Files to Create

- `apps/terrain/app/src/components/SketchMode.tsx`
- `apps/terrain/app/src/components/DrawingCanvas.tsx`
- `apps/terrain/app/src/lib/sketch-engine.ts`

## Dependencies

- 005 (conversation loop)
- 015 (mode transitions)
