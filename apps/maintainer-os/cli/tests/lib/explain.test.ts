import { describe, it, expect } from 'vitest';
import { createSQLiteStore, loadConcepts, recordVerification, recordClaim, propagateTrust } from '../../src/engine.js';
import type { Modality } from '../../src/engine.js';
import { buildExplanation, formatExplanation, explanationToJson } from '../../src/lib/explain.js';

function setupStore() {
  const store = createSQLiteStore(':memory:');
  loadConcepts(store, {
    concepts: [
      { id: 'log-analysis', name: 'Log Analysis', description: '' },
      { id: 'incident-triage', name: 'Incident Triage', description: '' },
      { id: 'rollback-strategy', name: 'Rollback Strategy', description: '' },
    ],
    edges: [
      { from: 'log-analysis', to: 'incident-triage', type: 'prerequisite', inferenceStrength: 0.6 },
    ],
  });
  return store;
}

describe('buildExplanation', () => {
  it('explains a verified concept with evidence chain', () => {
    const store = setupStore();
    try {
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'Rolled back v2.4.7',
      });

      const data = buildExplanation(store, 'alice', 'rollback-strategy');
      expect(data.state.level).toBe('verified');
      expect(data.state.verificationHistory).toHaveLength(1);
      expect(data.explanation.reasoning).toBeTruthy();
    } finally {
      store.close();
    }
  });

  it('explains an inferred concept with inference chain', () => {
    const store = setupStore();
    try {
      const event = recordVerification(store, {
        personId: 'alice',
        conceptId: 'log-analysis',
        modality: 'grill:transfer',
        result: 'demonstrated',
        context: 'Transfer test passed',
      });
      propagateTrust(store, {
        personId: 'alice',
        sourceConceptId: 'log-analysis',
        verificationEvent: {
          id: 'test',
          personId: 'alice',
          conceptId: 'log-analysis',
          modality: 'grill:transfer' as Modality,
          result: 'demonstrated',
          context: '',
          source: 'internal',
          timestamp: Date.now(),
        },
      });

      const data = buildExplanation(store, 'alice', 'incident-triage');
      expect(data.state.level).toBe('inferred');
      expect(data.state.inferredFrom).toContain('log-analysis');
    } finally {
      store.close();
    }
  });

  it('explains an untested concept', () => {
    const store = setupStore();
    try {
      const data = buildExplanation(store, 'alice', 'rollback-strategy');
      expect(data.state.level).toBe('untested');
      expect(data.state.verificationHistory).toHaveLength(0);
    } finally {
      store.close();
    }
  });
});

describe('formatExplanation', () => {
  it('produces readable output for verified concept', () => {
    const store = setupStore();
    try {
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'Rolled back v2.4.7',
      });

      const data = buildExplanation(store, 'alice', 'rollback-strategy');
      const output = formatExplanation(data);
      expect(output).toContain('Explanation');
      expect(output).toContain('rollback-strategy');
      expect(output).toContain('EVIDENCE');
      expect(output).toContain('demonstrated');
    } finally {
      store.close();
    }
  });
});

describe('explanationToJson', () => {
  it('produces valid JSON structure', () => {
    const store = setupStore();
    try {
      recordVerification(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        modality: 'external:observed',
        result: 'demonstrated',
        context: 'test',
      });
      recordClaim(store, {
        personId: 'alice',
        conceptId: 'rollback-strategy',
        selfReportedConfidence: 0.8,
        context: 'self-assessment',
      });

      const data = buildExplanation(store, 'alice', 'rollback-strategy');
      const json = explanationToJson(data) as Record<string, unknown>;
      expect(json['level']).toBe('verified');
      expect(json['verificationHistory']).toHaveLength(1);
      expect(json['claimHistory']).toHaveLength(1);
      expect(json['explanation']).toBeDefined();
    } finally {
      store.close();
    }
  });
});
