// retractEvent marks an event as retracted and recomputes affected trust state.
// The original event is not deleted. The retraction is appended as an audit event.

import type { RetractEventInput, RetractResult } from '../types.js';
import type { Store } from '../store/interface.js';
import { getProjectionScope, projectScope } from './projector.js';

export function retractEvent(
  store: Store,
  input: RetractEventInput
): RetractResult {
  const timestamp = input.timestamp ?? Date.now();
  const retractionId = `ret_${input.eventId}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  let personId: string;
  let conceptId: string;
  let scopeType: 'component' | 'concept';

  if (input.eventType === 'verification') {
    const event = store.getVerificationEvent(input.eventId);
    if (!event) {
      return { retracted: false, trustStatesAffected: [] };
    }
    personId = event.personId;
    conceptId = event.conceptId;
    scopeType = 'component';
  } else {
    const event = store.getClaimEvent(input.eventId);
    if (!event) {
      return { retracted: false, trustStatesAffected: [] };
    }
    personId = event.personId;
    conceptId = event.conceptId;
    scopeType = 'concept';
  }

  let eventSeq = 0;

  store.withTransaction(() => {
    eventSeq = store.reserveEventSeq();

    store.markEventRetracted(input.eventId, input.eventType);

    store.insertRetraction({
      id: retractionId,
      eventSeq,
      eventId: input.eventId,
      eventType: input.eventType,
      personId,
      conceptId,
      reason: input.reason,
      retractedBy: input.retractedBy,
      timestamp,
    });

    const scope = getProjectionScope(store, scopeType, personId, conceptId);
    store.enqueueProjectionJob({
      scopeKey: scope.scopeKey,
      scopeType,
      personId,
      conceptId,
      reason: 'event_retracted',
      minEventSeq: eventSeq,
      createdAt: timestamp,
    });
  });

  const projection = projectScope(store, {
    scopeType,
    personId,
    conceptId,
    reason: 'event_retracted',
    minEventSeq: eventSeq,
  });

  return {
    retracted: true,
    trustStatesAffected: projection.changedConceptIds,
  };
}
