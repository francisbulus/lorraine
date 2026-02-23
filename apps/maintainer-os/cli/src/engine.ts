// Engine re-exports for MaintainerOS CLI.
// Centralizes the relative path to the Lorraine engine root.

// Store
export { createSQLiteStore } from '../../../../engine/store/sqlite.js';
export type { Store, StoredTrustState, StoredRetraction } from '../../../../engine/store/interface.js';

// Types
export type {
  TrustState,
  TrustLevel,
  Modality,
  VerificationResult,
  VerificationEvent,
  ClaimEvent,
  ConceptNode,
  RelationshipEdge,
  PropagationResult,
  DecayResult,
  RetractEventInput,
  RetractResult,
  LoadConceptsInput,
  LoadConceptsResult,
  GetGraphInput,
  GetGraphResult,
  CalibrateResult,
  ExplainDecisionInput,
  ExplainDecisionResult,
  EdgeType,
} from '../../../../engine/types.js';

export {
  MODALITY_STRENGTH,
  BASE_DECAY_HALF_LIFE_DAYS,
} from '../../../../engine/types.js';

// Graph
export { loadConcepts } from '../../../../engine/graph/load.js';
export { getGraph } from '../../../../engine/graph/query.js';

// Trust
export { recordVerification } from '../../../../engine/trust/record.js';
export type { RecordVerificationInput } from '../../../../engine/trust/record.js';
export { recordClaim } from '../../../../engine/trust/claim.js';
export type { RecordClaimInput } from '../../../../engine/trust/claim.js';
export { retractEvent } from '../../../../engine/trust/retract.js';
export { getTrustState, getBulkTrustState } from '../../../../engine/trust/query.js';
export type { GetTrustStateInput, GetBulkTrustStateInput } from '../../../../engine/trust/query.js';
export { propagateTrust } from '../../../../engine/trust/propagate.js';
export type { PropagateTrustInput } from '../../../../engine/trust/propagate.js';
export { decayTrust, computeDecayedConfidence, computeHalfLife } from '../../../../engine/trust/decay.js';
export type { DecayTrustInput } from '../../../../engine/trust/decay.js';

// Epistemics
export { calibrate } from '../../../../engine/epistemics/calibrate.js';
export type { CalibrateInput } from '../../../../engine/epistemics/calibrate.js';
export { explainDecision } from '../../../../engine/epistemics/explain.js';
