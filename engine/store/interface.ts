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
  // Optional at input boundaries for backward compatibility.
  // SQLite persistence always materializes concrete values.
  derivedFromEventSeq?: number;
  graphVersion?: number;
  modelVersion?: number;
  modalityTaxonomyVersion?: number;
  computedAt?: number;
}

export interface StoredRetraction {
  id: string;
  eventSeq: number;
  eventId: string;
  eventType: 'verification' | 'claim';
  personId: string;
  conceptId: string;
  reason: string;
  retractedBy: string;
  timestamp: number;
}

export interface VersionMetadata {
  graphVersion: number;
  modelVersion: number;
  modalityTaxonomyVersion: number;
}

export interface StoredProjectionJob {
  scopeKey: string;
  scopeType: 'component' | 'concept';
  personId: string;
  conceptId: string | null;
  reason: string;
  minEventSeq: number;
  createdAt: number;
}

export interface Store {
  // --- Transactions ---
  withTransaction<T>(fn: () => T): T;

  // --- Metadata ---
  reserveEventSeq(): number;
  getCurrentEventSeq(): number;
  getVersionMetadata(): VersionMetadata;
  bumpGraphVersion(): number;

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

  // --- Projections ---
  enqueueProjectionJob(job: StoredProjectionJob): void;
  markProjectionJobsCompleted(scopeKey: string, upToEventSeq: number): number;
  getProjectionCheckpoint(scopeKey: string): number | null;
  upsertProjectionCheckpoint(scopeKey: string, lastProjectedEventSeq: number, updatedAt: number): void;
  getLatestEventSeqForScope(personId: string, conceptIds: string[]): number;
  getPeopleWithEvents(): string[];
  getConceptIdsWithEvents(personId: string): string[];

  // --- Trust State ---
  getTrustState(personId: string, conceptId: string): StoredTrustState | null;
  upsertTrustState(state: StoredTrustState): void;
  deleteTrustStatesForConcepts(personId: string, conceptIds: string[]): void;
  getAllTrustStates(personId: string): StoredTrustState[];
  getTrustStatesForConcepts(personId: string, conceptIds: string[]): StoredTrustState[];

  // --- Lifecycle ---
  close(): void;
}
