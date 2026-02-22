// Test: getTrustState returns the full trust object including
// verification history, modalities tested, and decayed confidence.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { getTrustState } from '../../../engine/trust/query.js';
import { propagateTrust } from '../../../engine/trust/propagate.js';
import type { Store } from '../../../engine/store/interface.js';
import type { VerificationEvent } from '../../../engine/types.js';

let store: Store;

const MS_PER_DAY = 86_400_000;

afterEach(() => {
  store?.close();
});

describe('getTrustState — full trust object', () => {
  it('returns complete trust state with all fields populated', () => {
    store = createTestGraph();
    const now = Date.now();

    // Record multiple verifications across modalities.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived reliability protocol from first principles',
      timestamp: now,
    });

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Implemented TCP reliability in code',
      timestamp: now + 1000,
    });

    // Query the state after some time has passed.
    const futureTimestamp = now + 7 * MS_PER_DAY;
    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: futureTimestamp,
    });

    // Full trust object contract from engine-api.md:
    expect(state.conceptId).toBe(CONCEPTS.A.id);
    expect(state.personId).toBe(PERSON_ID);
    expect(state.level).toBe('verified');
    expect(state.confidence).toBeGreaterThan(0);
    expect(state.confidence).toBeLessThanOrEqual(1);

    // Verification history — ordered list of all events.
    expect(state.verificationHistory).toHaveLength(2);
    expect(state.verificationHistory[0]!.modality).toBe('grill:transfer');
    expect(state.verificationHistory[1]!.modality).toBe('sandbox:execution');
    expect(state.verificationHistory[0]!.timestamp).toBeLessThan(
      state.verificationHistory[1]!.timestamp
    );

    // Modalities tested.
    expect(state.modalitiesTested).toContain('grill:transfer');
    expect(state.modalitiesTested).toContain('sandbox:execution');
    expect(state.modalitiesTested).toHaveLength(2);

    // Last verified timestamp.
    expect(state.lastVerified).toBe(now + 1000);

    // Decayed confidence — should be less than raw confidence after 7 days.
    expect(state.decayedConfidence).toBeLessThan(state.confidence);
    expect(state.decayedConfidence).toBeGreaterThan(0);
  });

  it('returns inferredFrom when trust was propagated', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify A and propagate to B.
    const result = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived from first principles',
      timestamp: now,
    });

    const event: VerificationEvent = result.verificationHistory[0]!;
    propagateTrust(store, {
      personId: PERSON_ID,
      sourceConceptId: CONCEPTS.A.id,
      verificationEvent: event,
    });

    const bState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });

    expect(bState.level).toBe('inferred');
    expect(bState.inferredFrom).toContain(CONCEPTS.A.id);
    expect(bState.inferredFrom.length).toBeGreaterThan(0);
  });

  it('returns untested with empty arrays for unknown concepts', () => {
    store = createTestGraph();

    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.E.id,
    });

    expect(state.level).toBe('untested');
    expect(state.confidence).toBe(0);
    expect(state.decayedConfidence).toBe(0);
    expect(state.verificationHistory).toEqual([]);
    expect(state.modalitiesTested).toEqual([]);
    expect(state.inferredFrom).toEqual([]);
    expect(state.lastVerified).toBeNull();
  });
});
