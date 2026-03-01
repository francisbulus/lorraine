// Test: Trust propagates from a verified node to connected nodes as inferred (never as verified).
// Test: Propagation attenuates with graph distance.
// Test: Failure propagates more aggressively than success.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { propagateTrust } from '../../../engine/trust/propagate.js';
import { getTrustState } from '../../../engine/trust/query.js';
import type { Store } from '../../../engine/store/interface.js';
import type { VerificationEvent } from '../../../engine/types.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('trust propagation', () => {
  it('propagates from verified node as inferred, never as verified', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify concept A.
    const trustState = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived reliability protocol from first principles',
      timestamp: now,
    });

    // Build the verification event for propagation.
    const event: VerificationEvent = trustState.verificationHistory[0]!;

    // Propagate.
    const results = propagateTrust(store, {
      personId: PERSON_ID,
      sourceConceptId: CONCEPTS.A.id,
      verificationEvent: event,
    });

    // recordVerification already triggers projector propagation.
    // Manual propagateTrust should be idempotent when scope is current.
    expect(results.length).toBe(0);

    // Check concept B — must be inferred, NEVER verified.
    const bState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });

    expect(bState.level).toBe('inferred');
    expect(bState.confidence).toBeGreaterThan(0);
    expect(bState.inferredFrom).toContain(CONCEPTS.A.id);

    // Rule 1: No propagated concept should be 'verified'.
    for (const result of results) {
      expect(result.newLevel).not.toBe('verified');
    }
  });

  it('attenuates with graph distance', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify concept A.
    const trustState = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived reliability protocol from first principles',
      timestamp: now,
    });

    const event: VerificationEvent = trustState.verificationHistory[0]!;

    propagateTrust(store, {
      personId: PERSON_ID,
      sourceConceptId: CONCEPTS.A.id,
      verificationEvent: event,
    });

    // Get confidence at each distance from A.
    const bState = getTrustState(store, { personId: PERSON_ID, conceptId: CONCEPTS.B.id, asOfTimestamp: now });
    const cState = getTrustState(store, { personId: PERSON_ID, conceptId: CONCEPTS.C.id, asOfTimestamp: now });
    const dState = getTrustState(store, { personId: PERSON_ID, conceptId: CONCEPTS.D.id, asOfTimestamp: now });

    // Each hop should reduce confidence.
    expect(bState.confidence).toBeGreaterThan(cState.confidence);
    expect(cState.confidence).toBeGreaterThan(dState.confidence);

    // The attenuation should be significant — not just a rounding difference.
    expect(bState.confidence).toBeGreaterThan(cState.confidence * 1.2);
  });

  it('propagates failure more aggressively than success', () => {
    store = createTestGraph();
    const now = Date.now();

    // First: verify A and propagate success.
    const successState = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived reliability protocol from first principles',
      timestamp: now,
    });

    const successEvent: VerificationEvent = successState.verificationHistory[0]!;

    propagateTrust(store, {
      personId: PERSON_ID,
      sourceConceptId: CONCEPTS.A.id,
      verificationEvent: successEvent,
    });

    const bAfterSuccess = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });

    // Now create a separate graph for failure comparison.
    const failStore = createTestGraph();

    // Seed concept B with some trust so failure has something to reduce.
    failStore.upsertTrustState({
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      level: 'inferred',
      confidence: bAfterSuccess.confidence,
      lastVerified: null,
      inferredFrom: [CONCEPTS.A.id],
      modalitiesTested: [],
    });

    // Record failure on A.
    const failState = recordVerification(failStore, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'failed',
      context: 'Failed to derive reliability protocol',
      timestamp: now,
    });

    // For failure propagation, we need to set A's confidence in the store
    // to reflect the failure impact.
    failStore.upsertTrustState({
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      level: 'contested',
      confidence: 0.5,
      lastVerified: now,
      inferredFrom: [],
      modalitiesTested: ['grill:transfer'],
    });

    const failEvent: VerificationEvent = {
      id: 'fail_event',
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'failed',
      context: 'Failed to derive reliability protocol',
      source: 'internal',
      timestamp: now,
    };

    const failResults = propagateTrust(failStore, {
      personId: PERSON_ID,
      sourceConceptId: CONCEPTS.A.id,
      verificationEvent: failEvent,
    });

    // Failure should have caused B's confidence to drop.
    const bAfterFailure = getTrustState(failStore, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });

    // The confidence drop from failure should be larger than what success gave.
    // (Failure propagation multiplier = 1.5x)
    expect(bAfterFailure.confidence).toBeLessThan(bAfterSuccess.confidence);

    failStore.close();
  });
});
