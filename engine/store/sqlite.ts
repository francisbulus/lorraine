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
import {
  MODALITY_TAXONOMY_VERSION,
  TRUST_MODEL_VERSION,
} from '../types.js';
import type {
  Store,
  StoredTrustState,
  StoredRetraction,
  StoredProjectionJob,
  VersionMetadata,
} from './interface.js';

const METADATA_KEYS = {
  eventSeq: 'event_seq',
  graphVersion: 'graph_version',
  modelVersion: 'model_version',
  modalityTaxonomyVersion: 'modality_taxonomy_version',
} as const;

function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

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
      event_seq INTEGER NOT NULL,
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
      event_seq INTEGER NOT NULL,
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
      event_seq INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      person_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      retracted_by TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_retractions_event
      ON retraction_events(event_id);
    CREATE INDEX IF NOT EXISTS idx_retractions_person_concept
      ON retraction_events(person_id, concept_id);

    CREATE TABLE IF NOT EXISTS trust_states (
      person_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      level TEXT NOT NULL,
      confidence REAL NOT NULL,
      last_verified INTEGER,
      inferred_from TEXT NOT NULL DEFAULT '[]',
      modalities_tested TEXT NOT NULL DEFAULT '[]',
      derived_from_event_seq INTEGER NOT NULL DEFAULT 0,
      graph_version INTEGER NOT NULL DEFAULT 1,
      model_version INTEGER NOT NULL DEFAULT 1,
      modality_taxonomy_version INTEGER NOT NULL DEFAULT 1,
      computed_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (person_id, concept_id)
    );

    CREATE TABLE IF NOT EXISTS projection_checkpoints (
      scope_key TEXT PRIMARY KEY,
      last_projected_event_seq INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projection_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_key TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      person_id TEXT NOT NULL,
      concept_id TEXT,
      reason TEXT NOT NULL,
      min_event_seq INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projection_jobs_scope_status
      ON projection_jobs(scope_key, status, min_event_seq);

    CREATE TABLE IF NOT EXISTS engine_metadata (
      key TEXT PRIMARY KEY,
      int_value INTEGER NOT NULL
    );
  `);

  function ensureColumn(table: string, column: string, definition: string): void {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    const exists = rows.some((r) => r.name === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  // Backward-compatible migrations for older local DBs.
  ensureColumn('verification_events', 'event_seq', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('claim_events', 'event_seq', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('retraction_events', 'event_seq', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('retraction_events', 'person_id', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('retraction_events', 'concept_id', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('trust_states', 'derived_from_event_seq', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('trust_states', 'graph_version', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('trust_states', 'model_version', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('trust_states', 'modality_taxonomy_version', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('trust_states', 'computed_at', 'INTEGER NOT NULL DEFAULT 0');

  const backfillEventSeqs = db.transaction((): number => {
    type EventRow = { table: 'verification' | 'claim' | 'retraction'; id: string; timestamp: number };

    const verificationRows = db
      .prepare('SELECT id, timestamp FROM verification_events')
      .all() as Array<{ id: string; timestamp: number }>;
    const claimRows = db
      .prepare('SELECT id, timestamp FROM claim_events')
      .all() as Array<{ id: string; timestamp: number }>;
    const retractionRows = db
      .prepare('SELECT id, timestamp FROM retraction_events')
      .all() as Array<{ id: string; timestamp: number }>;

    const combined: EventRow[] = [
      ...verificationRows.map((row): EventRow => ({ table: 'verification', id: row.id, timestamp: row.timestamp })),
      ...claimRows.map((row): EventRow => ({ table: 'claim', id: row.id, timestamp: row.timestamp })),
      ...retractionRows.map((row): EventRow => ({ table: 'retraction', id: row.id, timestamp: row.timestamp })),
    ];

    combined.sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      if (a.table !== b.table) return a.table.localeCompare(b.table);
      return a.id.localeCompare(b.id);
    });

    const setVerificationSeq = db.prepare('UPDATE verification_events SET event_seq = ? WHERE id = ?');
    const setClaimSeq = db.prepare('UPDATE claim_events SET event_seq = ? WHERE id = ?');
    const setRetractionSeq = db.prepare('UPDATE retraction_events SET event_seq = ? WHERE id = ?');

    let seq = 0;
    for (const row of combined) {
      seq += 1;
      if (row.table === 'verification') {
        setVerificationSeq.run(seq, row.id);
      } else if (row.table === 'claim') {
        setClaimSeq.run(seq, row.id);
      } else {
        setRetractionSeq.run(seq, row.id);
      }
    }

    return seq;
  });

  const maxBackfilledEventSeq = backfillEventSeqs();

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_verifications_event_seq
      ON verification_events(event_seq);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_event_seq
      ON claim_events(event_seq);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_retractions_event_seq
      ON retraction_events(event_seq);
  `);

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
    getDownstreamDependents: db.prepare(
      "SELECT to_concept_id FROM relationship_edges WHERE from_concept_id = ? AND type = 'prerequisite'"
    ),

    insertVerificationEvent: db.prepare(
      'INSERT INTO verification_events (id, event_seq, person_id, concept_id, modality, result, context, source, retracted, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ),
    getVerificationEvent: db.prepare('SELECT * FROM verification_events WHERE id = ?'),
    getVerificationHistory: db.prepare(
      'SELECT * FROM verification_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp ASC, event_seq ASC, id ASC'
    ),

    insertClaimEvent: db.prepare(
      'INSERT INTO claim_events (id, event_seq, person_id, concept_id, self_reported_confidence, context, retracted, timestamp) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
    ),
    getClaimEvent: db.prepare('SELECT * FROM claim_events WHERE id = ?'),
    getClaimHistory: db.prepare(
      'SELECT * FROM claim_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp ASC, event_seq ASC, id ASC'
    ),
    getLatestClaim: db.prepare(
      'SELECT * FROM claim_events WHERE person_id = ? AND concept_id = ? AND retracted = 0 ORDER BY timestamp DESC, event_seq DESC LIMIT 1'
    ),

    insertRetraction: db.prepare(
      'INSERT INTO retraction_events (id, event_seq, event_id, event_type, person_id, concept_id, reason, retracted_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
      `INSERT INTO trust_states (
        person_id, concept_id, level, confidence, last_verified, inferred_from, modalities_tested,
        derived_from_event_seq, graph_version, model_version, modality_taxonomy_version, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(person_id, concept_id)
      DO UPDATE SET
        level = excluded.level,
        confidence = excluded.confidence,
        last_verified = excluded.last_verified,
        inferred_from = excluded.inferred_from,
        modalities_tested = excluded.modalities_tested,
        derived_from_event_seq = excluded.derived_from_event_seq,
        graph_version = excluded.graph_version,
        model_version = excluded.model_version,
        modality_taxonomy_version = excluded.modality_taxonomy_version,
        computed_at = excluded.computed_at`
    ),
    getAllTrustStates: db.prepare('SELECT * FROM trust_states WHERE person_id = ?'),

    insertProjectionJob: db.prepare(
      `INSERT INTO projection_jobs (
        scope_key, scope_type, person_id, concept_id, reason, min_event_seq, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`
    ),
    markProjectionJobsCompleted: db.prepare(
      `UPDATE projection_jobs
       SET status = 'completed', updated_at = ?
       WHERE scope_key = ? AND status = 'queued' AND min_event_seq <= ?`
    ),
    getProjectionCheckpoint: db.prepare(
      'SELECT last_projected_event_seq FROM projection_checkpoints WHERE scope_key = ?'
    ),
    upsertProjectionCheckpoint: db.prepare(
      `INSERT INTO projection_checkpoints (scope_key, last_projected_event_seq, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(scope_key)
       DO UPDATE SET
         last_projected_event_seq = excluded.last_projected_event_seq,
         updated_at = excluded.updated_at`
    ),

    getMetadata: db.prepare('SELECT int_value FROM engine_metadata WHERE key = ?'),
    upsertMetadata: db.prepare(
      `INSERT INTO engine_metadata (key, int_value)
       VALUES (?, ?)
       ON CONFLICT(key)
       DO UPDATE SET int_value = excluded.int_value`
    ),
  };

  function getMetadataInt(key: string): number | null {
    const row = stmts.getMetadata.get(key) as { int_value: number } | undefined;
    return row ? row.int_value : null;
  }

  function setMetadataInt(key: string, value: number): void {
    stmts.upsertMetadata.run(key, value);
  }

  function initMetadataInt(key: string, fallbackValue: number): number {
    const existing = getMetadataInt(key);
    if (existing === null) {
      setMetadataInt(key, fallbackValue);
      return fallbackValue;
    }
    return existing;
  }

  const existingEventSeq = initMetadataInt(METADATA_KEYS.eventSeq, maxBackfilledEventSeq);
  if (existingEventSeq < maxBackfilledEventSeq) {
    setMetadataInt(METADATA_KEYS.eventSeq, maxBackfilledEventSeq);
  }
  initMetadataInt(METADATA_KEYS.graphVersion, 1);

  const existingModelVersion = initMetadataInt(METADATA_KEYS.modelVersion, TRUST_MODEL_VERSION);
  if (existingModelVersion !== TRUST_MODEL_VERSION) {
    setMetadataInt(METADATA_KEYS.modelVersion, TRUST_MODEL_VERSION);
  }

  const existingModalityVersion = initMetadataInt(
    METADATA_KEYS.modalityTaxonomyVersion,
    MODALITY_TAXONOMY_VERSION
  );
  if (existingModalityVersion !== MODALITY_TAXONOMY_VERSION) {
    setMetadataInt(METADATA_KEYS.modalityTaxonomyVersion, MODALITY_TAXONOMY_VERSION);
  }

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
      event_seq: number;
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
      eventSeq: r.event_seq,
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
      event_seq: number;
      person_id: string;
      concept_id: string;
      self_reported_confidence: number;
      context: string;
      retracted: number;
      timestamp: number;
    };
    return {
      id: r.id,
      eventSeq: r.event_seq,
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
      inferred_from: string | null;
      modalities_tested: string | null;
      derived_from_event_seq: number | null;
      graph_version: number | null;
      model_version: number | null;
      modality_taxonomy_version: number | null;
      computed_at: number | null;
    };

    return {
      personId: r.person_id,
      conceptId: r.concept_id,
      level: r.level as TrustLevel,
      confidence: r.confidence,
      lastVerified: r.last_verified,
      inferredFrom: parseJsonArray<string>(r.inferred_from),
      modalitiesTested: parseJsonArray<Modality>(r.modalities_tested),
      derivedFromEventSeq: r.derived_from_event_seq ?? 0,
      graphVersion: r.graph_version ?? 1,
      modelVersion: r.model_version ?? TRUST_MODEL_VERSION,
      modalityTaxonomyVersion: r.modality_taxonomy_version ?? MODALITY_TAXONOMY_VERSION,
      computedAt: r.computed_at ?? 0,
    };
  }

  const runInTransaction = db.transaction((fn: () => unknown) => fn());

  return {
    // --- Transactions ---
    withTransaction<T>(fn: () => T): T {
      return runInTransaction(fn) as T;
    },

    // --- Metadata ---
    reserveEventSeq(): number {
      const current = getMetadataInt(METADATA_KEYS.eventSeq) ?? 0;
      const next = current + 1;
      setMetadataInt(METADATA_KEYS.eventSeq, next);
      return next;
    },
    getCurrentEventSeq(): number {
      return getMetadataInt(METADATA_KEYS.eventSeq) ?? 0;
    },
    getVersionMetadata(): VersionMetadata {
      return {
        graphVersion: getMetadataInt(METADATA_KEYS.graphVersion) ?? 1,
        modelVersion: getMetadataInt(METADATA_KEYS.modelVersion) ?? TRUST_MODEL_VERSION,
        modalityTaxonomyVersion: getMetadataInt(METADATA_KEYS.modalityTaxonomyVersion) ?? MODALITY_TAXONOMY_VERSION,
      };
    },
    bumpGraphVersion(): number {
      const current = getMetadataInt(METADATA_KEYS.graphVersion) ?? 1;
      const next = current + 1;
      setMetadataInt(METADATA_KEYS.graphVersion, next);
      return next;
    },

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
      if (event.eventSeq === undefined) {
        throw new Error('insertVerificationEvent requires eventSeq');
      }
      stmts.insertVerificationEvent.run(
        event.id,
        event.eventSeq,
        event.personId,
        event.conceptId,
        event.modality,
        event.result,
        event.context,
        event.source,
        event.timestamp
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
      if (event.eventSeq === undefined) {
        throw new Error('insertClaimEvent requires eventSeq');
      }
      stmts.insertClaimEvent.run(
        event.id,
        event.eventSeq,
        event.personId,
        event.conceptId,
        event.selfReportedConfidence,
        event.context,
        event.timestamp
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
        retraction.id,
        retraction.eventSeq,
        retraction.eventId,
        retraction.eventType,
        retraction.personId,
        retraction.conceptId,
        retraction.reason,
        retraction.retractedBy,
        retraction.timestamp
      );
    },
    markEventRetracted(eventId: string, eventType: 'verification' | 'claim') {
      if (eventType === 'verification') {
        stmts.markVerificationRetracted.run(eventId);
      } else {
        stmts.markClaimRetracted.run(eventId);
      }
    },

    // --- Projections ---
    enqueueProjectionJob(job: StoredProjectionJob) {
      stmts.insertProjectionJob.run(
        job.scopeKey,
        job.scopeType,
        job.personId,
        job.conceptId,
        job.reason,
        job.minEventSeq,
        job.createdAt,
        job.createdAt
      );
    },
    markProjectionJobsCompleted(scopeKey: string, upToEventSeq: number): number {
      const updatedAt = Date.now();
      const result = stmts.markProjectionJobsCompleted.run(updatedAt, scopeKey, upToEventSeq);
      return result.changes;
    },
    getProjectionCheckpoint(scopeKey: string): number | null {
      const row = stmts.getProjectionCheckpoint.get(scopeKey) as
        | { last_projected_event_seq: number }
        | undefined;
      return row ? row.last_projected_event_seq : null;
    },
    upsertProjectionCheckpoint(scopeKey: string, lastProjectedEventSeq: number, updatedAt: number): void {
      stmts.upsertProjectionCheckpoint.run(scopeKey, lastProjectedEventSeq, updatedAt);
    },
    getLatestEventSeqForScope(personId: string, conceptIds: string[]): number {
      if (conceptIds.length === 0) return 0;
      const placeholders = conceptIds.map(() => '?').join(',');
      const args = [personId, ...conceptIds];

      const verificationRow = db
        .prepare(
          `SELECT MAX(event_seq) AS max_seq
           FROM verification_events
           WHERE person_id = ? AND concept_id IN (${placeholders})`
        )
        .get(...args) as { max_seq: number | null };

      const claimRow = db
        .prepare(
          `SELECT MAX(event_seq) AS max_seq
           FROM claim_events
           WHERE person_id = ? AND concept_id IN (${placeholders})`
        )
        .get(...args) as { max_seq: number | null };

      const retractionRow = db
        .prepare(
          `SELECT MAX(event_seq) AS max_seq
           FROM retraction_events
           WHERE person_id = ? AND concept_id IN (${placeholders})`
        )
        .get(...args) as { max_seq: number | null };

      return Math.max(
        verificationRow.max_seq ?? 0,
        claimRow.max_seq ?? 0,
        retractionRow.max_seq ?? 0
      );
    },
    getPeopleWithEvents(): string[] {
      const rows = db
        .prepare(
          `SELECT DISTINCT person_id FROM (
             SELECT person_id FROM verification_events
             UNION
             SELECT person_id FROM claim_events
             UNION
             SELECT person_id FROM retraction_events
           )
           WHERE person_id IS NOT NULL AND person_id != ''`
        )
        .all() as Array<{ person_id: string }>;
      return rows.map((r) => r.person_id);
    },
    getConceptIdsWithEvents(personId: string): string[] {
      const rows = db
        .prepare(
          `SELECT DISTINCT concept_id FROM (
             SELECT concept_id FROM verification_events WHERE person_id = ?
             UNION
             SELECT concept_id FROM claim_events WHERE person_id = ?
             UNION
             SELECT concept_id FROM retraction_events WHERE person_id = ?
           )
           WHERE concept_id IS NOT NULL AND concept_id != ''`
        )
        .all(personId, personId, personId) as Array<{ concept_id: string }>;
      return rows.map((r) => r.concept_id);
    },

    // --- Trust State ---
    getTrustState(personId: string, conceptId: string): StoredTrustState | null {
      const row = stmts.getTrustState.get(personId, conceptId);
      return row ? rowToTrustState(row) : null;
    },
    upsertTrustState(state: StoredTrustState) {
      const versions = this.getVersionMetadata();
      stmts.upsertTrustState.run(
        state.personId,
        state.conceptId,
        state.level,
        state.confidence,
        state.lastVerified,
        JSON.stringify(state.inferredFrom),
        JSON.stringify(state.modalitiesTested),
        state.derivedFromEventSeq ?? this.getCurrentEventSeq(),
        state.graphVersion ?? versions.graphVersion,
        state.modelVersion ?? versions.modelVersion,
        state.modalityTaxonomyVersion ?? versions.modalityTaxonomyVersion,
        state.computedAt ?? Date.now()
      );
    },
    deleteTrustStatesForConcepts(personId: string, conceptIds: string[]): void {
      if (conceptIds.length === 0) return;
      const placeholders = conceptIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM trust_states WHERE person_id = ? AND concept_id IN (${placeholders})`)
        .run(personId, ...conceptIds);
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
