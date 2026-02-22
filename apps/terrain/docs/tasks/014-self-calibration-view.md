# 014 — Self-Calibration View (Phase 2)

## Goal

Build the self-calibration mirror — shows the learner where their self-assessments align with evidence, where they overclaim, where they underclaim, and how calibration changes over time.

## Acceptance Criteria

- [x] Self-calibration view accessible from bottom bar ("Calibration") or margin panel
- [x] Key metric displayed: "When you say you know something, the evidence agrees X% of the time"
- [x] Three sections:
  - **Aligned:** concepts where claim matches evidence (show with ● glyph)
  - **Overclaimed:** concepts where claim exceeds evidence (show with `--inferred` color, not red)
  - **Underclaimed:** concepts where evidence exceeds claim (show with `--verified` color)
- [x] Calibration trend: "Last month: X%. This month: Y%." if enough data
- [x] Language is reflective, not evaluative — "Your calibration is improving" not "Great job!"
- [x] Numbers in `--font-data`, descriptions in `--font-voice`
- [x] Data sourced from engine `calibrate` API + claim/trust state comparison
- [x] Agent can reference calibration in conversation: "You said you're not sure about this. But you've approached it from three angles and arrived at correctness each time."

## Files to Create

- `apps/terrain/app/src/components/SelfCalibration.tsx`
- `apps/terrain/app/src/components/CalibrationSection.tsx`
- `apps/terrain/app/src/lib/calibration-data.ts`

## Dependencies

- 005 (conversation loop — claims captured)
- 008 (margin panel — calibration can render there)

## Completion Log

- calibration-data.ts: computeCalibrationData (reads claim + trust state, computes gap, categorizes into aligned/overclaimed/underclaimed at ±0.1 threshold, computes calibrationPercent, delegates to engine calibrate API)
- CalibrationSection.tsx: renders title (colored per category: inferred for overclaim, verified for underclaim), concept list with glyph/name/detail (claimed X%, evidence Y% or "evidence confirms")
- SelfCalibration.tsx: main view with title, key metric sentence, previousPercent trend (improving/shifted), three CalibrationSections, recommendation from engine, empty state
- CSS: self-calibration (layout, typography), calibration-section (category-colored titles/glyphs, list items with auto-margin detail)
- 18 new tests: calibration-data (7), SelfCalibration+CalibrationSection (11)
