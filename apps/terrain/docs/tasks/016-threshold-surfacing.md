# 016 — Threshold Surfacing (Phase 3)

## Goal

Implement threshold detection and the threshold moment UI — when the learner reaches a territory boundary, surface it with readiness criteria and let them decide.

## Acceptance Criteria

- [ ] Agent detects when learner is at a territory boundary (trust state on boundary concepts meets threshold criteria)
- [ ] Threshold card renders inline in conversation per design system:
  - Background `--ground-mid`, border 1px `--stone`
  - Territory names and arrow showing the boundary
  - Concept list with trust glyphs showing readiness
  - Question in `--font-voice`, italic: "Do you feel like you own this ground?"
  - Two text links (not buttons): "Yes, let's move on" (`--chalk`) and "Not yet, I want to review" (`--stone`)
- [ ] Threshold card fades in slower than normal messages (500ms)
- [ ] Contested concepts highlighted in threshold card
- [ ] Learner can cross regardless of readiness — threshold is informational, never blocking
- [ ] Readiness computed via `getBulkTrustState` on threshold concept IDs vs domain-defined requirements
- [ ] Agent surfaces thresholds with low pressure, makes evidence visible if learner is unsure

## Files to Create

- `apps/terrain/app/src/components/ThresholdCard.tsx`
- `apps/terrain/app/src/lib/threshold-detector.ts`

## Dependencies

- 002 (domain — threshold definitions)
- 005 (conversation loop — threshold triggers during conversation)
- 007 (territory list — thresholds between territories)
