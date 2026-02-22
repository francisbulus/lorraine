# experience-task-002: Node Visual Overhaul (5 States)

## Status: Done

## Summary

ConceptNode supports 5 visual states including derived "decayed" state (verified with low confidence).

## Changes

- **map-layout.ts** — Added `VisualTrustState`, `deriveVisualTrustState()`, `getNodeFill()`, `getNodeFillOpacity()`, `getNodeStrokeWidth()`, `getLabelFont()`, `getLabelSize()`, `computeZoneOpacity()`, `computeZoneLabelColor()`. Updated `getNodeSize` (verified=10, contested=7, inferred=6, untested/decayed=5), `getNodeColor` (decayed=--stone), `getNodeStrokeDash` (decayed="3 3").
- **ConceptNode.tsx** — Accepts `decayedConfidence` prop. Calls `deriveVisualTrustState`. Uses all new helpers for visual properties. Verified/contested use --font-voice labels at size 11.
- **VisualMap.tsx** — Extended `VisualMapConcept` with `decayedConfidence`. Passes to ConceptNode.
- **globals.css** — Contested pulse updated to 4s.
- **route.ts** — Includes `decayedConfidence` in concepts array.

## Tests

- map-layout.test.ts — Added tests for all new functions (deriveVisualTrustState, getNodeFill, getLabelFont, getLabelSize, getNodeStrokeWidth, computeZoneOpacity, computeZoneLabelColor)
- VisualMap.test.tsx — Updated fixtures to include decayedConfidence
