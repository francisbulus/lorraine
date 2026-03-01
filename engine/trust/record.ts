// recordVerification appends evidence and triggers deterministic projection.

import type {
  VerificationEvent,
  TrustState,
  Modality,
} from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';
import { computeTrustFromHistory } from './scoring.js';
import { getProjectionScope, projectScope } from './projector.js';

export interface RecordVerificationInput {
  personId: string;
  conceptId: string;
  modality: Modality;
  result: 'demonstrated' | 'failed' | 'partial';
  context: string;
  source?: 'internal' | 'external';
  timestamp?: number;
}

export function recordVerification(
  store: Store,
  input: RecordVerificationInput
): TrustState {
  const timestamp = input.timestamp ?? Date.now();
  const eventId = `ve_${input.conceptId}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  let eventSeq = 0;

  store.withTransaction(() => {
    eventSeq = store.reserveEventSeq();

    const event: VerificationEvent = {
      id: eventId,
      eventSeq,
      personId: input.personId,
      conceptId: input.conceptId,
      modality: input.modality,
      result: input.result,
      context: input.context,
      source: input.source ?? 'internal',
      timestamp,
    };

    store.insertVerificationEvent(event);

    const scope = getProjectionScope(store, 'component', input.personId, input.conceptId);
    store.enqueueProjectionJob({
      scopeKey: scope.scopeKey,
      scopeType: 'component',
      personId: input.personId,
      conceptId: input.conceptId,
      reason: 'verification_appended',
      minEventSeq: eventSeq,
      createdAt: timestamp,
    });
  });

  projectScope(store, {
    scopeType: 'component',
    personId: input.personId,
    conceptId: input.conceptId,
    reason: 'verification_appended',
    minEventSeq: eventSeq,
  });

  const stored = store.getTrustState(input.personId, input.conceptId);
  const verificationHistory = store.getVerificationHistory(input.personId, input.conceptId);
  const claimHistory = store.getClaimHistory(input.personId, input.conceptId);

  const downstreamDependents = store.getDownstreamDependents(input.conceptId);

  const confidence = stored?.confidence ?? 0;
  const level = stored?.level ?? 'untested';
  const modalitiesTested = stored?.modalitiesTested ?? [];
  const lastVerified = stored?.lastVerified ?? null;

  const decayedConfidence = lastVerified
    ? computeDecayedConfidence(
        confidence,
        lastVerified,
        timestamp,
        modalitiesTested.length,
        downstreamDependents.length
      )
    : confidence;

  const latestClaim = store.getLatestClaim(input.personId, input.conceptId);
  const calibrationGap = latestClaim
    ? latestClaim.selfReportedConfidence - decayedConfidence
    : null;

  return {
    conceptId: input.conceptId,
    personId: input.personId,
    level,
    confidence,
    verificationHistory,
    claimHistory,
    modalitiesTested,
    lastVerified,
    inferredFrom: stored?.inferredFrom ?? [],
    decayedConfidence,
    calibrationGap,
  };
}

export { computeTrustFromHistory };
