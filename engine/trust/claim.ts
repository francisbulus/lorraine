// recordClaim records a person's self-reported belief about understanding.
// Claims are hypothesis, not evidence. The gap to verified trust is diagnostic.

import type { ClaimEvent, RecordClaimResult } from '../types.js';
import type { Store } from '../store/interface.js';
import { getTrustState } from './query.js';
import { getProjectionScope, projectScope } from './projector.js';

export interface RecordClaimInput {
  personId: string;
  conceptId: string;
  selfReportedConfidence: number; // 0.0 – 1.0
  context: string;
  timestamp?: number;
}

export function recordClaim(
  store: Store,
  input: RecordClaimInput
): RecordClaimResult {
  const timestamp = input.timestamp ?? Date.now();
  const claimId = `cl_${input.conceptId}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  let eventSeq = 0;

  store.withTransaction(() => {
    eventSeq = store.reserveEventSeq();

    const event: ClaimEvent = {
      id: claimId,
      eventSeq,
      personId: input.personId,
      conceptId: input.conceptId,
      selfReportedConfidence: input.selfReportedConfidence,
      context: input.context,
      timestamp,
      retracted: false,
    };

    store.insertClaimEvent(event);

    const scope = getProjectionScope(store, 'concept', input.personId, input.conceptId);
    store.enqueueProjectionJob({
      scopeKey: scope.scopeKey,
      scopeType: 'concept',
      personId: input.personId,
      conceptId: input.conceptId,
      reason: 'claim_appended',
      minEventSeq: eventSeq,
      createdAt: timestamp,
    });
  });

  // Claims do not change trust math, but projection checkpoint must advance.
  projectScope(store, {
    scopeType: 'concept',
    personId: input.personId,
    conceptId: input.conceptId,
    reason: 'claim_appended',
    minEventSeq: eventSeq,
  });

  const currentTrustState = getTrustState(store, {
    personId: input.personId,
    conceptId: input.conceptId,
    asOfTimestamp: timestamp,
    consistency: 'strict',
  });

  const calibrationGap = input.selfReportedConfidence - currentTrustState.decayedConfidence;

  return {
    recorded: true,
    currentTrustState,
    calibrationGap,
  };
}
