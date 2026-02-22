// getTrustState — the atomic read operation.
// Returns the full trust state for a single concept for a single learner.

import type { TrustState } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';

export interface GetTrustStateInput {
  learnerId: string;
  conceptId: string;
  asOfTimestamp?: number;
}

export function getTrustState(
  store: Store,
  input: GetTrustStateInput
): TrustState {
  const asOf = input.asOfTimestamp ?? Date.now();
  const stored = store.getTrustState(input.learnerId, input.conceptId);
  const history = store.getVerificationHistory(input.learnerId, input.conceptId);

  if (!stored) {
    // No trust state exists — untested.
    return {
      conceptId: input.conceptId,
      learnerId: input.learnerId,
      level: 'untested',
      confidence: 0,
      verificationHistory: [],
      modalitiesTested: [],
      lastVerified: null,
      inferredFrom: [],
      decayedConfidence: 0,
    };
  }

  const downstreamDependents = store.getDownstreamDependents(stored.conceptId);

  const decayedConfidence = stored.lastVerified
    ? computeDecayedConfidence(
        stored.confidence,
        stored.lastVerified,
        asOf,
        stored.modalitiesTested.length,
        downstreamDependents.length
      )
    : stored.confidence;

  return {
    conceptId: stored.conceptId,
    learnerId: stored.learnerId,
    level: stored.level,
    confidence: stored.confidence,
    verificationHistory: history,
    modalitiesTested: stored.modalitiesTested,
    lastVerified: stored.lastVerified,
    inferredFrom: stored.inferredFrom,
    decayedConfidence,
  };
}
