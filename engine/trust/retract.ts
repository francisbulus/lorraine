// retractEvent — marks an event as retracted and recomputes affected trust state.
// The original event is never deleted — it is marked as retracted with the reason preserved.
// The audit trail remains complete.

import type { RetractEventInput, RetractResult } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeTrustFromHistory } from './record.js';
import { computeDecayedConfidence } from './decay.js';
import type { Modality } from '../types.js';

export function retractEvent(
  store: Store,
  input: RetractEventInput
): RetractResult {
  const timestamp = input.timestamp ?? Date.now();
  const retractionId = `ret_${input.eventId}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  // Determine the affected person and concept before marking retracted.
  let personId: string;
  let conceptId: string;

  if (input.eventType === 'verification') {
    const event = store.getVerificationEvent(input.eventId);
    if (!event) {
      return { retracted: false, trustStatesAffected: [] };
    }
    personId = event.personId;
    conceptId = event.conceptId;
  } else {
    const event = store.getClaimEvent(input.eventId);
    if (!event) {
      return { retracted: false, trustStatesAffected: [] };
    }
    personId = event.personId;
    conceptId = event.conceptId;
  }

  // Mark the event as retracted.
  store.markEventRetracted(input.eventId, input.eventType);

  // Log the retraction event for audit trail.
  store.insertRetraction({
    id: retractionId,
    eventId: input.eventId,
    eventType: input.eventType,
    reason: input.reason,
    retractedBy: input.retractedBy,
    timestamp,
  });

  const trustStatesAffected: string[] = [];

  if (input.eventType === 'verification') {
    // Recompute trust state from remaining (non-retracted) history.
    const history = store.getVerificationHistory(personId, conceptId);
    const existing = store.getTrustState(personId, conceptId);

    const { level, confidence } = computeTrustFromHistory(history, null);

    // Compute modalities tested from remaining history.
    const modalitiesSet = new Set<Modality>();
    for (const e of history) {
      modalitiesSet.add(e.modality);
    }
    const modalitiesTested = Array.from(modalitiesSet);

    const lastVerified = history.length > 0
      ? Math.max(...history.map(e => e.timestamp))
      : null;

    // Check if trust state actually changed.
    if (!existing || existing.level !== level || Math.abs(existing.confidence - confidence) > 0.001) {
      trustStatesAffected.push(conceptId);
    }

    store.upsertTrustState({
      personId,
      conceptId,
      level,
      confidence,
      lastVerified,
      inferredFrom: existing?.inferredFrom ?? [],
      modalitiesTested,
    });
  }
  // For claim retractions: no trust state recomputation needed since claims
  // don't affect trust level/confidence — they only affect calibrationGap.

  return {
    retracted: true,
    trustStatesAffected,
  };
}
