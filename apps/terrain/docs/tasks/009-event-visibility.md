# 009 — Event Visibility & Challengeability

## Goal

Implement the transparency layer required by Invariant 3. Level-change notifications, challenge flow ("test me on this"), and the quiet mode option.

## Acceptance Criteria

- [x] **Level-change notifications:** When a concept changes trust level (untested → inferred, inferred → verified, etc.), an inline annotation appears in conversation:
  - Format: `─── concept-name → level (reason) ───`
  - `--font-data`, `--text-xs`, `--stone`, centered
  - "[see reasoning]" link opens `explainDecision` in margin panel
- [x] **Challenge flow:** Learner can click any concept on the map/margin and:
  - See current trust level and why (verification history + inference chain)
  - Option to challenge: "test me on this" → triggers `requestSelfVerification` → grill mode
- [x] **Quiet mode (optional toggle):** When enabled, implicit signal writes are buffered as "pending signals"
  - Pending signals appear in margin panel
  - Learner can accept or dismiss each pending signal
  - Accepted signals write to core, dismissed signals are discarded
- [x] Level-change toast: translateY 8→0, opacity 0→1, 300ms, auto-dismiss 5s unless interacted with
- [x] All trust state changes traceable — nothing written to core without the learner being able to see it afterward

## Files to Create

- `apps/terrain/app/src/components/LevelChangeNotification.tsx`
- `apps/terrain/app/src/components/ChallengeFlow.tsx`
- `apps/terrain/app/src/components/PendingSignals.tsx`
- `apps/terrain/app/src/lib/quiet-mode.ts`

## Dependencies

- 005 (conversation loop — signals trigger notifications)
- 006 (grill mode — challenge flow triggers grill)
- 008 (margin panel — reasoning trace renders there)

## Completion Log

- LevelChangeNotification: inline annotation (─── concept → level ───), auto-dismiss 5s with interaction pause, [see reasoning] link
- ChallengeFlow: concept trust display with inference source, verification count, "test me on this" button triggering requestSelfVerification
- quiet-mode.ts: toggle, addPending, acceptSignal, dismissSignal, getPending, clear
- PendingSignals: renders buffered signals with accept/dismiss actions in margin panel
- CSS: challenge flow, pending signals, level change reason styling
- 27 new tests: LevelChangeNotification (7), ChallengeFlow (5), PendingSignals (5), quiet-mode (10)
