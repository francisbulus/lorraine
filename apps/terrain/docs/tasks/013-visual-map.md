# 013 — Visual Map (Phase 2)

## Goal

Replace the territory list view with the full visual concept graph with trust overlay, fog of war, and territory regions. The map pinned to the wall.

## Acceptance Criteria

- [ ] Concept graph rendered as a node-edge visualization in the map panel
- [ ] Visual encoding per design system:
  - Verified: solid dots, `--verified`, full size
  - Inferred: open dots, `--inferred`, slightly smaller
  - Contested: half-filled dots, `--contested`, slow pulse (opacity 0.7→1.0, 3s)
  - Untested: faint dots, `--fog`, smallest
- [ ] Edges: thin lines, `--stone-faint` default, `--stone` between verified concepts
- [ ] Territories: subtle background regions, no borders, barely perceptible tint
- [ ] Learner position: `--lamp` ring around currently discussed concept
- [ ] Goals: faint dashed path from current position to goal (`--chalk-faint`)
- [ ] Hover on concept: tooltip with name + trust state (`--font-data`, `--text-xs`)
- [ ] Click on concept: margin panel updates with full trust details
- [ ] Zoom and pan: smooth, momentum-based
- [ ] Map never auto-zooms or auto-navigates (Policy A: mapmaker, not guide)
- [ ] Map updates when trust state changes (bar width transition 400ms, glyph crossfade 200ms)
- [ ] Territory list view preserved as an alternative view toggle

## Files to Create

- `apps/terrain/app/src/components/VisualMap.tsx`
- `apps/terrain/app/src/components/ConceptNode.tsx`
- `apps/terrain/app/src/components/GraphEdge.tsx`
- `apps/terrain/app/src/lib/map-layout.ts`

## Dependencies

- 007 (territory list — this replaces/supplements it)
- 005 (conversation loop — map reflects trust state)
