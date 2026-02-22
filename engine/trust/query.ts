// getTrustState — the atomic read operation.
// Returns the full trust state for a single concept for a single learner.

import type { TrustState } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';

export interface GetTrustStateInput {
  personId: string;
  conceptId: string;
  asOfTimestamp?: number;
}

export function getTrustState(
  store: Store,
  input: GetTrustStateInput
): TrustState {
  const asOf = input.asOfTimestamp ?? Date.now();
  const stored = store.getTrustState(input.personId, input.conceptId);
  const history = store.getVerificationHistory(input.personId, input.conceptId);

  if (!stored) {
    // No trust state exists — untested.
    return {
      conceptId: input.conceptId,
      personId: input.personId,
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
    personId: stored.personId,
    level: stored.level,
    confidence: stored.confidence,
    verificationHistory: history,
    modalitiesTested: stored.modalitiesTested,
    lastVerified: stored.lastVerified,
    inferredFrom: stored.inferredFrom,
    decayedConfidence,
  };
}
