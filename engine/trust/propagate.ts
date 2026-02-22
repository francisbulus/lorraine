// propagateTrust — computes ripple effects across the graph when a verification event occurs.
//
// The five hardcoded propagation rules (from engine-api.md):
//   1. Verification never propagates as verification. Only as inference.
//   2. Inference attenuates with distance.
//   3. Failure propagates more aggressively than success.
//   4. Cross-modality verification strengthens the propagation signal.
//   5. Time decay applies to propagated trust just as it does to direct trust.

import type { VerificationEvent, PropagationResult, TrustLevel } from '../types.js';
import {
  PROPAGATION_ATTENUATION,
  FAILURE_PROPAGATION_MULTIPLIER,
  PROPAGATION_THRESHOLD,
  CROSS_MODALITY_CONFIDENCE_BONUS,
} from '../types.js';
import type { Store } from '../store/interface.js';

export interface PropagateTrustInput {
  learnerId: string;
  sourceConceptId: string;
  verificationEvent: VerificationEvent;
}

export function propagateTrust(
  store: Store,
  input: PropagateTrustInput
): PropagationResult[] {
  const results: PropagationResult[] = [];
  const visited = new Set<string>();

  // Get the source concept's trust state to compute the signal strength.
  const sourceState = store.getTrustState(input.learnerId, input.sourceConceptId);
  if (!sourceState) return results;

  // Cross-modality bonus on the source strengthens propagation.
  const modalityBonus = Math.max(0, (sourceState.modalitiesTested.length - 1) * CROSS_MODALITY_CONFIDENCE_BONUS);

  // Base signal strength depends on the verification result.
  let baseSignal: number;
  const isFailed = input.verificationEvent.result === 'failed';

  if (isFailed) {
    // Failure: propagate aggressively (Rule 3).
    baseSignal = sourceState.confidence * FAILURE_PROPAGATION_MULTIPLIER;
  } else if (input.verificationEvent.result === 'demonstrated') {
    baseSignal = sourceState.confidence + modalityBonus;
  } else {
    // Partial
    baseSignal = sourceState.confidence * 0.5 + modalityBonus;
  }

  // BFS propagation through the graph.
  propagateStep(
    store,
    input.learnerId,
    input.sourceConceptId,
    baseSignal,
    isFailed,
    1, // starting at distance 1 from source
    visited,
    results
  );

  return results;
}

function propagateStep(
  store: Store,
  learnerId: string,
  conceptId: string,
  signalStrength: number,
  isFailed: boolean,
  depth: number,
  visited: Set<string>,
  results: PropagationResult[]
): void {
  visited.add(conceptId);

  // Get all edges from this concept (outgoing connections).
  const edges = store.getEdgesFrom(conceptId);

  for (const edge of edges) {
    const targetId = edge.toConceptId;
    if (visited.has(targetId)) continue;

    // Rule 2: Inference attenuates with distance.
    const attenuatedSignal = signalStrength * edge.inferenceStrength * Math.pow(PROPAGATION_ATTENUATION, depth - 1);

    // Stop if signal is too weak.
    if (attenuatedSignal < PROPAGATION_THRESHOLD) continue;

    const currentState = store.getTrustState(learnerId, targetId);
    const previousLevel: TrustLevel = currentState?.level ?? 'untested';
    const previousConfidence = currentState?.confidence ?? 0;

    let newLevel: TrustLevel;
    let newConfidence: number;

    if (isFailed) {
      // Rule 3: Failure propagates aggressively.
      // Reduce confidence on connected concepts.
      newConfidence = Math.max(0, previousConfidence - attenuatedSignal);

      if (previousLevel === 'verified' && newConfidence < previousConfidence) {
        // Verified concept undermined by upstream failure → contested.
        newLevel = 'contested';
      } else if (previousLevel === 'inferred') {
        newLevel = newConfidence > 0 ? 'inferred' : 'untested';
      } else {
        newLevel = previousLevel;
      }
    } else {
      // Rule 1: Success never propagates as verified. Only as inferred.
      newConfidence = Math.min(1.0, Math.max(previousConfidence, attenuatedSignal));

      if (previousLevel === 'untested' || previousLevel === 'inferred') {
        newLevel = 'inferred';
      } else {
        // Verified or contested — don't downgrade to inferred.
        newLevel = previousLevel;
      }
    }

    // Only record if something changed.
    if (newLevel !== previousLevel || Math.abs(newConfidence - previousConfidence) > 0.001) {
      const inferredFrom = currentState?.inferredFrom ?? [];
      if (!isFailed && !inferredFrom.includes(conceptId)) {
        inferredFrom.push(conceptId);
      }

      store.upsertTrustState({
        learnerId,
        conceptId: targetId,
        level: newLevel,
        confidence: newConfidence,
        lastVerified: currentState?.lastVerified ?? null,
        inferredFrom,
        modalitiesTested: currentState?.modalitiesTested ?? [],
      });

      results.push({
        conceptId: targetId,
        previousLevel,
        previousConfidence,
        newLevel,
        newConfidence,
        inferenceStrength: attenuatedSignal,
        reason: isFailed
          ? `Failure on ${conceptId} reduced trust (signal: ${attenuatedSignal.toFixed(3)}, depth: ${depth})`
          : `Inferred from verified ${conceptId} (signal: ${attenuatedSignal.toFixed(3)}, depth: ${depth})`,
      });

      // Continue propagation deeper.
      propagateStep(
        store,
        learnerId,
        targetId,
        attenuatedSignal,
        isFailed,
        depth + 1,
        visited,
        results
      );
    }
  }
}
