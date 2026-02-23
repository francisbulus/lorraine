import { describe, it, expect } from 'vitest';
import { createSQLiteStore, loadConcepts, recordVerification } from '../../src/engine.js';
import { scoreReviewers } from '../../src/lib/reviewer-scoring.js';

function setupStore() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'auth-boundaries', name: 'Auth Boundaries', description: '' },
      { id: 'cache-coherency', name: 'Cache Coherency', description: '' },
    ],
    edges: [],
  });
  return store;
}

describe('scoreReviewers', () => {
  it('ranks by verified count then score', () => {
    const store = setupStore();
    try {
      // bob: verified on both
      recordVerification(store, { personId: 'bob', conceptId: 'auth-boundaries', modality: 'external:observed', result: 'demonstrated', context: 'test' });
      recordVerification(store, { personId: 'bob', conceptId: 'cache-coherency', modality: 'external:observed', result: 'demonstrated', context: 'test' });

      // sarah: verified on auth only
      recordVerification(store, { personId: 'sarah', conceptId: 'auth-boundaries', modality: 'external:observed', result: 'demonstrated', context: 'test' });

      // alice: no relevant trust
      recordVerification(store, { personId: 'alice', conceptId: 'auth-boundaries', modality: 'grill:recall', result: 'partial', context: 'test' });

      const results = scoreReviewers(store, ['auth-boundaries', 'cache-coherency'], ['bob', 'sarah', 'alice'], 3);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0]!.personId).toBe('bob');
      expect(results[0]!.verifiedCount).toBe(2);
      expect(results[1]!.personId).toBe('sarah');
      expect(results[1]!.verifiedCount).toBe(1);
    } finally {
      store.close();
    }
  });

  it('returns empty array when no one has trust', () => {
    const store = setupStore();
    try {
      const results = scoreReviewers(store, ['auth-boundaries'], ['nobody'], 3);
      expect(results).toHaveLength(0);
    } finally {
      store.close();
    }
  });

  it('respects topN limit', () => {
    const store = setupStore();
    try {
      recordVerification(store, { personId: 'a', conceptId: 'auth-boundaries', modality: 'external:observed', result: 'demonstrated', context: '' });
      recordVerification(store, { personId: 'b', conceptId: 'auth-boundaries', modality: 'external:observed', result: 'demonstrated', context: '' });
      recordVerification(store, { personId: 'c', conceptId: 'auth-boundaries', modality: 'external:observed', result: 'demonstrated', context: '' });

      const results = scoreReviewers(store, ['auth-boundaries'], ['a', 'b', 'c'], 2);
      expect(results).toHaveLength(2);
    } finally {
      store.close();
    }
  });
});
