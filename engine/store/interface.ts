// Storage interface — what the engine needs from persistence.
// The engine never touches a database directly. It talks through this interface.

import type {
  ConceptNode,
  RelationshipEdge,
  VerificationEvent,
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

export interface Store {
  // --- Nodes ---
  insertNode(node: ConceptNode): void;
  getNode(id: string): ConceptNode | null;
  getNodesByDomain(domain: string): ConceptNode[];

  // --- Edges ---
  insertEdge(edge: RelationshipEdge): void;
  getEdge(id: string): RelationshipEdge | null;
  getEdgesFrom(conceptId: string): RelationshipEdge[];
  getEdgesTo(conceptId: string): RelationshipEdge[];
  getDownstreamDependents(conceptId: string): string[];

  // --- Verification Events ---
  insertVerificationEvent(event: VerificationEvent): void;
  getVerificationHistory(personId: string, conceptId: string): VerificationEvent[];

  // --- Trust State ---
  getTrustState(personId: string, conceptId: string): StoredTrustState | null;
  upsertTrustState(state: StoredTrustState): void;
  getAllTrustStates(personId: string): StoredTrustState[];

  // --- Lifecycle ---
  close(): void;
}
