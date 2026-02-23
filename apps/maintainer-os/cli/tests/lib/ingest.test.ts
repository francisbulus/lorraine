import { describe, it, expect } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createSQLiteStore, loadConcepts, getTrustState } from '../../src/engine.js';
import { ingestEventsFromFile } from '../../src/lib/ingest.js';

const FIXTURE_DIR = resolve(tmpdir(), 'mos-ingest-test-' + process.pid);
const EVENTS_FIXTURE = resolve(import.meta.dirname, '../../fixtures/example-events.json');

function createStoreWithDomain() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'rollback-strategy', name: 'Rollback Strategy', description: '' },
      { id: 'incident-triage', name: 'Incident Triage', description: '' },
      { id: 'log-analysis', name: 'Log Analysis', description: '' },
      { id: 'auth-boundaries', name: 'Auth Boundaries', description: '' },
      { id: 'cache-coherency', name: 'Cache Coherency', description: '' },
      { id: 'migration-safety', name: 'Migration Safety', description: '' },
      { id: 'event-bus-semantics', name: 'Event Bus Semantics', description: '' },
    ],
    edges: [
      { from: 'log-analysis', to: 'incident-triage', type: 'prerequisite', inferenceStrength: 0.6 },
    ],
  });
  return store;
}

describe('ingestEventsFromFile', () => {
  it('ingests valid JSON events and updates trust state', () => {
    const store = createStoreWithDomain();
    try {
      const result = ingestEventsFromFile(store, EVENTS_FIXTURE);
      expect(result.processed).toBe(9);
      expect(result.verifications).toBe(7);
      expect(result.claims).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.conceptsAffected.size).toBeGreaterThan(0);

      // Verify trust state was updated
      const aliceRollback = getTrustState(store, { personId: 'alice', conceptId: 'rollback-strategy' });
      expect(aliceRollback.level).toBe('verified');
      expect(aliceRollback.confidence).toBeGreaterThan(0);

      // log-analysis has demonstrated + partial, engine treats partial as non-conflicting
      const aliceLog = getTrustState(store, { personId: 'alice', conceptId: 'log-analysis' });
      expect(aliceLog.level).toBe('verified');
      expect(aliceLog.verificationHistory.length).toBe(2);
    } finally {
      store.close();
    }
  });

  it('skips invalid events without crashing', () => {
    const store = createStoreWithDomain();
    const tmpFile = resolve(tmpdir(), 'mos-test-invalid-events.json');
    writeFileSync(tmpFile, JSON.stringify([
      { type: 'verification', conceptId: 'rollback-strategy', personId: 'alice', modality: 'external:observed', result: 'demonstrated', context: 'valid' },
      { type: 'verification', conceptId: 'rollback-strategy' },
      { type: 'verification', personId: 'alice', conceptId: 'x', modality: 'fake', result: 'bad' },
      { type: 'unknown', personId: 'alice', conceptId: 'rollback-strategy' },
    ]));

    try {
      const result = ingestEventsFromFile(store, tmpFile);
      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(3);
      expect(result.errors).toHaveLength(3);
    } finally {
      store.close();
      rmSync(tmpFile, { force: true });
    }
  });

  it('handles CSV format', () => {
    const store = createStoreWithDomain();
    const tmpFile = resolve(tmpdir(), 'mos-test-events.csv');
    writeFileSync(tmpFile, [
      'type,conceptId,personId,modality,result,context,source',
      'verification,rollback-strategy,alice,external:observed,demonstrated,csv test,external',
    ].join('\n'));

    try {
      const result = ingestEventsFromFile(store, tmpFile);
      expect(result.processed).toBe(1);
      expect(result.verifications).toBe(1);
      expect(result.skipped).toBe(0);
    } finally {
      store.close();
      rmSync(tmpFile, { force: true });
    }
  });
});
