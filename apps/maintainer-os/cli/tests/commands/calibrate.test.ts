import { describe, it, expect } from 'vitest';
import { createSQLiteStore, loadConcepts, recordVerification, recordClaim, calibrate } from '../../src/engine.js';

function setupStore() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'log-analysis', name: 'Log Analysis', description: '' },
      { id: 'rollback-strategy', name: 'Rollback Strategy', description: '' },
    ],
    edges: [],
  });
  return store;
}

describe('calibrate integration', () => {
  it('returns calibration metrics for a person with events', () => {
    const store = setupStore();
    try {
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'test',
      });
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'log-analysis',
        modality: 'grill:transfer',
        result: 'demonstrated',
        context: 'test',
      });
      recordClaim(store, {
        personId: 'alice',
        conceptId: 'log-analysis',
        selfReportedConfidence: 0.8,
        context: 'self-assessment',
      });

      const result = calibrate(store, { personId: 'alice' });
      expect(result.predictionAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.predictionAccuracy).toBeLessThanOrEqual(1);
      expect(result.stalePercentage).toBeGreaterThanOrEqual(0);
      expect(result.claimCalibration).toBeGreaterThanOrEqual(0);
      expect(result.recommendation).toBeTruthy();
    } finally {
      store.close();
    }
  });

  it('handles person with no events gracefully', () => {
    const store = setupStore();
    try {
      const result = calibrate(store, { personId: 'nobody' });
      expect(result.recommendation).toBeTruthy();
    } finally {
      store.close();
    }
  });
});
