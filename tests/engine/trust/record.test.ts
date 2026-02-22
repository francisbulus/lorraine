// Test: Recording a verification updates trust state correctly.
// Test: Cross-modality verification produces higher trust than single-modality.
// Test: Contradictory signals across modalities produce a contested state.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, LEARNER_ID, CONCEPTS } from './helpers.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { getTrustState } from '../../../engine/trust/query.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('recordVerification', () => {
  it('updates trust state from untested to verified on demonstrated result', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Asked to derive reliability protocol from first principles',
      timestamp: now,
    });

    expect(result.level).toBe('verified');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.lastVerified).toBe(now);
    expect(result.verificationHistory).toHaveLength(1);
    expect(result.modalitiesTested).toContain('grill:transfer');
  });

  it('persists state that can be read back via getTrustState', () => {
    store = createTestGraph();
    const now = Date.now();

    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Wrote TCP handshake code from scratch',
      timestamp: now,
    });

    const state = getTrustState(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });

    expect(state.level).toBe('verified');
    expect(state.confidence).toBeGreaterThan(0);
    expect(state.verificationHistory).toHaveLength(1);
    expect(state.verificationHistory[0]!.modality).toBe('sandbox:execution');
  });

  it('returns untested for concepts with no verification events', () => {
    store = createTestGraph();

    const state = getTrustState(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.E.id,
    });

    expect(state.level).toBe('untested');
    expect(state.confidence).toBe(0);
    expect(state.verificationHistory).toHaveLength(0);
    expect(state.modalitiesTested).toHaveLength(0);
  });
});

describe('cross-modality verification', () => {
  it('produces higher confidence than single-modality verification', () => {
    store = createTestGraph();
    const now = Date.now();

    // Single modality on concept A.
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled TCP reliability basics',
      timestamp: now,
    });

    const singleModalityState = getTrustState(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now,
    });

    // Multiple modalities on concept B.
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived handshake from first principles',
      timestamp: now,
    });
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Implemented handshake in code',
      timestamp: now + 1,
    });
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'write:explanation',
      result: 'demonstrated',
      context: 'Wrote clear explanation of handshake process',
      timestamp: now + 2,
    });

    const multiModalityState = getTrustState(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now + 2,
    });

    expect(multiModalityState.confidence).toBeGreaterThan(singleModalityState.confidence);
    expect(multiModalityState.modalitiesTested).toHaveLength(3);
    expect(singleModalityState.modalitiesTested).toHaveLength(1);
  });
});

describe('contested state', () => {
  it('produces contested state when demonstrated and failed results coexist', () => {
    store = createTestGraph();
    const now = Date.now();

    // First: demonstrate understanding through one modality.
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Correctly recalled sequence number purpose',
      timestamp: now,
    });

    // Then: fail in a different context.
    recordVerification(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'grill:transfer',
      result: 'failed',
      context: 'Could not apply sequence number concept to a novel protocol',
      timestamp: now + 1000,
    });

    const state = getTrustState(store, {
      learnerId: LEARNER_ID,
      conceptId: CONCEPTS.C.id,
      asOfTimestamp: now + 1000,
    });

    // The most informationally rich state — boundary of understanding.
    expect(state.level).toBe('contested');
    expect(state.confidence).toBeGreaterThan(0);
    expect(state.confidence).toBeLessThan(1);
    expect(state.verificationHistory).toHaveLength(2);
  });
});
