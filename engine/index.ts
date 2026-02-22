// Lorraine Engine — entry point.
// Exports the full engine API. Zero UI dependencies. Zero LLM dependencies.

export type {
  Modality,
  VerificationResult,
  VerificationEvent,
  TrustLevel,
  TrustState,
  EdgeType,
  ConceptNode,
  RelationshipEdge,
  PropagationResult,
  DecayResult,
} from './types.js';

export {
  MODALITY_STRENGTH,
  BASE_DECAY_HALF_LIFE_DAYS,
  CROSS_MODALITY_DECAY_BONUS,
  STRUCTURAL_IMPORTANCE_DECAY_BONUS,
  PROPAGATION_ATTENUATION,
  FAILURE_PROPAGATION_MULTIPLIER,
  PROPAGATION_THRESHOLD,
  CROSS_MODALITY_CONFIDENCE_BONUS,
} from './types.js';

export type { Store } from './store/interface.js';
export type { StoredTrustState } from './store/interface.js';
export { createSQLiteStore } from './store/sqlite.js';

export { createNode, getNode, getNodesByDomain, getDownstreamDependents } from './graph/nodes.js';
export { createEdge, getEdge, getEdgesFrom, getEdgesTo, getConnectedConcepts } from './graph/edges.js';

export { recordVerification } from './trust/record.js';
export type { RecordVerificationInput } from './trust/record.js';

export { getTrustState } from './trust/query.js';
export type { GetTrustStateInput } from './trust/query.js';

export { propagateTrust } from './trust/propagate.js';
export type { PropagateTrustInput } from './trust/propagate.js';

export { decayTrust, computeDecayedConfidence, computeHalfLife } from './trust/decay.js';
export type { DecayTrustInput } from './trust/decay.js';
