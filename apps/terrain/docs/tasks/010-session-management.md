# 010 — Session Management

## Goal

Implement session tracking and returning-learner flow. Track what happened in a session, persist it, and orient the learner when they return.

## Acceptance Criteria

- [x] Session object tracks: concepts touched, verification events recorded, claim events recorded, trust state changes, mode transitions, conversation history
- [x] Session duration displayed in header (`--font-data`, `--stone`)
- [x] On return: agent shows the map with decay applied via `decayTrust`
- [x] Agent mentions decay neutrally: "It's been a few days since you worked with X directly. The foundation is probably still solid, but it's your call whether to check."
- [x] No "welcome back!" or streak language — just the map and orientation
- [x] Learner can resume where they left off or go anywhere else
- [x] Session data persists (database or local storage for MVP)
- [x] Person ID management: create or retrieve person for the session

## Files to Create

- `apps/terrain/app/src/lib/session.ts`
- `apps/terrain/app/src/lib/person.ts`
- `apps/terrain/app/src/components/ReturnFlow.tsx`

## Dependencies

- 005 (conversation loop — session wraps the conversation)
- 007 (territory list — map displays decay state on return)

## Completion Log

- session.ts: createSession, recordSessionEvent, recordTrustUpdates, addConversationTurn, getSessionSummary, save/load via localStorage, sessions index
- person.ts: getOrCreatePersonId, getPersonId, clearPersonId via localStorage
- ReturnFlow: neutral decay orientation ("your call whether to check"), significant decay threshold (>5%), resume/new session actions, days-since-verified display
- CSS: return flow with neutral language, action buttons (text links not boxes)
- 14 new tests: session (7), ReturnFlow component (7)
