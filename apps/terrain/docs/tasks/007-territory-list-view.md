# 007 — Territory List View (MVP Map)

## Goal

Build the Phase 1 territory list view — the dashboard that proves the trust model produces useful signal before investing in full map visualization. Renders in the left map panel.

## Acceptance Criteria

- [ ] Territory cards render in map panel, one per territory from the domain package
- [ ] Each territory card shows:
  - [ ] Territory name in `--font-voice`, `--text-lg`
  - [ ] Progress bar: filled portion in trust color (`--verified` fill on `--stone-faint` track), percentage right-aligned in `--font-data`
  - [ ] Breakdown: % verified, % inferred, % contested, % untested
  - [ ] Contested concepts called out by name if any
  - [ ] Next threshold readiness checklist if applicable (e.g. "Ready: 2/3 concepts verified (missing: tcp-retransmission-timers)")
- [ ] Territory card styling: background `--ground-soft`, border 1px `--stone-faint`
- [ ] Active territory (currently discussed): left border 2px `--lamp`
- [ ] Hover: background shifts to `--ground-mid` (100ms)
- [ ] Trust glyphs used: ● verified, ◐ contested, ○ inferred, ◌ untested, ◦ decayed
- [ ] Trust state read from engine via `getBulkTrustState` on territory concept IDs
- [ ] Territory list updates when trust state changes during conversation
- [ ] Clicking a territory card updates the margin panel with details

## Files to Create

- `apps/terrain/app/src/components/TerritoryCard.tsx`
- `apps/terrain/app/src/components/TrustGlyph.tsx`
- `apps/terrain/app/src/components/ProgressBar.tsx`
- `apps/terrain/app/src/lib/territory-state.ts` (computes territory aggregates from bulk trust state)

## Dependencies

- 002 (domain loaded with territory groupings)
- 003 (app shell — renders in map panel)
- 005 (conversation loop — trust state updates drive territory re-renders)
