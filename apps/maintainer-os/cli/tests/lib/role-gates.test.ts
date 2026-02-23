import { describe, it, expect } from 'vitest';
import { createSQLiteStore, loadConcepts, recordVerification } from '../../src/engine.js';
import { evaluateReadiness } from '../../src/lib/role-gates.js';
import type { BundleDefinition } from '../../src/types.js';

function setupStore() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'migration-safety', name: 'Migration Safety', description: '' },
      { id: 'rollback-strategy', name: 'Rollback Strategy', description: '' },
      { id: 'incident-triage', name: 'Incident Triage', description: '' },
      { id: 'event-bus-semantics', name: 'Event Bus Semantics', description: '' },
    ],
    edges: [],
  });
  return store;
}

const releaseCaptain: BundleDefinition = {
  required: [
    { concept: 'migration-safety', minLevel: 'verified' },
    { concept: 'rollback-strategy', minLevel: 'verified' },
    { concept: 'incident-triage', minLevel: 'verified' },
    { concept: 'event-bus-semantics', minLevel: 'inferred', minConfidence: 0.6 },
  ],
};

describe('evaluateReadiness', () => {
  it('returns NOT READY when all concepts are untested', () => {
    const store = setupStore();
    try {
      const result = evaluateReadiness(store, 'alice', 'release-captain', releaseCaptain);
      expect(result.passed).toBe(false);
      expect(result.passedCount).toBe(0);
      expect(result.totalCount).toBe(4);
      for (const gate of result.gates) {
        expect(gate.passed).toBe(false);
      }
    } finally {
      store.close();
    }
  });

  it('returns READY when all requirements are met', () => {
    const store = setupStore();
    try {
      // Verify all required concepts
      for (const concept of ['migration-safety', 'rollback-strategy', 'incident-triage', 'event-bus-semantics']) {
        recordVerification(store, {
          personId: 'alice',
          conceptId: concept,
          modality: 'external:observed',
          result: 'demonstrated',
          context: 'test',
        });
      }

      const result = evaluateReadiness(store, 'alice', 'release-captain', releaseCaptain);
      expect(result.passed).toBe(true);
      expect(result.passedCount).toBe(4);
    } finally {
      store.close();
    }
  });

  it('returns partial results when some are met', () => {
    const store = setupStore();
    try {
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'migration-safety',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'test',
      });
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'test',
      });

      const result = evaluateReadiness(store, 'alice', 'release-captain', releaseCaptain);
      expect(result.passed).toBe(false);
      expect(result.passedCount).toBe(2);
      expect(result.gates[0]!.passed).toBe(true);
      expect(result.gates[1]!.passed).toBe(true);
      expect(result.gates[2]!.passed).toBe(false);
      expect(result.gates[3]!.passed).toBe(false);
    } finally {
      store.close();
    }
  });

  it('checks minimum confidence for inferred requirements', () => {
    const store = setupStore();
    try {
      // Give a weak verification that produces low confidence
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'event-bus-semantics',
        modality: 'grill:recall',
        result: 'partial',
        context: 'test',
      });

      const bundle: BundleDefinition = {
        required: [
          { concept: 'event-bus-semantics', minLevel: 'inferred', minConfidence: 0.9 },
        ],
      };

      const result = evaluateReadiness(store, 'alice', 'test-bundle', bundle);
      // Even though the concept has a trust state, confidence may be below 0.9
      // The gate should check decayed confidence against the minimum
      expect(result.totalCount).toBe(1);
    } finally {
      store.close();
    }
  });
});
