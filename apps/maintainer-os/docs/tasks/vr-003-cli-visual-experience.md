# VR-003: CLI Visual Experience

**Status:** Not Started
**Priority:** P1
**Scope:** Full visual redesign of all CLI display commands

## Goal

Transform the CLI from polished output into a war room console. Box-drawing frames, two-line concepts, double-line emphasis for blockers/verdicts, position markers for calibration, and breathing room throughout.

## Acceptance Criteria

### Layout & Framing
- [ ] Every command output uses box-drawing frame (┌─┐ │ └─┘)
- [ ] Top-left: view name, top-right: subject (person, concepts, etc.)
- [ ] Bottom border carries summary metadata (calibration, timestamp, detail hint)
- [ ] 2-space indent for all content inside frames
- [ ] 4-space indent for sub-details
- [ ] Content never touches the frame border (minimum 1 space padding)

### Status Command
- [ ] Full box-drawing frame with metadata in borders
- [ ] Each concept gets TWO lines: data line + dim detail line (time + modality/source)
- [ ] Blank line between every concept entry
- [ ] Section dividers are thin lines (─), lighter than the frame
- [ ] Calibration summary lives in the bottom border

### Ready Command
- [ ] GATES section for passing gates
- [ ] BLOCKERS section uses double-line frame (╔═╗ ║ ╚═╝) that breaks the normal frame
- [ ] Each gate/blocker gets two lines: data + detail (gate type + current level)
- [ ] VERDICT line with double-line emphasis band (═══)
- [ ] NOT READY in chalk.redBright.bold, READY in chalk.greenBright.bold
- [ ] Next step commands wrapped across two lines with indentation

### Reviewers Command
- [ ] Reviewer headers use horizontal rule with rank + name + coverage: `1 ─── bob ─── 2/2 verified`
- [ ] Each concept gets two lines: data + detail (level + time)
- [ ] Contested concepts show ⚡ glyph on detail line
- [ ] Stale concepts show (stale) callout in dim
- [ ] Person-level ⚠ warning glyph when any concept is contested
- [ ] Footer detail hint in bottom border

### Why Command
- [ ] Evidence entries use vertical pipe │ timeline
- [ ] Numbered, dated entries with modality and result on header line
- [ ] Context quoted below with pipe continuity
- [ ] Calibration gap gets inline number line visualization: `◄──────●─────────►`
- [ ] Result words colored: green demonstrated, red failed, yellow partial
- [ ] EVIDENCE, CLAIMS, DOWNSTREAM, CALIBRATION as section headers
- [ ] Double-line separator before evidence section

### Calibrate Command
- [ ] Overconfidence/underconfidence use POSITION markers on a number line (█ at position)
- [ ] Prediction accuracy and stale coverage use standard fill bars
- [ ] Claim calibration uses position marker
- [ ] Each metric: visualization on its own line, sub-explanation below
- [ ] Recommendation separated by double-line divider, prefixed with ℹ

### Shared Infrastructure
- [ ] `renderFrame(title, subject, content[], footer?)` utility in formatters.ts
- [ ] `renderDoubleFrame(content[])` for blocker sections
- [ ] `renderPositionMarker(value, width)` for scalar position on a number line
- [ ] `renderReviewerHeader(rank, name, coverage)` for reviewer shelves
- [ ] `renderTimeline(entries[])` for evidence chain pipe layout
- [ ] Dynamic frame width based on content (capped at terminal width or 60)
- [ ] All existing tests still pass
- [ ] All JSON output paths unchanged

### Anti-Patterns Avoided
- [ ] No emoji (Unicode glyphs only)
- [ ] No color without meaning
- [ ] No truncated concept names
- [ ] No "Success!" or "Error!" labels

## Design Spec

See `docs/specs/visual-experience.md` for the full design specification.
