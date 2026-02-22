# 021 — Goal Setting & Path Suggestions (Phase 3)

## Goal

Implement goal declaration and path visualization. The learner can declare what they want to understand, and the system shows the landscape between here and there.

## Acceptance Criteria

- [ ] Learner can declare a goal: "I want to understand Kubernetes networking"
- [ ] System identifies target concepts, reads graph via `getGraph`, reads trust via `getBulkTrustState`
- [ ] Gap computed: what concepts need trust before goal is reachable
- [ ] Landscape shown: here's where you are, here's where you want to go, here's what's between
- [ ] Path suggestion: a possible route through the graph (not binding — learner navigates)
- [ ] Path rendered on visual map as faint dashed line (`--chalk-faint`)
- [ ] Goals are optional — learner can explore without one
- [ ] Goal progress visible on map and in margin panel

## Files to Create

- `apps/terrain/app/src/components/GoalSetter.tsx`
- `apps/terrain/app/src/lib/goal-engine.ts`
- `apps/terrain/app/src/lib/path-finder.ts`

## Dependencies

- 013 (visual map — path renders on map)
- 005 (conversation loop — goal declared in conversation)
