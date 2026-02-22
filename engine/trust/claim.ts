// recordClaim — records a person's self-reported belief about their understanding.
// Claims are hypothesis, not evidence. The gap between claims and verified trust is diagnostic.

import type { ClaimEvent, RecordClaimResult } from '../types.js';
import type { Store } from '../store/interface.js';
import { getTrustState } from './query.js';

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

  const event: ClaimEvent = {
    id: claimId,
    personId: input.personId,
    conceptId: input.conceptId,
    selfReportedConfidence: input.selfReportedConfidence,
    context: input.context,
    timestamp,
    retracted: false,
  };
  store.insertClaimEvent(event);

  // Read current evidence-based trust state for comparison.
  const currentTrustState = getTrustState(store, {
    personId: input.personId,
    conceptId: input.conceptId,
    asOfTimestamp: timestamp,
  });

  // Gap = selfReportedConfidence - evidence-based decayedConfidence.
  const calibrationGap = input.selfReportedConfidence - currentTrustState.decayedConfidence;

  return {
    recorded: true,
    currentTrustState,
    calibrationGap,
  };
}
