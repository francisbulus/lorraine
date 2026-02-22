# 017 — App Wiring (Phase 3)

## Goal

Wire all isolated components and engines into a running application. Connect the conversation input to the conversation loop, feed trust state into the map and drawers, load the domain on init, and make the app functional end-to-end.

## Acceptance Criteria

- [x] API route enhanced: returns trust states, graph data, territories alongside chat response
- [x] Domain alias (`@domains`) configured in webpack and tsconfig
- [x] `better-sqlite3` added to `serverExternalPackages` in next.config
- [x] `useSession` hook manages client-side session state (messages, trust, loading, errors)
- [x] ConversationPanel replaced with live Conversation component wired to API
- [x] AppShell feeds trust/graph/territory data into MapView and drawers
- [x] Concept clicks in map open context drawer with real trust data
- [x] Calibration drawer shows real calibration data when available
- [x] Empty state ("What do you want to learn?") transitions to conversation on first message
- [x] Loading/error states handled (agent thinking indicator, API errors)
- [x] `.env.local.example` created documenting required env vars

## Files to Create

- `apps/terrain/app/src/hooks/useSession.ts`
- `apps/terrain/app/.env.local.example`

## Files to Modify

- `apps/terrain/app/src/app/api/chat/route.ts` (enhance response)
- `apps/terrain/app/src/components/AppShell.tsx` (wire session hook)
- `apps/terrain/app/src/components/ConversationPanel.tsx` (replace with live conversation)
- `apps/terrain/app/next.config.ts` (add @domains alias, serverExternalPackages)
- `apps/terrain/app/tsconfig.json` (add @domains path)

## Dependencies

- 005 (conversation loop)
- 016 (layout redesign — the layout this wires into)

## Completion Log

- API route (`api/chat/route.ts`): enhanced with 3 actions (init/chat/state), returns trustStates + concepts + edges + territories + calibration alongside agentResponse, imports networking domain via `@domains` alias, getSessionState helper computes full state from store
- next.config.ts: added `serverExternalPackages: ['better-sqlite3']`, added `@domains` webpack alias
- tsconfig.json: added `@domains/*` path alias
- useSession hook: manages sessionId, messages, trustUpdates, trustStates, concepts, edges, territories, calibration, loading, error; sendMessage adds learner msg immediately then agent on response; initSession fetches domain metadata; getTrustStateForConcept lookup
- ConversationPanel.tsx: rewritten with props (messages, trustUpdates, onSubmit, loading, error); empty state shows "What do you want to learn?" with Enter-to-submit; has-messages state renders live Conversation + loading/error indicators
- AppShell.tsx: wired useSession hook, initSession on mount, passes session data to ConversationPanel/MapView/Drawer, builds concept detail for drawer from trust state, calibration glyph conditional on real data
- globals.css: added loading-pulse animation, error state styling
- .env.local.example: documents ANTHROPIC_API_KEY
- Renumbered tasks 017-022 → 018-023
- 22 new tests: useSession (8), ConversationPanel (7), AppShell updated (10) — net +15 (replaced 10 old AppShell tests with 10 new + 15 new)
