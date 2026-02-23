# VR-001: CLI Visual Refinements

**Status:** In Progress
**Priority:** P1
**Scope:** CLI display commands (status, ready, reviewers, why, calibrate)

## Goal

Polish CLI output to be screenshot-worthy: confidence bars, color gradients, aligned columns, styled headers, and consistent spacing across all 5 display commands.

## Acceptance Criteria

- [ ] Shared utilities: `renderBar`, `colorForLevelGradient`, `renderHeader`, `renderSeparator`, layout constants
- [ ] `iconForLevel` uses `chalk.redBright` for contested
- [ ] `formatTimeAgo` supports weeks (`2w ago`)
- [ ] `printStatusTable` uses new header/separator/bar layout
- [ ] `printReadinessTable` uses PASS/BLOCK with hard/soft gate labels
- [ ] `printReviewerTable` uses bars with right-aligned coverage
- [ ] `formatExplanation` uses new header, blank lines between evidence, inference bars
- [ ] `printCalibration` uses bars for stale percentage, indented sub-explanations
- [ ] All JSON output paths unchanged
- [ ] All tests pass

## What Does NOT Change

- All JSON output paths (`--format json`)
- Command signatures, options, exit codes
- Engine code
- Scoring/evaluation logic
- Domain, ingest, store, config modules
