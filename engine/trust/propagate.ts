// propagateTrust recomputes inferred trust for the affected component.
// Projection is deterministic and owned by the projector.

import type { VerificationEvent, PropagationResult } from '../types.js';
import type { Store, StoredTrustState } from '../store/interface.js';
import {
  describePropagationChanges,
  getProjectionScope,
  projectScope,
} from './projector.js';

export interface PropagateTrustInput {
  personId: string;
  sourceConceptId: string;
  verificationEvent: VerificationEvent;
}

function mapByConcept(states: StoredTrustState[]): Map<string, StoredTrustState> {
  return new Map(states.map((s) => [s.conceptId, s]));
}

export function propagateTrust(
  store: Store,
  input: PropagateTrustInput
): PropagationResult[] {
  const scope = getProjectionScope(store, 'component', input.personId, input.sourceConceptId);

  const before = mapByConcept(store.getTrustStatesForConcepts(input.personId, scope.conceptIds));

  projectScope(store, {
    scopeType: 'component',
    personId: input.personId,
    conceptId: input.sourceConceptId,
    reason: 'manual_propagation',
    minEventSeq: input.verificationEvent.eventSeq,
  });

  const after = mapByConcept(store.getTrustStatesForConcepts(input.personId, scope.conceptIds));

  return describePropagationChanges(
    before,
    after,
    input.sourceConceptId,
    input.verificationEvent
  );
}
