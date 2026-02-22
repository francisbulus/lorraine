// decayTrust — time-based degradation of trust confidence.
// Implements Ebbinghaus-inspired exponential decay with two modifiers:
//   1. Cross-modality depth: more modalities tested = slower decay
//   2. Structural importance: more downstream dependents = slower decay

import type { DecayResult } from '../types.js';
import {
  BASE_DECAY_HALF_LIFE_DAYS,
  CROSS_MODALITY_DECAY_BONUS,
  STRUCTURAL_IMPORTANCE_DECAY_BONUS,
} from '../types.js';
import type { Store } from '../store/interface.js';

const MS_PER_DAY = 86_400_000;

export interface DecayTrustInput {
  personId: string;
  asOfTimestamp?: number;
}

/**
 * Compute the effective half-life for a concept given its verification depth
 * and structural importance.
 */
export function computeHalfLife(
  modalityCount: number,
  downstreamDependentCount: number
): number {
  // Base half-life, extended by cross-modality depth.
  const modalityMultiplier = Math.pow(CROSS_MODALITY_DECAY_BONUS, Math.max(0, modalityCount - 1));

  // Structural importance adds to the multiplier.
  const structuralMultiplier = 1 + downstreamDependentCount * STRUCTURAL_IMPORTANCE_DECAY_BONUS;

  return BASE_DECAY_HALF_LIFE_DAYS * modalityMultiplier * structuralMultiplier;
}

/**
 * Compute decayed confidence for a single concept.
 * Pure function — no side effects.
 */
export function computeDecayedConfidence(
  confidence: number,
  lastVerified: number,
  asOfTimestamp: number,
  modalityCount: number,
  downstreamDependentCount: number
): number {
  if (confidence === 0 || lastVerified === 0) return 0;

  const daysSinceVerified = (asOfTimestamp - lastVerified) / MS_PER_DAY;
  if (daysSinceVerified <= 0) return confidence;

  const halfLife = computeHalfLife(modalityCount, downstreamDependentCount);

  // Exponential decay: C(t) = C₀ * (0.5)^(t/halfLife)
  const decayed = confidence * Math.pow(0.5, daysSinceVerified / halfLife);

  return Math.max(0, decayed);
}

/**
 * Run decay across all concepts for a person.
 * Returns every concept whose confidence has dropped since last check.
 */
export function decayTrust(
  store: Store,
  input: DecayTrustInput
): DecayResult[] {
  const asOf = input.asOfTimestamp ?? Date.now();
  const allStates = store.getAllTrustStates(input.personId);
  const results: DecayResult[] = [];

  for (const state of allStates) {
    if (state.confidence === 0 || state.lastVerified === null) continue;

    const downstreamDependents = store.getDownstreamDependents(state.conceptId);
    const daysSinceVerified = (asOf - state.lastVerified) / MS_PER_DAY;

    const decayedConfidence = computeDecayedConfidence(
      state.confidence,
      state.lastVerified,
      asOf,
      state.modalitiesTested.length,
      downstreamDependents.length
    );

    // Only report if confidence actually dropped.
    if (decayedConfidence < state.confidence) {
      results.push({
        conceptId: state.conceptId,
        previousConfidence: state.confidence,
        decayedConfidence,
        daysSinceVerified,
      });
    }
  }

  return results;
}
