# experience-task-001: Map as Home + Split Layout

## Status: Done

## Summary

Core architectural change. AppShell defaults to full-viewport map. Click concept → 40/60 split (map left, conversation right). Escape → back to full map.

## Changes

- **AppShell.tsx** — Replaced `appState: 'conversation' | 'map'` with `selectedConcept: string | null`. When null → full map. When set → split layout. Removed binary toggle. Always renders MapView. Conditionally renders ConversationPanel in split.
- **TopBar.tsx** — Removed `AppState` type, `onToggleState` prop, toggle button. Kept title, timer, calibration glyph. Added optional `focusedConcept` display.
- **MapView.tsx** — Removed territory card sidebar (`.map-view__territories`). Territory zones remain in SVG.
- **globals.css** — Added `.app-main--map-full`, `.app-main--split`, `.app-main__map`, `.app-main__conversation`, `.map-hint`. Removed `.conversation-state`, `.conversation-panel__empty`, `.conversation-panel__prompt`, `.conversation-panel__input`. Added mobile responsive rules for split layout.
- **ConversationPanel.tsx** — Removed "What do you want to learn?" empty state. Shows minimal ready state when no messages.

## Tests

- AppShell.test.tsx — Rewritten: "renders map by default", "shows hint text", "clicking concept opens split view", "Escape returns to map", removed toggle tests
- TopBar.test.tsx — Removed toggle button tests, added focused concept tests
- MapView.test.tsx — Removed territory card tests
- ConversationPanel.test.tsx — Updated empty state tests
