// Test: getBulkTrustState returns trust state for multiple concepts.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { getBulkTrustState } from '../../../engine/trust/query.js';
import { recordVerification } from '../../../engine/trust/record.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('getBulkTrustState', () => {
  it('returns filtered trust states for specified conceptIds', () => {
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

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Code execution',
      timestamp: now,
    });

    const results = getBulkTrustState(store, {
      personId: PERSON_ID,
      conceptIds: [CONCEPTS.A.id, CONCEPTS.B.id],
      asOfTimestamp: now,
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.conceptId).toBe(CONCEPTS.A.id);
    expect(results[1]!.conceptId).toBe(CONCEPTS.B.id);
    expect(results[0]!.level).toBe('verified');
    expect(results[1]!.level).toBe('verified');
  });

  it('returns all concepts with trust state when conceptIds is omitted', () => {
    store = createTestGraph();
    const now = Date.now();

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recall',
      timestamp: now,
    });

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'write:explanation',
      result: 'demonstrated',
      context: 'Explanation',
      timestamp: now,
    });

    const results = getBulkTrustState(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    // Should include A and C (the ones with trust state).
    expect(results.length).toBe(2);
    const ids = results.map(r => r.conceptId);
    expect(ids).toContain(CONCEPTS.A.id);
    expect(ids).toContain(CONCEPTS.C.id);
  });

  it('returns empty array when no trust states exist', () => {
    store = createTestGraph();

    const results = getBulkTrustState(store, {
      personId: PERSON_ID,
    });

    expect(results).toHaveLength(0);
  });

  it('returns same shape as getTrustState for each element', () => {
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

    const results = getBulkTrustState(store, {
      personId: PERSON_ID,
      conceptIds: [CONCEPTS.A.id],
      asOfTimestamp: now,
    });

    expect(results).toHaveLength(1);
    const state = results[0]!;

    // Verify all TrustState fields exist.
    expect(state).toHaveProperty('conceptId');
    expect(state).toHaveProperty('personId');
    expect(state).toHaveProperty('level');
    expect(state).toHaveProperty('confidence');
    expect(state).toHaveProperty('verificationHistory');
    expect(state).toHaveProperty('claimHistory');
    expect(state).toHaveProperty('modalitiesTested');
    expect(state).toHaveProperty('lastVerified');
    expect(state).toHaveProperty('inferredFrom');
    expect(state).toHaveProperty('decayedConfidence');
    expect(state).toHaveProperty('calibrationGap');
  });
});
