// Lorraine Engine — entry point.
// Exports the full engine API. Zero UI dependencies. Zero LLM dependencies.

export type {
  Modality,
  VerificationResult,
  VerificationEvent,
  ClaimEvent,
  TrustLevel,
  TrustState,
  TrustCacheStatus,
  EdgeType,
  ConceptNode,
  RelationshipEdge,
  PropagationResult,
  DecayResult,
  RetractEventInput,
  RetractResult,
  RecordClaimResult,
  LoadConceptsInput,
  LoadConceptsResult,
  GetGraphInput,
  GetGraphResult,
  CalibrateResult,
  ExplainDecisionInput,
  ExplainDecisionResult,
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
  TRUST_MODEL_VERSION,
  MODALITY_TAXONOMY_VERSION,
} from './types.js';

export type {
  Store,
  StoredTrustState,
  StoredRetraction,
  StoredProjectionJob,
  VersionMetadata,
} from './store/interface.js';
export { createSQLiteStore } from './store/sqlite.js';

export { createNode, getNode, getAllNodes, getDownstreamDependents } from './graph/nodes.js';
export { createEdge, getEdge, getEdgesFrom, getEdgesTo, getConnectedConcepts } from './graph/edges.js';
export { loadConcepts } from './graph/load.js';
export { getGraph } from './graph/query.js';

export { recordVerification, computeTrustFromHistory } from './trust/record.js';
export type { RecordVerificationInput } from './trust/record.js';

export { recordClaim } from './trust/claim.js';
export type { RecordClaimInput } from './trust/claim.js';

export { retractEvent } from './trust/retract.js';

export { getTrustState, getBulkTrustState } from './trust/query.js';
export type { GetTrustStateInput, GetBulkTrustStateInput } from './trust/query.js';

export { propagateTrust } from './trust/propagate.js';
export type { PropagateTrustInput } from './trust/propagate.js';

export {
  projectScope,
  getScopeFreshness,
  getProjectionScope,
  getConnectedComponentConceptIds,
  buildScopeKey,
} from './trust/projector.js';
export type {
  ProjectionScopeType,
  ProjectionScope,
  ScopeFreshness,
  ProjectScopeInput,
  ProjectScopeResult,
} from './trust/projector.js';

export { decayTrust, computeDecayedConfidence, computeHalfLife } from './trust/decay.js';
export type { DecayTrustInput } from './trust/decay.js';

export { calibrate } from './epistemics/calibrate.js';
export type { CalibrateInput } from './epistemics/calibrate.js';

export { explainDecision } from './epistemics/explain.js';
