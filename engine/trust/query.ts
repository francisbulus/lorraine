// getTrustState / getBulkTrustState — atomic read operations.
// Returns the full trust state for a single concept or multiple concepts for a single person.

import type { TrustState } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';

export interface GetTrustStateInput {
  personId: string;
  conceptId: string;
  asOfTimestamp?: number;
}

export interface GetBulkTrustStateInput {
  personId: string;
  conceptIds?: string[];
  asOfTimestamp?: number;
}

export function getTrustState(
  store: Store,
  input: GetTrustStateInput
): TrustState {
  const asOf = input.asOfTimestamp ?? Date.now();
  const stored = store.getTrustState(input.personId, input.conceptId);
  const history = store.getVerificationHistory(input.personId, input.conceptId);
  const claimHistory = store.getClaimHistory(input.personId, input.conceptId);

  if (!stored) {
    // No trust state exists — untested.
    const latestClaimForUntested = claimHistory.length > 0
      ? claimHistory[claimHistory.length - 1]!
      : null;
    return {
      conceptId: input.conceptId,
      personId: input.personId,
      level: 'untested',
      confidence: 0,
      verificationHistory: [],
      claimHistory,
      modalitiesTested: [],
      lastVerified: null,
      inferredFrom: [],
      decayedConfidence: 0,
      calibrationGap: latestClaimForUntested
        ? latestClaimForUntested.selfReportedConfidence
        : null,
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

  // Compute calibration gap from latest claim.
  const latestClaim = store.getLatestClaim(input.personId, input.conceptId);
  const calibrationGap = latestClaim
    ? latestClaim.selfReportedConfidence - decayedConfidence
    : null;

  return {
    conceptId: stored.conceptId,
    personId: stored.personId,
    level: stored.level,
    confidence: stored.confidence,
    verificationHistory: history,
    claimHistory,
    modalitiesTested: stored.modalitiesTested,
    lastVerified: stored.lastVerified,
    inferredFrom: stored.inferredFrom,
    decayedConfidence,
    calibrationGap,
  };
}

export function getBulkTrustState(
  store: Store,
  input: GetBulkTrustStateInput
): TrustState[] {
  const asOf = input.asOfTimestamp ?? Date.now();

  let conceptIds: string[];

  if (input.conceptIds && input.conceptIds.length > 0) {
    conceptIds = input.conceptIds;
  } else {
    // No filter — return all concepts that have any trust state for this person.
    const allStates = store.getAllTrustStates(input.personId);
    conceptIds = allStates.map(s => s.conceptId);
  }

  return conceptIds.map(conceptId =>
    getTrustState(store, {
      personId: input.personId,
      conceptId,
      asOfTimestamp: asOf,
    })
  );
}
