# 003 — App Shell & Layout

## Goal

Build the three-panel layout (map, conversation, margin) following the design system's room metaphor. This is the spatial structure all features render into.

## Acceptance Criteria

- [x] Desktop layout: left panel (map, 260px collapsible), center (conversation, 600-800px flex), right panel (margin, 240px collapsible)
- [x] Mobile layout: conversation full-screen, map and margin accessible via swipe or bottom tabs
- [x] Bottom bar with zone indicators: Map, Conversation, Modes, Calibration
- [x] Panel borders: 1px `--stone-faint`, no shadows
- [x] Header: "terrain" top-left in `--font-system`, `--stone`
- [x] Session duration display top-right in `--font-data`, `--stone`
- [x] Panels collapse/expand smoothly (300ms, `--ease-settle`)
- [x] No modals anywhere — all content renders inline in panels
- [x] Border radius: 4px maximum on all elements
- [x] Responsive breakpoints: desktop (>1024px), tablet (768-1024px), mobile (<768px)
- [x] First session empty state: centered "What do you want to learn?" in `--font-voice`, `--text-xl`, `--chalk` with input below

## Files to Create

- `apps/terrain/app/src/components/AppShell.tsx`
- `apps/terrain/app/src/components/MapPanel.tsx`
- `apps/terrain/app/src/components/MarginPanel.tsx`
- `apps/terrain/app/src/components/ConversationPanel.tsx`
- `apps/terrain/app/src/components/BottomBar.tsx`

## Dependencies

- 001 (Next.js project with design system tokens)

## Completion Log

- Three-panel layout with collapsible map/margin panels
- Map toggles via Map zone button, margin via Calibration zone button
- 300ms transitions using --ease-settle
- Tablet breakpoint reduces panel widths, mobile hides side panels
- 8 tests covering rendering, panel toggling, empty state, bottom bar
