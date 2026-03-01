// getTrustState / getBulkTrustState.
// Supports fast reads and strict reads with on-demand projection catch-up.

import type { TrustState } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';
import {
  getProjectionScope,
  getScopeFreshness,
  projectScope,
} from './projector.js';

export interface GetTrustStateInput {
  personId: string;
  conceptId: string;
  asOfTimestamp?: number;
  consistency?: 'fast' | 'strict';
}

export interface GetBulkTrustStateInput {
  personId: string;
  conceptIds?: string[];
  asOfTimestamp?: number;
  consistency?: 'fast' | 'strict';
}

export function getTrustState(
  store: Store,
  input: GetTrustStateInput
): TrustState {
  const asOf = input.asOfTimestamp ?? Date.now();
  const consistency = input.consistency ?? 'fast';

  const scope = getProjectionScope(store, 'component', input.personId, input.conceptId);
  let freshness = getScopeFreshness(store, scope, input.conceptId);

  if (consistency === 'strict' && freshness.stale) {
    projectScope(store, {
      scopeType: 'component',
      personId: input.personId,
      conceptId: input.conceptId,
      reason: 'strict_read',
      minEventSeq: freshness.scopeEventSeq,
    });

    freshness = getScopeFreshness(store, scope, input.conceptId);
  }

  const stored = store.getTrustState(input.personId, input.conceptId);
  const history = store.getVerificationHistory(input.personId, input.conceptId);
  const claimHistory = store.getClaimHistory(input.personId, input.conceptId);

  if (!stored) {
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
      cacheStatus: {
        consistencyMode: consistency,
        stale: freshness.stale,
        staleReasons: freshness.staleReasons,
        snapshotEventSeq: freshness.snapshotEventSeq,
        scopeEventSeq: freshness.scopeEventSeq,
        snapshotVersions: freshness.snapshotVersions,
        currentVersions: freshness.currentVersions,
      },
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
    cacheStatus: {
      consistencyMode: consistency,
      stale: freshness.stale,
      staleReasons: freshness.staleReasons,
      snapshotEventSeq: freshness.snapshotEventSeq,
      scopeEventSeq: freshness.scopeEventSeq,
      snapshotVersions: freshness.snapshotVersions,
      currentVersions: freshness.currentVersions,
    },
  };
}

export function getBulkTrustState(
  store: Store,
  input: GetBulkTrustStateInput
): TrustState[] {
  const asOf = input.asOfTimestamp ?? Date.now();
  const consistency = input.consistency ?? 'fast';

  let conceptIds: string[];

  if (input.conceptIds && input.conceptIds.length > 0) {
    conceptIds = input.conceptIds;
  } else {
    const existingStates = store.getAllTrustStates(input.personId).map((s) => s.conceptId);
    const eventConcepts = store.getConceptIdsWithEvents(input.personId);
    conceptIds = [...new Set([...existingStates, ...eventConcepts])].sort();
  }

  return conceptIds.map((conceptId) =>
    getTrustState(store, {
      personId: input.personId,
      conceptId,
      asOfTimestamp: asOf,
      consistency,
    })
  );
}
