# 008 — Margin Panel (Contextual Annotations)

## Goal

Build the margin panel — the contextual annotation layer that shows trust state details for whatever concept the conversation is currently about. Updates silently as the conversation moves between topics.

## Acceptance Criteria

- [ ] Margin panel displays trust state for current concept:
  - [ ] Concept name in `--font-voice`
  - [ ] Trust level with glyph (● ◐ ○ ◌ ◦) and confidence percentage in `--font-data`
  - [ ] Modalities tested listed
  - [ ] Last verified timestamp
  - [ ] Verification history (event list with modality, result, context, time)
- [ ] Related concepts section: lists connected concepts from graph edges with their trust glyphs
- [ ] Claim history section: shows self-reported claims vs evidence
- [ ] Calibration gap displayed if claims exist
- [ ] Content crossfades when context changes (150ms out, 200ms in)
- [ ] Current concept has faint lamp glow: `box-shadow: 0 0 20px var(--lamp-glow)` — 8% opacity, transitions on topic change (400ms)
- [ ] `explainDecision` accessible: "[see reasoning]" link shows full reasoning trace
- [ ] Numbers in `--font-data`, descriptions in `--font-voice`
- [ ] Panel collapses on mobile, accessible via swipe left or bottom bar

## Files to Create

- `apps/terrain/app/src/components/ConceptDetail.tsx`
- `apps/terrain/app/src/components/VerificationHistory.tsx`
- `apps/terrain/app/src/components/ClaimHistory.tsx`
- `apps/terrain/app/src/components/ReasoningTrace.tsx`

## Dependencies

- 003 (app shell — renders in right panel)
- 005 (conversation loop — determines current concept)
