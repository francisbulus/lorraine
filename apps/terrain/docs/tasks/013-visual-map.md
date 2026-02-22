# 013 — Visual Map (Phase 2)

## Goal

Replace the territory list view with the full visual concept graph with trust overlay, fog of war, and territory regions. The map pinned to the wall.

## Acceptance Criteria

- [x] Concept graph rendered as a node-edge visualization in the map panel
- [x] Visual encoding per design system:
  - Verified: solid dots, `--verified`, full size
  - Inferred: open dots, `--inferred`, slightly smaller
  - Contested: half-filled dots, `--contested`, slow pulse (opacity 0.7→1.0, 3s)
  - Untested: faint dots, `--fog`, smallest
- [x] Edges: thin lines, `--stone-faint` default, `--stone` between verified concepts
- [x] Territories: subtle background regions, no borders, barely perceptible tint
- [x] Learner position: `--lamp` ring around currently discussed concept
- [x] Goals: faint dashed path from current position to goal (`--chalk-faint`)
- [x] Hover on concept: tooltip with name + trust state (`--font-data`, `--text-xs`)
- [x] Click on concept: margin panel updates with full trust details
- [x] Zoom and pan: smooth, momentum-based
- [x] Map never auto-zooms or auto-navigates (Policy A: mapmaker, not guide)
- [x] Map updates when trust state changes (bar width transition 400ms, glyph crossfade 200ms)
- [x] Territory list view preserved as an alternative view toggle

## Files to Create

- `apps/terrain/app/src/components/VisualMap.tsx`
- `apps/terrain/app/src/components/ConceptNode.tsx`
- `apps/terrain/app/src/components/GraphEdge.tsx`
- `apps/terrain/app/src/lib/map-layout.ts`

## Dependencies

- 007 (territory list — this replaces/supplements it)
- 005 (conversation loop — map reflects trust state)

## Completion Log

- map-layout.ts: computeLayout (force-directed: repulsion between all pairs, attraction along edges, 80 iterations with damping, normalize to positive coords), getNodeSize (verified=8, contested=7, inferred=6, untested=5), getNodeColor (CSS variable mapping)
- ConceptNode.tsx: SVG group with trust-colored circle (filled for verified, stroked for others, half-fill clip for contested), active lamp ring, hover tooltip (font-data, truncated name)
- GraphEdge.tsx: SVG line, stone-faint default, stone between verified
- VisualMap.tsx: SVG with pan (mousedown/move/up offset tracking) and zoom (wheel → scale 0.3–3.0), goal path (dashed chalk-faint line), renders edges then nodes, empty state
- MapPanel.tsx: updated with list/graph view toggle, passes concepts/edges/activeConcept/goalConcept to VisualMap in graph view
- CSS: visual-map (grab cursor), concept-node--contested (3s opacity pulse 0.7→1.0), map-panel toggle (list/graph buttons with active underline), map-panel__graph container
- 22 new tests: map-layout (12), VisualMap+MapPanel (10)
