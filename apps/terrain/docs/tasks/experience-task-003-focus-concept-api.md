# experience-task-003: Focus-Concept API + Scoped Opening

## Status: Done

## Summary

Click concept → agent generates contextual opening message based on trust state.

## Changes

- **conversation-loop.ts** — Added `focusConcept(conceptId)` method. Builds context based on trust state (untested/inferred/verified/contested/decayed), calls `generateAgentResponse` with contextual block, pushes to history.
- **route.ts** — Added `'focus-concept'` to action union. Handler validates conceptId, calls `session.loop.focusConcept()`, returns response with state.
- **useSession.ts** — Added `focusConcept(conceptId)` callback and `focusedConceptId` to SessionState. Sends focus-concept action, adds agent message to messages.
- **AppShell.tsx** — Wired `handleConceptClick` to call `session.focusConcept(id)`.

## Tests

- conversation-loop.test.ts — Added test for focusConcept returning contextual opening.
- useSession.test.ts — Added test for focusConcept sending correct action and adding agent message.
- AppShell.test.tsx — Added test for clicking concept triggering focusConcept.
