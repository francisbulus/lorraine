# 014 — Self-Calibration View (Phase 2)

## Goal

Build the self-calibration mirror — shows the learner where their self-assessments align with evidence, where they overclaim, where they underclaim, and how calibration changes over time.

## Acceptance Criteria

- [ ] Self-calibration view accessible from bottom bar ("Calibration") or margin panel
- [ ] Key metric displayed: "When you say you know something, the evidence agrees X% of the time"
- [ ] Three sections:
  - **Aligned:** concepts where claim matches evidence (show with ● glyph)
  - **Overclaimed:** concepts where claim exceeds evidence (show with `--inferred` color, not red)
  - **Underclaimed:** concepts where evidence exceeds claim (show with `--verified` color)
- [ ] Calibration trend: "Last month: X%. This month: Y%." if enough data
- [ ] Language is reflective, not evaluative — "Your calibration is improving" not "Great job!"
- [ ] Numbers in `--font-data`, descriptions in `--font-voice`
- [ ] Data sourced from engine `calibrate` API + claim/trust state comparison
- [ ] Agent can reference calibration in conversation: "You said you're not sure about this. But you've approached it from three angles and arrived at correctness each time."

## Files to Create

- `apps/terrain/app/src/components/SelfCalibration.tsx`
- `apps/terrain/app/src/components/CalibrationSection.tsx`
- `apps/terrain/app/src/lib/calibration-data.ts`

## Dependencies

- 005 (conversation loop — claims captured)
- 008 (margin panel — calibration can render there)
