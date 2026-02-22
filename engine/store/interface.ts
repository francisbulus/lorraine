// Storage interface — what the engine needs from persistence.
// The engine never touches a database directly. It talks through this interface.

import type {
  ConceptNode,
  RelationshipEdge,
  VerificationEvent,
  ClaimEvent,
  TrustLevel,
  Modality,
} from '../types.js';

export interface StoredTrustState {
  conceptId: string;
  personId: string;
  level: TrustLevel;
  confidence: number;
  lastVerified: number | null;
  inferredFrom: string[]; // JSON-serialized in storage
  modalitiesTested: Modality[];
}

export interface StoredRetraction {
  id: string;
  eventId: string;
  eventType: 'verification' | 'claim';
  reason: string;
  retractedBy: string;
  timestamp: number;
}

export interface Store {
  // --- Nodes ---
  insertNode(node: ConceptNode): void;
  getNode(id: string): ConceptNode | null;
  getAllNodes(): ConceptNode[];

  // --- Edges ---
  insertEdge(edge: RelationshipEdge): void;
  getEdge(id: string): RelationshipEdge | null;
  getEdgesFrom(conceptId: string): RelationshipEdge[];
  getEdgesTo(conceptId: string): RelationshipEdge[];
  getAllEdges(): RelationshipEdge[];
  getDownstreamDependents(conceptId: string): string[];

  // --- Verification Events ---
  insertVerificationEvent(event: VerificationEvent): void;
  getVerificationEvent(id: string): VerificationEvent | null;
  getVerificationHistory(personId: string, conceptId: string): VerificationEvent[];

  // --- Claim Events ---
  insertClaimEvent(event: ClaimEvent): void;
  getClaimEvent(id: string): ClaimEvent | null;
  getClaimHistory(personId: string, conceptId: string): ClaimEvent[];
  getLatestClaim(personId: string, conceptId: string): ClaimEvent | null;

  // --- Retractions ---
  insertRetraction(retraction: StoredRetraction): void;
  markEventRetracted(eventId: string, eventType: 'verification' | 'claim'): void;

  // --- Trust State ---
  getTrustState(personId: string, conceptId: string): StoredTrustState | null;
  upsertTrustState(state: StoredTrustState): void;
  getAllTrustStates(personId: string): StoredTrustState[];
  getTrustStatesForConcepts(personId: string, conceptIds: string[]): StoredTrustState[];

  // --- Lifecycle ---
  close(): void;
}
