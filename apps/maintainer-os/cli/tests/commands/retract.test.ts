import { describe, it, expect } from 'vitest';
import { createSQLiteStore, loadConcepts, recordVerification, retractEvent, getTrustState } from '../../src/engine.js';

function setupStore() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'rollback-strategy', name: 'Rollback Strategy', description: '' },
    ],
    edges: [],
  });
  return store;
}

describe('retract integration', () => {
  it('retracts a verification event and recomputes trust', () => {
    const store = setupStore();
    try {
      const state = recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'test',
      });

      // Find the event ID
      const trustBefore = getTrustState(store, { personId: 'alice', conceptId: 'rollback-strategy' });
      expect(trustBefore.level).toBe('verified');
      const eventId = trustBefore.verificationHistory[0]!.id;

      const result = retractEvent(store, {
        eventId,
        eventType: 'verification',
        reason: 'duplicate',
        retractedBy: 'admin',
      });

      expect(result.retracted).toBe(true);

      // Trust should be recomputed
      const trustAfter = getTrustState(store, { personId: 'alice', conceptId: 'rollback-strategy' });
      expect(trustAfter.level).toBe('untested');
    } finally {
      store.close();
    }
  });

  it('returns false for nonexistent event', () => {
    const store = setupStore();
    try {
      const result = retractEvent(store, {
        eventId: 'nonexistent',
        eventType: 'verification',
        reason: 'duplicate',
        retractedBy: 'admin',
      });

      expect(result.retracted).toBe(false);
    } finally {
      store.close();
    }
  });
});
