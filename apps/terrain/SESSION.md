# Terrain — Session Tracking

## Current Task

018 — Threshold Surfacing (Phase 3)

## Quick Status

| Item | Status |
|------|--------|
| Product spec | Done |
| Tech spec | Done |
| Design system | Done |
| Tasks | Done (23 tasks: 001-023) |
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

## Phases

- **Phase 1 (001-010):** Conversation + Grill + Claims + MVP Map
- **Phase 2 (011-015):** Explain + Sandbox + Visual Map + Self-Calibration + Mode Transitions
- **Phase 3 (016-023):** Layout Redesign + App Wiring + Thresholds + Write + Sketch + Sekiro + Goals + Provision

## Last Session

Mode wiring: wired explain mode, sandbox mode, and mode transitions into the conversation loop. conversation-loop.ts now routes through mode manager (learner transitions + agent suggestions), explain engine (depth-calibrated explanations, simpler/deeper adjustment), and sandbox engine (inline code execution with signal extraction). API route gained sandbox-run and end-mode actions, returns mode state. useSession hook tracks mode/sandboxActive/sandboxConceptId, exposes runSandboxCode/closeSandbox. ConversationPanel renders Sandbox inline when active. AppShell passes sandbox props through. 378 terrain tests (+15 new), 79 engine tests, zero regressions.

## Blockers

None.

## Next Steps

Start 018 — Threshold Surfacing (Phase 3).
