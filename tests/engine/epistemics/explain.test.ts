// Test: explainDecision makes engine reasoning transparent.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from '../trust/helpers.js';
import { explainDecision } from '../../../engine/epistemics/explain.js';
import { recordVerification } from '../../../engine/trust/record.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('explainDecision', () => {
  it('explains a trust_update decision', () => {
    store = createTestGraph();
    const now = Date.now();

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Transfer question',
      timestamp: now,
    });

    const result = explainDecision(store, {
      decisionType: 'trust_update',
      decisionContext: {
        conceptId: CONCEPTS.A.id,
        personId: PERSON_ID,
        previousLevel: 'untested',
        newLevel: 'verified',
        confidence: 0.7,
      },
    });

    expect(result.reasoning).toContain('verified');
    expect(result.reasoning).toContain(CONCEPTS.A.id);
    expect(result.trustInputs.conceptId).toBe(CONCEPTS.A.id);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(0.7);
  });

  it('explains a propagation_result decision', () => {
    store = createTestGraph();

    const result = explainDecision(store, {
      decisionType: 'propagation_result',
      decisionContext: {
        sourceConceptId: CONCEPTS.A.id,
        targetConceptId: CONCEPTS.B.id,
        inferenceStrength: 0.56,
        depth: 1,
      },
    });

    expect(result.reasoning).toContain('propagated');
    expect(result.reasoning).toContain(CONCEPTS.A.id);
    expect(result.reasoning).toContain(CONCEPTS.B.id);
    expect(result.confidence).toBeCloseTo(0.56, 2);
  });

  it('explains a decay_result decision', () => {
    store = createTestGraph();

    const result = explainDecision(store, {
      decisionType: 'decay_result',
      decisionContext: {
        conceptId: CONCEPTS.C.id,
        daysSinceVerified: 30,
        previousConfidence: 0.7,
        decayedConfidence: 0.35,
      },
    });

    expect(result.reasoning).toContain('decayed');
    expect(result.reasoning).toContain('Ebbinghaus');
    expect(result.trustInputs.daysSinceVerified).toBe(30);
  });

  it('explains a contested_detection decision', () => {
    store = createTestGraph();

    const result = explainDecision(store, {
      decisionType: 'contested_detection',
      decisionContext: {
        conceptId: CONCEPTS.D.id,
        demonstratedCount: 3,
        failedCount: 1,
      },
    });

    expect(result.reasoning).toContain('contested');
    expect(result.reasoning).toContain('boundary');
    expect(result.confidence).toBeCloseTo(0.75, 2);
  });

  it('explains a calibration_finding decision', () => {
    store = createTestGraph();

    const result = explainDecision(store, {
      decisionType: 'calibration_finding',
      decisionContext: {
        metric: 'overconfidenceBias',
        value: 0.42,
      },
    });

    expect(result.reasoning).toContain('overconfidenceBias');
    expect(result.reasoning).toContain('Calibration');
    expect(result.confidence).toBeCloseTo(0.42, 2);
  });
});
