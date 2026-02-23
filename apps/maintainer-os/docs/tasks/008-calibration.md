# 008 — Calibration Display (Phase 1)

## Goal

Implement `mos calibrate` to show model accuracy and person self-calibration metrics.

## Acceptance Criteria

- [ ] `mos calibrate --person <id>` calls engine `calibrate` and displays all metrics
- [ ] Output includes: prediction accuracy, overconfidence bias, underconfidence bias, stale percentage, surprise rate, claim calibration, recommendation
- [ ] Each metric has a brief inline explanation (what it means, not just the number)
- [ ] Recommendation section is actionable: what to verify next, what claims to revisit
- [ ] Handles insufficient data gracefully: "Not enough verification history for reliable calibration. N events recorded, recommend at least M."
- [ ] Tests: calibration with sufficient data, calibration with sparse data

## Files to Create

- `apps/maintainer-os/cli/src/commands/calibrate.ts`
- `apps/maintainer-os/cli/src/commands/calibrate.test.ts`

## Dependencies

- 004 (enough events to calibrate against)
