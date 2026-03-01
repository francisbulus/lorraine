# Lorraine: Scoring Algorithm

**Version:** 0.1<br>
**Last Updated:** March 1, 2026

This document describes how the engine computes trust level and confidence from verification events. The implementation lives in `engine/trust/scoring.ts`.

---

## 1. Purpose

Given a sequence of verification events for a person and concept, produce a trust level and a raw confidence score. This is the foundation of all derived trust state. Every other computation (propagation, decay, calibration) builds on the output of scoring.

---

## 2. Inputs

`computeTrustFromHistory` takes two arguments:

1. **history**: an array of `VerificationEvent` objects, each with a `modality` and a `result` (demonstrated, failed, or partial).
2. **existing**: the current trust level, confidence, and inference chain for the concept. This is used only when the history contains exclusively failure events and the concept already has verified or inferred trust.

---

## 3. Event Classification

The function begins by sorting events into three buckets:

- **demonstrated**: the person showed understanding.
- **failed**: the person did not show understanding.
- **partial**: the person showed some understanding but not complete.

Two boolean flags derive from these buckets:

- `hasSuccess` is true when there are demonstrated or partial events.
- `hasFailure` is true when there are failed events.

---

## 4. Decision Branches

### 4.1 No events

If the history is empty, the result is `untested` with confidence 0.

### 4.2 Contested: success and failure coexist

When both `hasSuccess` and `hasFailure` are true, the concept is contested. The confidence formula:

```
successWeight = demonstrated.length + (partial.length * 0.5)
totalWeight   = successWeight + failed.length
baseConfidence = successWeight / totalWeight

modalityBonus = max(0, (distinctDemonstratedModalities - 1) * CROSS_MODALITY_CONFIDENCE_BONUS)

confidence = min(1.0, baseConfidence + modalityBonus)
```

The trust level is always `contested`. The confidence reflects the proportion of successful evidence, boosted by cross-modality breadth of the demonstrated events.

### 4.3 Verified with demonstrated events

When there are demonstrated events and no failures:

```
maxStrength   = max modality strength across all demonstrated modalities
modalityBonus = max(0, (distinctModalities - 1) * CROSS_MODALITY_CONFIDENCE_BONUS)
partialBonus  = 0.05 if any partial events exist, else 0

confidence = min(1.0, maxStrength + modalityBonus + partialBonus)
```

Modality strengths come from the `MODALITY_STRENGTH` table in `engine/types.ts`. They range from 0.3 (`grill:recall`) to 0.95 (`integrated:use`). The strongest modality sets the baseline. Additional modalities add 0.1 each. Partial results contribute a small bonus (0.05) to acknowledge incomplete evidence without inflating confidence.

The trust level is `verified`.

### 4.4 Verified with only partial events

When there are partial events but no demonstrated or failed events:

```
maxStrength = max modality strength across all partial modalities
confidence  = min(1.0, maxStrength * 0.5)
```

The 0.5 multiplier reflects that partial evidence is weaker than full demonstration. The trust level is still `verified` because some positive signal exists.

### 4.5 Failed only, with existing trust

When all events are failures and the concept already has verified or inferred trust (from a prior computation or from propagation), the result is `contested` with confidence 0.2. This ensures that new failure evidence does not silently overwrite previously established trust. The contestation makes the conflict visible.

### 4.6 Failed only, no existing trust

When all events are failures and the concept has no prior trust, the result is `untested` with confidence 0. Failure alone does not establish a trust level.

---

## 5. Modality Strength Table

| Modality | Strength | What it tests |
|---|---|---|
| `grill:recall` | 0.3 | Can the person recite facts? |
| `grill:inference` | 0.5 | Can the person reason from facts? |
| `grill:discrimination` | 0.6 | Can the person distinguish correct from incorrect? |
| `sketch:diagram` | 0.6 | Can the person draw the structure? |
| `sketch:process` | 0.6 | Can the person draw the process? |
| `grill:transfer` | 0.7 | Can the person apply understanding to novel situations? |
| `sandbox:execution` | 0.7 | Can the person build it from scratch? |
| `write:explanation` | 0.7 | Can the person explain it clearly? |
| `external:observed` | 0.8 | Has the person been observed performing it in practice? |
| `sandbox:debugging` | 0.85 | Can the person find and fix the problem? |
| `write:teaching` | 0.85 | Can the person teach it to someone else? |
| `integrated:use` | 0.95 | Does the person use the concept naturally in real work? |

---

## 6. Cross-Modality Confidence Bonus

`CROSS_MODALITY_CONFIDENCE_BONUS = 0.1`

Each additional distinct modality (beyond the first) that has produced a demonstrated result adds 0.1 to the confidence. This rewards breadth of evidence. A person who demonstrates understanding through three different modalities receives a 0.2 bonus on top of the strongest modality's base strength.

This bonus applies in both the contested and verified branches. In the contested case, only demonstrated modalities count toward the bonus (partial and failed events do not).

---

## 7. Relationship to Other Computations

Scoring produces raw confidence. Two further computations transform this before it reaches callers:

1. **Decay** (`engine/trust/decay.ts`): applies exponential time decay to the raw confidence based on how long ago the last verification occurred. The decayed confidence is what applications see.

2. **Propagation** (`engine/trust/projector.ts`): takes a scored event and ripples its implications across the concept graph. Propagated trust is always inferred, never verified. The propagation signal starts from the scored confidence and attenuates at each hop.

Scoring runs once per event replay during projection. The projector sorts all events by timestamp, replays them in order, and calls `computeTrustFromHistory` at each step to rebuild the cumulative trust state.

---

## 8. Design Choices

**Why max modality strength and not average?** The strongest modality represents the best evidence. A grill:recall event (0.3) should not dilute a sandbox:debugging event (0.85). The strongest signal wins; additional modalities only add.

**Why is partial treated as half-weight in contested?** Partial evidence shows some understanding but leaves doubt. Counting it at 0.5 in the contested ratio prevents it from tipping the balance as strongly as full demonstration.

**Why does failed-only with existing trust produce 0.2 confidence?** This is a floor. Failure events invalidate prior inference or verification, but the system preserves a minimal contested state rather than silently resetting to untested. The contestation surfaces the conflict.

**Why is the result capped at 1.0?** Confidence is a bounded value. Cross-modality bonuses and partial bonuses can push the sum above 1.0, so a `min(1.0, ...)` clamp is always applied.
