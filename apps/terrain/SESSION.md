# Terrain — Session Tracking

## Current Task

018 — Threshold Surfacing (Phase 3)

## Quick Status

| Item | Status |
|------|--------|
| Product spec | Done |
| Tech spec | Done |
| Design system | Done |
| Tasks | Done (24 tasks: 001-024) |
| Build | In progress |

## Task Progress

| # | Task | Status |
|---|------|--------|
| 001 | Next.js Project Setup | Done |
| 002 | Networking Domain Package | Done |
| 003 | App Shell & Layout | Done |
| 004 | Conversation UI | Done |
| 005 | Conversation Loop (Backend) | Done |
| 006 | Grill Mode | Done |
| 007 | Territory List View (MVP Map) | Done |
| 008 | Margin Panel | Done |
| 009 | Event Visibility & Challengeability | Done |
| 010 | Session Management | Done |
| 011 | Explain Mode (Phase 2) | Done |
| 012 | Sandbox Mode (Phase 2) | Done |
| 013 | Visual Map (Phase 2) | Done |
| 014 | Self-Calibration View (Phase 2) | Done |
| 015 | Mode Transitions (Phase 2) | Done |
| 016 | Layout Redesign (Phase 3) | Done |
| 017 | App Wiring (Phase 3) | Done |
| 018 | Threshold Surfacing (Phase 3) | Pending |
| 019 | Write Mode (Phase 3) | Pending |
| 020 | Sketch Mode (Phase 3) | Pending |
| 021 | Sekiro Prompts (Phase 3) | Pending |
| 022 | Goals & Path Suggestions (Phase 3) | Pending |
| 023 | Provision Mode (Phase 3) | Pending |
| 024 | Conversation Page Feel (Phase 3) | Pending |

## Experience Tasks (Map-First Redesign)

| # | Task | Status |
|---|------|--------|
| E-001 | Map as Home + Split Layout | Done |
| E-002 | Node Visual Overhaul (5 States) | Done |
| E-003 | Focus-Concept API + Scoped Opening | Done |
| E-004 | Edge + Territory Visual Updates | Done |
| E-005 | Real-Time Map Updates + Trust Change Flash | Done |
| E-006 | Test Suite Alignment | Done |

## Phases

- **Phase 1 (001-010):** Conversation + Grill + Claims + MVP Map
- **Phase 2 (011-015):** Explain + Sandbox + Visual Map + Self-Calibration + Mode Transitions
- **Phase 3 (016-024):** Layout Redesign + App Wiring + Thresholds + Write + Sketch + Sekiro + Goals + Provision + Page Feel
- **Experience Tasks (E-001–E-006):** Map-first architecture, 5-state node visuals, focus-concept API, edge/territory visuals, real-time map updates

## Last Session

Map-first architecture redesign (experience tasks E-001–E-006). Inverted the app: map IS the app, conversation is a tool opened from the map. AppShell now defaults to full-viewport map with all concepts visible. Click concept → 40/60 split layout (map left, conversation right) with agent generating contextual opening based on trust state. Escape → back to full map. Removed "What do you want to learn?" empty state, toggle button, territory card sidebar. ConceptNode now supports 5 visual states (verified/inferred/untested/contested/decayed) with distinct size, fill, stroke, label font/size. Verified nodes are largest (10px) with serif labels. Edges scale by trust (untested↔untested nearly invisible at 0.5px, verified↔verified at 1px). Territory zones scale opacity with ownership (5%→15%). Nodes flash on trust change (400ms lamp glow). Added focusConcept API to conversation-loop, route, and useSession. 423 terrain tests (+28 new), 79 engine tests, zero failures.

## Blockers

None.

## Next Steps

Start 018 — Threshold Surfacing (Phase 3).
