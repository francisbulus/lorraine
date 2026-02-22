# experience-task-005: Real-Time Map Updates + Trust Change Flash

## Status: Done

## Summary

Map updates live during conversation. Nodes flash briefly on trust change.

## Changes

- **ConceptNode.tsx** — Tracks previous trustLevel via useRef. When it changes, applies `trust-change-flash` class for 400ms with lamp glow. Added CSS transitions for fill, stroke properties.
- **globals.css** — Added `@keyframes trust-change-flash` (opacity 0.8→0, 400ms) and `.trust-change-flash__glow` class.
- **AppShell.tsx** — MapView always receives live session data in split mode (already the case since MapView always renders).

## Tests

- VisualMap.test.tsx — Added test verifying trust level change applies flash class.
