// Lorraine — Core Engine Types
// Every type here traces to the foundational spec or engine-api.md.

// --- Modalities ---
// Each modality verifies a different kind of understanding at a different trust strength.
// From foundational.md Section 4.2.

export type Modality =
  | 'grill:recall'
  | 'grill:inference'
  | 'grill:transfer'
  | 'grill:discrimination'
  | 'sandbox:execution'
  | 'sandbox:debugging'
  | 'write:explanation'
  | 'write:teaching'
  | 'sketch:diagram'
  | 'sketch:process'
  | 'conversation:unprompted';

// Trust strength per modality — higher means stronger verification signal.
// From foundational.md Section 4.2 verification modalities table.
export const MODALITY_STRENGTH: Record<Modality, number> = {
  'grill:recall': 0.3,
  'grill:inference': 0.5,
  'grill:transfer': 0.7,
  'grill:discrimination': 0.6,
  'sandbox:execution': 0.7,
  'sandbox:debugging': 0.85,
  'write:explanation': 0.7,
  'write:teaching': 0.85,
  'sketch:diagram': 0.6,
  'sketch:process': 0.6,
  'conversation:unprompted': 0.95,
};

// --- Verification ---

export type VerificationResult = 'demonstrated' | 'failed' | 'partial';

export interface VerificationEvent {
  id: string;
  personId: string;
  conceptId: string;
  modality: Modality;
  result: VerificationResult;
  context: string;  // provenance — what was tested
  timestamp: number; // unix ms
}

// --- Trust ---

export type TrustLevel = 'verified' | 'inferred' | 'untested' | 'contested';

export interface TrustState {
  conceptId: string;
  personId: string;
  level: TrustLevel;
  confidence: number; // 0.0 – 1.0
  verificationHistory: VerificationEvent[];
  modalitiesTested: Modality[];
  lastVerified: number | null; // timestamp of most recent verification event
  inferredFrom: string[]; // concept IDs that led to this inference
  decayedConfidence: number; // confidence adjusted for time
}

// --- Graph ---

export type EdgeType = 'prerequisite' | 'component_of' | 'related_to' | 'analogous_to';

export interface ConceptNode {
  id: string;
  name: string;
  domain: string;
  territory?: string;
}

export interface RelationshipEdge {
  id: string;
  fromConceptId: string;
  toConceptId: string;
  type: EdgeType;
  inferenceStrength: number; // 0.0 – 1.0, how strongly trust in 'from' implies trust in 'to'
}

// --- Propagation ---

export interface PropagationResult {
  conceptId: string;
  previousLevel: TrustLevel;
  previousConfidence: number;
  newLevel: TrustLevel;
  newConfidence: number;
  inferenceStrength: number;
  reason: string;
}

// --- Decay ---

export interface DecayResult {
  conceptId: string;
  previousConfidence: number;
  decayedConfidence: number;
  daysSinceVerified: number;
}

// --- Constants ---

// Base half-life in days for trust decay (Ebbinghaus-inspired).
// A concept verified once through a single modality loses half its confidence in this many days.
export const BASE_DECAY_HALF_LIFE_DAYS = 30;

// Each additional modality that has produced a signal multiplies the half-life by this factor.
// Cross-modality verification = deeper encoding = slower decay.
export const CROSS_MODALITY_DECAY_BONUS = 1.5;

// Foundational concepts (many downstream dependents) get an additional decay bonus per dependent.
export const STRUCTURAL_IMPORTANCE_DECAY_BONUS = 0.1; // per downstream dependent, additive to multiplier

// Propagation attenuation: inference strength is multiplied by this at each hop.
export const PROPAGATION_ATTENUATION = 0.5;

// Failure propagation multiplier: failure signal is this much stronger than success.
export const FAILURE_PROPAGATION_MULTIPLIER = 1.5;

// Minimum inference strength below which propagation stops.
export const PROPAGATION_THRESHOLD = 0.05;

// Cross-modality bonus: each additional modality boosts confidence by this factor.
export const CROSS_MODALITY_CONFIDENCE_BONUS = 0.1;
