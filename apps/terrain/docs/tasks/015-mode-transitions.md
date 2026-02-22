# 015 — Mode Transitions (Phase 2)

## Goal

Implement the mode transition system — the agent suggests switching between explain, sandbox, and grill based on conversation context. Transitions are suggestions, not actions.

## Acceptance Criteria

- [ ] Agent detects transition triggers from product spec Section 4:
  - Explain → Sandbox: "Can I try that?" / learner seems ready to experiment
  - Explain → Grill: agent wants to check understanding
  - Sandbox → Explain: learner hits something they can't explain
  - Sandbox → Grill: learner successfully experiments (verify the principle)
  - Grill → Sandbox: learner fails on something practical
  - Any → Write: "Let me explain this back to you"
- [ ] Transitions phrased as suggestions: "Want to see this in code?" "Can you draw that?" "Try explaining this back to me."
- [ ] Learner can decline — conversation continues in current mode
- [ ] Mode context preserved across transitions (conversation history, current concept)
- [ ] No UI mode indicator that feels like tabs or navigation — the conversation just becomes the new mode
- [ ] Transition detection integrated into conversation loop

## Files to Create

- `apps/terrain/app/src/lib/mode-transition.ts`

## Dependencies

- 005 (conversation loop)
- 006 (grill mode)
- 011 (explain mode)
- 012 (sandbox mode)
