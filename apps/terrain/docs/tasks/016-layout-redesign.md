# 016 — Layout Redesign (Phase 3)

## Goal

Replace the three-column layout + bottom bar with a two-state architecture: full-width conversation (default) and full-viewport map (alternate), with slide-in drawers for concept detail and calibration.

## Acceptance Criteria

- [x] Three-column layout removed (map panel, margin panel as persistent columns)
- [x] Bottom bar removed (Map / Conversation / Modes / Calibration)
- [x] **State 1: Conversation (default)**
  - Full width, centered, 640px max-width, generous margins
  - `terrain` top-left in `--font-system`, `--stone`
  - Top-right cluster: `⊘` glyph (calibration drawer), session timer in `--font-data --stone`, map toggle (`map` in `--stone`, switches to State 2)
  - Agent messages in `--font-voice` (serif), learner messages in `--font-hand` (quasi-mono), no chat bubbles
  - Trust state changes appear inline between messages
  - Concept names in conversation are clickable (open context drawer)
  - First session empty state: "What do you want to learn?" centered, input below
- [x] **Context drawer**
  - Slides from right edge, 320px wide
  - Shows concept detail (ConceptDetail, VerificationHistory, ClaimHistory, ReasoningTrace)
  - Triggered by clicking concept names, `Cmd/Ctrl+.`
  - Dismissed by clicking outside, Escape, or X
  - Mobile: slides up from bottom
- [x] **Calibration drawer**
  - Same drawer mechanism, slides from right
  - Shows SelfCalibration component
  - Triggered by `⊘` glyph
- [x] **State 2: Map (alternate)**
  - Full viewport, conversation disappears
  - Same top bar with toggle showing `conversation` or back arrow
  - Visual concept graph fills viewport
  - Territory list as overlay/sidebar
  - Click concept opens context drawer
  - Current topic highlighted with `--lamp`
- [x] Switching: top-right toggle, `Cmd/Ctrl+M`, agent can offer
- [x] Mobile: full screen for both, drawers slide up from bottom
- [x] Keyboard shortcuts: `Cmd/Ctrl+M` (toggle map), `Cmd/Ctrl+.` (context drawer), Escape (close drawer)

## Files to Create

- `apps/terrain/app/src/components/Drawer.tsx`
- `apps/terrain/app/src/components/TopBar.tsx`
- `apps/terrain/app/src/components/MapView.tsx`

## Files to Modify

- `apps/terrain/app/src/components/AppShell.tsx` (replace entirely)
- `apps/terrain/app/src/app/globals.css` (replace layout CSS)

## Dependencies

- 003 (app shell — replacing it)
- 004 (conversation UI — reusing Conversation, Message, ConversationInput)
- 007 (territory list — overlay in map state)
- 008 (margin panel — concept detail moves to drawer)
- 013 (visual map — fills map state viewport)
- 014 (self-calibration — moves to calibration drawer)

## Completion Log

- AppShell.tsx: replaced three-column layout + BottomBar with two-state architecture (conversation/map), DrawerState management for concept+calibration drawers, keyboard shortcuts (Cmd/Ctrl+M for map toggle, Cmd/Ctrl+. for context drawer, Escape for close)
- TopBar.tsx: terrain title, calibration glyph (⊘, conditional on data), session timer, map/conversation toggle
- Drawer.tsx: slide-in panel from right (320px), Escape to close, click-outside to close, X button, aria-hidden/dialog roles, mobile: slides up from bottom (70vh, border-radius top)
- MapView.tsx: full-viewport VisualMap + territory overlay sidebar (240px, gradient fade)
- globals.css: replaced panel-map-width/panel-margin-width/panel-conversation tokens with conversation-max-width/drawer-width, new top-bar/drawer/map-view/conversation-state styles, mobile responsive (drawer slides from bottom, territory sidebar as bottom sheet)
- 25 new tests: AppShell (10), Drawer (10), TopBar (8), MapView (5) — but net +25 (replaced 8 old AppShell tests with 10 new)
- Existing tests unchanged: MarginPanel/ConceptDetail/etc tests still pass since components still exist
