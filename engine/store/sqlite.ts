// SQLite implementation of the Store interface.
// Uses better-sqlite3 for synchronous, zero-dependency persistence.

import Database from 'better-sqlite3';
import type {
  ConceptNode,
  RelationshipEdge,
  VerificationEvent,
  ClaimEvent,
  TrustLevel,
  Modality,
} from '../types.js';
import type { Store, StoredTrustState, StoredRetraction } from './interface.js';

export function createSQLiteStore(dbPath: string = ':memory:'): Store {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance.
  db.pragma('journal_mode = WAL');

  // Create tables.
  db.exec(`
    CREATE TABLE IF NOT EXISTS concept_nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS relationship_edges (
      id TEXT PRIMARY KEY,
      from_concept_id TEXT NOT NULL,
      to_concept_id TEXT NOT NULL,
      type TEXT NOT NULL,
      inference_strength REAL NOT NULL,
      FOREIGN KEY (from_concept_id) REFERENCES concept_nodes(id),
      FOREIGN KEY (to_concept_id) REFERENCES concept_nodes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_edges_from ON relationship_edges(from_concept_id);
    CREATE INDEX IF NOT EXISTS idx_edges_to ON relationship_edges(to_concept_id);

    CREATE TABLE IF NOT EXISTS verification_events (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      modality TEXT NOT NULL,
      result TEXT NOT NULL,
      context TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'internal',
      retracted INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_verifications_person_concept
      ON verification_events(person_id, concept_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_timestamp
      ON verification_events(timestamp);

    CREATE TABLE IF NOT EXISTS claim_events (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      self_reported_confidence REAL NOT NULL,
      context TEXT NOT NULL,
      retracted INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_claims_person_concept
      ON claim_events(person_id, concept_id);

    CREATE TABLE IF NOT EXISTS retraction_events (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      retracted_by TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_retractions_event
      ON retraction_events(event_id);

    CREATE TABLE IF NOT EXISTS trust_states (
      person_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      level TEXT NOT NULL,
      confidence REAL NOT NULL,
      last_verified INTEGER,
      inferred_from TEXT NOT NULL DEFAULT '[]',
      modalities_tested TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (person_id, concept_id)
    );
  `);

  // Prepared statements for performance.
  const stmts = {
    insertNode: db.prepare(
      'INSERT OR REPLACE INTO concept_nodes (id, name, description) VALUES (?, ?, ?)'
    ),
    getNode: db.prepare('SELECT * FROM concept_nodes WHERE id = ?'),
    getAllNodes: db.prepare('SELECT * FROM concept_nodes'),

    insertEdge: db.prepare(
      'INSERT OR REPLACE INTO relationship_edges (id, from_concept_id, to_concept_id, type, inference_strength) VALUES (?, ?, ?, ?, ?)'
    ),
    getEdge: db.prepare('SELECT * FROM relationship_edges WHERE id = ?'),
    getEdgesFrom: db.prepare('SELECT * FROM relationship_edges WHERE from_concept_id = ?'),
    getEdgesTo: db.prepare('SELECT * FROM relationship_edges WHERE to_concept_id = ?'),
    getAllEdges: db.prepare('SELECT * FROM relationship_edges'),
    // Downstream dependents: concepts where this concept is a prerequisite (from → to).
    getDownstreamDependents: db.prepare(
      "SELECT to_concept_id FROM relationship_edges WHERE from_concept_id = ? AND type = 'prerequisite'"
    ),

    insertVerificationEvent: db.prepare(
      'INSERT INTO verification_events (id, person_id, concept_id, modality, result, context, source, retracted, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ),
    getVerificationEvent: db.prepare('SELECT * FROM verification_events WHERE id = ?'),
    getVerificationHistory: db.prepare(
      'SELECT * FROM verification_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp ASC'
    ),

    insertClaimEvent: db.prepare(
      'INSERT INTO claim_events (id, person_id, concept_id, self_reported_confidence, context, retracted, timestamp) VALUES (?, ?, ?, ?, ?, 0, ?)'
    ),
    getClaimEvent: db.prepare('SELECT * FROM claim_events WHERE id = ?'),
    getClaimHistory: db.prepare(
      'SELECT * FROM claim_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp ASC'
    ),
    getLatestClaim: db.prepare(
      'SELECT * FROM claim_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp DESC LIMIT 1'
    ),

    insertRetraction: db.prepare(
      'INSERT INTO retraction_events (id, event_id, event_type, reason, retracted_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
    ),
    markVerificationRetracted: db.prepare(
      'UPDATE verification_events SET retracted = 1 WHERE id = ?'
    ),
    markClaimRetracted: db.prepare(
      'UPDATE claim_events SET retracted = 1 WHERE id = ?'
    ),

    getTrustState: db.prepare(
      'SELECT * FROM trust_states WHERE person_id = ? AND concept_id = ?'
    ),
    upsertTrustState: db.prepare(
      `INSERT INTO trust_states (person_id, concept_id, level, confidence, last_verified, inferred_from, modalities_tested)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(person_id, concept_id)
       DO UPDATE SET level = excluded.level, confidence = excluded.confidence,
                     last_verified = excluded.last_verified, inferred_from = excluded.inferred_from,
                     modalities_tested = excluded.modalities_tested`
    ),
    getAllTrustStates: db.prepare('SELECT * FROM trust_states WHERE person_id = ?'),
  };

  function rowToNode(row: unknown): ConceptNode {
    const r = row as { id: string; name: string; description: string };
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? '',
    };
  }

  function rowToEdge(row: unknown): RelationshipEdge {
    const r = row as {
      id: string;
      from_concept_id: string;
      to_concept_id: string;
      type: string;
      inference_strength: number;
    };
    return {
      id: r.id,
      fromConceptId: r.from_concept_id,
      toConceptId: r.to_concept_id,
      type: r.type as RelationshipEdge['type'],
      inferenceStrength: r.inference_strength,
    };
  }

  function rowToVerificationEvent(row: unknown): VerificationEvent {
    const r = row as {
      id: string;
      person_id: string;
      concept_id: string;
      modality: string;
      result: string;
      context: string;
      source: string;
      timestamp: number;
    };
    return {
      id: r.id,
      personId: r.person_id,
      conceptId: r.concept_id,
      modality: r.modality as Modality,
      result: r.result as VerificationEvent['result'],
      context: r.context,
      source: (r.source ?? 'internal') as 'internal' | 'external',
      timestamp: r.timestamp,
    };
  }

  function rowToClaimEvent(row: unknown): ClaimEvent {
    const r = row as {
      id: string;
      person_id: string;
      concept_id: string;
      self_reported_confidence: number;
      context: string;
      retracted: number;
      timestamp: number;
    };
    return {
      id: r.id,
      personId: r.person_id,
      conceptId: r.concept_id,
      selfReportedConfidence: r.self_reported_confidence,
      context: r.context,
      retracted: r.retracted === 1,
      timestamp: r.timestamp,
    };
  }

  function rowToTrustState(row: unknown): StoredTrustState {
    const r = row as {
      person_id: string;
      concept_id: string;
      level: string;
      confidence: number;
      last_verified: number | null;
      inferred_from: string;
      modalities_tested: string;
    };
    return {
      personId: r.person_id,
      conceptId: r.concept_id,
      level: r.level as TrustLevel,
      confidence: r.confidence,
      lastVerified: r.last_verified,
      inferredFrom: JSON.parse(r.inferred_from) as string[],
      modalitiesTested: JSON.parse(r.modalities_tested) as Modality[],
    };
  }

  return {
    // --- Nodes ---
    insertNode(node: ConceptNode) {
      stmts.insertNode.run(node.id, node.name, node.description ?? '');
    },
    getNode(id: string): ConceptNode | null {
      const row = stmts.getNode.get(id);
      return row ? rowToNode(row) : null;
    },
    getAllNodes(): ConceptNode[] {
      return stmts.getAllNodes.all().map(rowToNode);
    },

    // --- Edges ---
    insertEdge(edge: RelationshipEdge) {
      stmts.insertEdge.run(
        edge.id, edge.fromConceptId, edge.toConceptId, edge.type, edge.inferenceStrength
      );
    },
    getEdge(id: string): RelationshipEdge | null {
      const row = stmts.getEdge.get(id);
      return row ? rowToEdge(row) : null;
    },
    getEdgesFrom(conceptId: string): RelationshipEdge[] {
      return stmts.getEdgesFrom.all(conceptId).map(rowToEdge);
    },
    getEdgesTo(conceptId: string): RelationshipEdge[] {
      return stmts.getEdgesTo.all(conceptId).map(rowToEdge);
    },
    getAllEdges(): RelationshipEdge[] {
      return stmts.getAllEdges.all().map(rowToEdge);
    },
    getDownstreamDependents(conceptId: string): string[] {
      return stmts.getDownstreamDependents.all(conceptId).map(
        (row) => (row as { to_concept_id: string }).to_concept_id
      );
    },

    // --- Verification Events ---
    insertVerificationEvent(event: VerificationEvent) {
      stmts.insertVerificationEvent.run(
        event.id, event.personId, event.conceptId, event.modality,
        event.result, event.context, event.source, event.timestamp
      );
    },
    getVerificationEvent(id: string): VerificationEvent | null {
      const row = stmts.getVerificationEvent.get(id);
      return row ? rowToVerificationEvent(row) : null;
    },
    getVerificationHistory(personId: string, conceptId: string): VerificationEvent[] {
      return stmts.getVerificationHistory.all(personId, conceptId).map(rowToVerificationEvent);
    },

    // --- Claim Events ---
    insertClaimEvent(event: ClaimEvent) {
      stmts.insertClaimEvent.run(
        event.id, event.personId, event.conceptId,
        event.selfReportedConfidence, event.context, event.timestamp
      );
    },
    getClaimEvent(id: string): ClaimEvent | null {
      const row = stmts.getClaimEvent.get(id);
      return row ? rowToClaimEvent(row) : null;
    },
    getClaimHistory(personId: string, conceptId: string): ClaimEvent[] {
      return stmts.getClaimHistory.all(personId, conceptId).map(rowToClaimEvent);
    },
    getLatestClaim(personId: string, conceptId: string): ClaimEvent | null {
      const row = stmts.getLatestClaim.get(personId, conceptId);
      return row ? rowToClaimEvent(row) : null;
    },

    // --- Retractions ---
    insertRetraction(retraction: StoredRetraction) {
      stmts.insertRetraction.run(
        retraction.id, retraction.eventId, retraction.eventType,
        retraction.reason, retraction.retractedBy, retraction.timestamp
      );
    },
    markEventRetracted(eventId: string, eventType: 'verification' | 'claim') {
      if (eventType === 'verification') {
        stmts.markVerificationRetracted.run(eventId);
      } else {
        stmts.markClaimRetracted.run(eventId);
      }
    },

    // --- Trust State ---
    getTrustState(personId: string, conceptId: string): StoredTrustState | null {
      const row = stmts.getTrustState.get(personId, conceptId);
      return row ? rowToTrustState(row) : null;
    },
    upsertTrustState(state: StoredTrustState) {
      stmts.upsertTrustState.run(
        state.personId, state.conceptId, state.level, state.confidence,
        state.lastVerified, JSON.stringify(state.inferredFrom),
        JSON.stringify(state.modalitiesTested)
      );
    },
    getAllTrustStates(personId: string): StoredTrustState[] {
      return stmts.getAllTrustStates.all(personId).map(rowToTrustState);
    },
    getTrustStatesForConcepts(personId: string, conceptIds: string[]): StoredTrustState[] {
      if (conceptIds.length === 0) return [];
      const placeholders = conceptIds.map(() => '?').join(',');
      const stmt = db.prepare(
        `SELECT * FROM trust_states WHERE person_id = ? AND concept_id IN (${placeholders})`
      );
      return stmt.all(personId, ...conceptIds).map(rowToTrustState);
    },

    // --- Lifecycle ---
    close() {
      db.close();
    },
  };
}
