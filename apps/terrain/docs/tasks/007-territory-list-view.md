# 007 — Territory List View (MVP Map)

## Goal

Build the Phase 1 territory list view — the dashboard that proves the trust model produces useful signal before investing in full map visualization. Renders in the left map panel.

## Acceptance Criteria

- [x] Territory cards render in map panel, one per territory from the domain package
- [x] Each territory card shows:
  - [x] Territory name in `--font-voice`, `--text-lg`
  - [x] Progress bar: filled portion in trust color (`--verified` fill on `--stone-faint` track), percentage right-aligned in `--font-data`
  - [x] Breakdown: % verified, % inferred, % contested, % untested
  - [x] Contested concepts called out by name if any
  - [x] Next threshold readiness checklist if applicable (e.g. "Ready: 2/3 concepts verified (missing: tcp-retransmission-timers)")
- [x] Territory card styling: background `--ground-soft`, border 1px `--stone-faint`
- [x] Active territory (currently discussed): left border 2px `--lamp`
- [x] Hover: background shifts to `--ground-mid` (100ms)
- [x] Trust glyphs used: ● verified, ◐ contested, ○ inferred, ◌ untested, ◦ decayed
- [x] Trust state read from engine via `getBulkTrustState` on territory concept IDs
- [x] Territory list updates when trust state changes during conversation
- [x] Clicking a territory card updates the margin panel with details

## Files to Create

- `apps/terrain/app/src/components/TerritoryCard.tsx`
- `apps/terrain/app/src/components/TrustGlyph.tsx`
- `apps/terrain/app/src/components/ProgressBar.tsx`
- `apps/terrain/app/src/lib/territory-state.ts` (computes territory aggregates from bulk trust state)

## Dependencies

- 002 (domain loaded with territory groupings)
- 003 (app shell — renders in map panel)
- 005 (conversation loop — trust state updates drive territory re-renders)

## Completion Log

- TrustGlyph: typographic glyphs (● ◐ ○ ◌ ◦) with trust-color CSS variables
- ProgressBar: track/fill with smooth width transition (400ms ease-settle), right-aligned font-data percentage
- TerritoryCard: territory name (font-voice, text-lg), progress bar, trust breakdown, contested call-outs, threshold readiness checklist, active state (2px lamp left border), hover (ground-mid 100ms)
- territory-state.ts: computeTerritoryState (verified/inferred/contested/untested counts, progress with inferred half-credit), computeThresholdReadiness (ready/missing, verified vs inferred minimum), buildTrustStateMap
- MapPanel updated to render territory cards with active/threshold/onClick props
- CSS: territory card, progress bar, trust glyph styles following design system exactly
- 22 new tests: territory-state (12), TerritoryCard component (10)
