# 008 — Margin Panel (Contextual Annotations)

## Goal

Build the margin panel — the contextual annotation layer that shows trust state details for whatever concept the conversation is currently about. Updates silently as the conversation moves between topics.

## Acceptance Criteria

- [x] Margin panel displays trust state for current concept:
  - [x] Concept name in `--font-voice`
  - [x] Trust level with glyph (● ◐ ○ ◌ ◦) and confidence percentage in `--font-data`
  - [x] Modalities tested listed
  - [x] Last verified timestamp
  - [x] Verification history (event list with modality, result, context, time)
- [x] Related concepts section: lists connected concepts from graph edges with their trust glyphs
- [x] Claim history section: shows self-reported claims vs evidence
- [x] Calibration gap displayed if claims exist
- [x] Content crossfades when context changes (150ms out, 200ms in)
- [x] Current concept has faint lamp glow: `box-shadow: 0 0 20px var(--lamp-glow)` — 8% opacity, transitions on topic change (400ms)
- [x] `explainDecision` accessible: "[see reasoning]" link shows full reasoning trace
- [x] Numbers in `--font-data`, descriptions in `--font-voice`
- [x] Panel collapses on mobile, accessible via swipe left or bottom bar

## Files to Create

- `apps/terrain/app/src/components/ConceptDetail.tsx`
- `apps/terrain/app/src/components/VerificationHistory.tsx`
- `apps/terrain/app/src/components/ClaimHistory.tsx`
- `apps/terrain/app/src/components/ReasoningTrace.tsx`

## Dependencies

- 003 (app shell — renders in right panel)
- 005 (conversation loop — determines current concept)

## Completion Log

- ConceptDetail: concept name (font-voice), trust level with glyph + confidence (font-data), modalities tested, last verified timestamp, related concepts with trust glyphs, lamp glow header
- VerificationHistory: sorted most-recent-first, result/modality/context/timestamp, color-coded result labels (verified=demonstrated, contested=failed, inferred=partial)
- ClaimHistory: calibration gap with overclaiming/underclaiming/aligned labels, confidence percentage, quoted context, timestamps
- ReasoningTrace: collapsible "[see reasoning]" toggle, expandable content area
- MarginPanel updated with conceptDetail prop and crossfade animation (200ms)
- CSS: concept detail header lamp glow, section titles, verification/claim list styling, reasoning trace toggle
- 22 new tests: MarginPanel (3), ConceptDetail (6), VerificationHistory (4), ClaimHistory (6), ReasoningTrace (3)
