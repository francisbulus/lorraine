// recordVerification — the atomic write operation to the trust graph.
// Records a single verification event and updates the trust state for that concept.
// Does NOT propagate. Propagation is a separate step (propagate.ts).

import type {
  VerificationEvent,
  TrustState,
  TrustLevel,
  Modality,
  MODALITY_STRENGTH,
} from '../types.js';
import { MODALITY_STRENGTH as modalityStrengths, CROSS_MODALITY_CONFIDENCE_BONUS } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from './decay.js';

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

  // Create and persist the verification event.
  const event: VerificationEvent = {
    id: eventId,
    personId: input.personId,
    conceptId: input.conceptId,
    modality: input.modality,
    result: input.result,
    context: input.context,
    source: input.source ?? 'internal',
    timestamp,
  };
  store.insertVerificationEvent(event);

  // Get existing trust state, or start from untested.
  const existing = store.getTrustState(input.personId, input.conceptId);
  const history = store.getVerificationHistory(input.personId, input.conceptId);

  // Compute modalities tested (unique set across all history).
  const modalitiesSet = new Set<Modality>();
  for (const e of history) {
    modalitiesSet.add(e.modality);
  }
  const modalitiesTested = Array.from(modalitiesSet);

  // Compute new trust level and confidence.
  const { level, confidence } = computeTrustFromHistory(history, existing);

  // Persist updated trust state.
  const storedState = {
    personId: input.personId,
    conceptId: input.conceptId,
    level,
    confidence,
    lastVerified: timestamp,
    inferredFrom: existing?.inferredFrom ?? [],
    modalitiesTested,
  };
  store.upsertTrustState(storedState);

  // Fetch claim history and compute calibration gap.
  const claimHistory = store.getClaimHistory(input.personId, input.conceptId);
  const latestClaim = store.getLatestClaim(input.personId, input.conceptId);
  const decayedConfidence = computeDecayedConfidence(
    confidence,
    timestamp,
    timestamp,
    modalitiesTested.length,
    0 // downstream dependents count not relevant for freshly verified
  );
  const calibrationGap = latestClaim
    ? latestClaim.selfReportedConfidence - decayedConfidence
    : null;

  // Return the full TrustState object.
  return {
    conceptId: input.conceptId,
    personId: input.personId,
    level,
    confidence,
    verificationHistory: history,
    claimHistory,
    modalitiesTested,
    lastVerified: timestamp,
    inferredFrom: storedState.inferredFrom,
    decayedConfidence,
    calibrationGap,
  };
}

export function computeTrustFromHistory(
  history: VerificationEvent[],
  existing: { level: TrustLevel; confidence: number; inferredFrom: string[] } | null
): { level: TrustLevel; confidence: number } {
  if (history.length === 0) {
    return { level: 'untested', confidence: 0 };
  }

  // Separate demonstrated and failed events.
  const demonstrated = history.filter((e) => e.result === 'demonstrated');
  const failed = history.filter((e) => e.result === 'failed');
  const partial = history.filter((e) => e.result === 'partial');

  // Check for contested state: has both demonstrated and failed results.
  const hasSuccess = demonstrated.length > 0 || partial.length > 0;
  const hasFailure = failed.length > 0;

  if (hasSuccess && hasFailure) {
    // Contested — demonstrated in some context, failed in another.
    // Confidence reflects the balance of evidence.
    const successWeight = demonstrated.length + partial.length * 0.5;
    const totalWeight = successWeight + failed.length;
    const baseConfidence = successWeight / totalWeight;

    // Cross-modality bonus for demonstrated modalities.
    const demonstratedModalities = new Set(demonstrated.map((e) => e.modality));
    const modalityBonus = Math.max(0, (demonstratedModalities.size - 1) * CROSS_MODALITY_CONFIDENCE_BONUS);

    const confidence = Math.min(1.0, baseConfidence + modalityBonus);
    return { level: 'contested', confidence };
  }

  if (demonstrated.length > 0) {
    // Verified — at least one demonstrated, no failures.
    // Base confidence from the strongest modality used.
    const modalities = new Set(demonstrated.map((e) => e.modality));
    let maxStrength = 0;
    for (const m of modalities) {
      maxStrength = Math.max(maxStrength, modalityStrengths[m]);
    }

    // Cross-modality bonus.
    const modalityBonus = Math.max(0, (modalities.size - 1) * CROSS_MODALITY_CONFIDENCE_BONUS);

    // Partial events contribute a small boost.
    const partialBonus = partial.length > 0 ? 0.05 : 0;

    const confidence = Math.min(1.0, maxStrength + modalityBonus + partialBonus);
    return { level: 'verified', confidence };
  }

  if (partial.length > 0 && failed.length === 0) {
    // Only partial — treat as verified but weaker.
    const modalities = new Set(partial.map((e) => e.modality));
    let maxStrength = 0;
    for (const m of modalities) {
      maxStrength = Math.max(maxStrength, modalityStrengths[m]);
    }
    const confidence = Math.min(1.0, maxStrength * 0.5);
    return { level: 'verified', confidence };
  }

  // Only failures — level depends on whether there was a prior state.
  // If previously verified/inferred, the failures create contested.
  if (existing && (existing.level === 'verified' || existing.level === 'inferred')) {
    return { level: 'contested', confidence: 0.2 };
  }

  // Never demonstrated, only failed — still untested in a meaningful sense,
  // but we have evidence of failure.
  return { level: 'untested', confidence: 0 };
}
