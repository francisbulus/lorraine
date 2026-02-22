# 015 — Mode Transitions (Phase 2)

## Goal

Implement the mode transition system — the agent suggests switching between explain, sandbox, and grill based on conversation context. Transitions are suggestions, not actions.

## Acceptance Criteria

- [x] Agent detects transition triggers from product spec Section 4:
  - Explain → Sandbox: "Can I try that?" / learner seems ready to experiment
  - Explain → Grill: agent wants to check understanding
  - Sandbox → Explain: learner hits something they can't explain
  - Sandbox → Grill: learner successfully experiments (verify the principle)
  - Grill → Sandbox: learner fails on something practical
  - Any → Write: "Let me explain this back to you"
- [x] Transitions phrased as suggestions: "Want to see this in code?" "Can you draw that?" "Try explaining this back to me."
- [x] Learner can decline — conversation continues in current mode
- [x] Mode context preserved across transitions (conversation history, current concept)
- [x] No UI mode indicator that feels like tabs or navigation — the conversation just becomes the new mode
- [x] Transition detection integrated into conversation loop

## Files to Create

- `apps/terrain/app/src/lib/mode-transition.ts`

## Dependencies

- 005 (conversation loop)
- 006 (grill mode)
- 011 (explain mode)
- 012 (sandbox mode)

## Completion Log

- mode-transition.ts: 5 modes (conversation/explain/sandbox/grill/write), detectLearnerTransition (ordered pattern matching — write before explain to handle "let me explain"), suggestTransition (8 context-based rules: explain→sandbox after 3 turns, explain→grill after 4, sandbox→explain on failure, sandbox→grill on success, grill→sandbox on failure, grill→explain on partial, conversation→explain with concept, grill→write on demonstrated), createModeManager (stateful: mode/turns/concept/grillResult/sandboxResult tracking, processUtterance combining learner+agent detection)
- 25 new tests: detectLearnerTransition (7), suggestTransition (8), createModeManager (10)
