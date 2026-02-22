# experience-task-004: Edge + Territory Visual Updates

## Status: Done

## Summary

Edges and territory zones match the spec's visual language.

## Changes

- **GraphEdge.tsx** — Updated `getEdgeStroke` (untested↔untested: --stone-faint, verified↔verified: --stone, mixed: --stone-dim). Added `getEdgeWidth` (untested↔untested: 0.5px, verified↔verified: 1px, mixed: 0.75px, prerequisite: +0.25px).
- **VisualMap.tsx** — Territory zone opacity now scales with ownership (5%→15%) via `computeZoneOpacity`. Territory label color scales with ownership via `computeZoneLabelColor`.
- **map-layout.ts** — Added `computeZoneOpacity()` and `computeZoneLabelColor()`.

## Tests

- map-layout.test.ts — Tests for computeZoneOpacity and computeZoneLabelColor already included in task-002.
