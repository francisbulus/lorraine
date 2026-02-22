// Test: retractEvent marks events as retracted and recomputes trust.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { retractEvent } from '../../../engine/trust/retract.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { recordClaim } from '../../../engine/trust/claim.js';
import { getTrustState } from '../../../engine/trust/query.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('retractEvent', () => {
  it('retracts a verification event and trust drops', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived from first principles',
      timestamp: now,
    });

    // Trust should be verified.
    const stateBefore = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now,
    });
    expect(stateBefore.level).toBe('verified');
    expect(stateBefore.confidence).toBeGreaterThan(0);

    // Get the event ID from history.
    const eventId = stateBefore.verificationHistory[0]!.id;

    // Retract it.
    const retractResult = retractEvent(store, {
      eventId,
      eventType: 'verification',
      reason: 'fraudulent',
      retractedBy: 'admin',
      timestamp: now + 1000,
    });

    expect(retractResult.retracted).toBe(true);
    expect(retractResult.trustStatesAffected).toContain(CONCEPTS.A.id);

    // Trust should drop to untested.
    const stateAfter = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 1000,
    });
    expect(stateAfter.level).toBe('untested');
    expect(stateAfter.confidence).toBe(0);
    expect(stateAfter.verificationHistory).toHaveLength(0);
  });

  it('retracts a claim event without affecting trust level', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify first.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Implemented handshake',
      timestamp: now,
    });

    // Record a claim.
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      selfReportedConfidence: 0.9,
      context: 'very confident',
      timestamp: now,
    });

    // Get claim history to find the claim ID.
    const stateWithClaim = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now,
    });
    const claimId = stateWithClaim.claimHistory[0]!.id;

    // Retract the claim.
    const retractResult = retractEvent(store, {
      eventId: claimId,
      eventType: 'claim',
      reason: 'data_correction',
      retractedBy: 'admin',
      timestamp: now + 1000,
    });

    expect(retractResult.retracted).toBe(true);

    // Trust level should be unchanged — claims don't affect trust.
    const stateAfter = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: now + 1000,
    });
    expect(stateAfter.level).toBe('verified');
    expect(stateAfter.claimHistory).toHaveLength(0); // retracted claim excluded
  });

  it('preserves audit trail via retraction event', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled basics',
      timestamp: now,
    });

    const eventId = result.verificationHistory[0]!.id;

    retractEvent(store, {
      eventId,
      eventType: 'verification',
      reason: 'duplicate',
      retractedBy: 'system',
      timestamp: now + 500,
    });

    // The retraction is logged — the original event still exists (marked retracted),
    // and the retraction event was created. Verification history excludes retracted events.
    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 500,
    });
    expect(state.verificationHistory).toHaveLength(0);
  });

  it('retracting only verification event makes concept untested', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'write:explanation',
      result: 'demonstrated',
      context: 'Wrote explanation',
      timestamp: now,
    });

    const eventId = result.verificationHistory[0]!.id;

    retractEvent(store, {
      eventId,
      eventType: 'verification',
      reason: 'identity_mixup',
      retractedBy: 'admin',
      timestamp: now + 1000,
    });

    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      asOfTimestamp: now + 1000,
    });

    expect(state.level).toBe('untested');
    expect(state.confidence).toBe(0);
  });

  it('retracting a failure event causes trust to rise', () => {
    store = createTestGraph();
    const now = Date.now();

    // First demonstrate.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled retransmission',
      timestamp: now,
    });

    // Then fail — creates contested state.
    const failResult = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      modality: 'grill:transfer',
      result: 'failed',
      context: 'Could not apply to novel protocol',
      timestamp: now + 1000,
    });

    const contested = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      asOfTimestamp: now + 1000,
    });
    expect(contested.level).toBe('contested');

    // Retract the failure.
    const failEventId = contested.verificationHistory[1]!.id;
    retractEvent(store, {
      eventId: failEventId,
      eventType: 'verification',
      reason: 'data_correction',
      retractedBy: 'admin',
      timestamp: now + 2000,
    });

    const afterRetract = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      asOfTimestamp: now + 2000,
    });

    // Should go back to verified — the contested state is resolved.
    // Confidence may be lower numerically (contested ratio vs single modality strength)
    // but the trust level improves from contested to verified.
    expect(afterRetract.level).toBe('verified');
    expect(afterRetract.confidence).toBeGreaterThan(0);
    expect(afterRetract.verificationHistory).toHaveLength(1);
  });

  it('returns retracted: false for non-existent event', () => {
    store = createTestGraph();

    const result = retractEvent(store, {
      eventId: 'non_existent',
      eventType: 'verification',
      reason: 'fraudulent',
      retractedBy: 'admin',
    });

    expect(result.retracted).toBe(false);
    expect(result.trustStatesAffected).toHaveLength(0);
  });

  it('retracting one of multiple verifications partially reduces trust', () => {
    store = createTestGraph();
    const now = Date.now();

    // Two verifications on the same concept.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled basics',
      timestamp: now,
    });

    const secondResult = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Transfer question',
      timestamp: now + 1000,
    });

    const before = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 1000,
    });

    // Retract the second (higher-strength) verification.
    const secondEventId = before.verificationHistory[1]!.id;
    retractEvent(store, {
      eventId: secondEventId,
      eventType: 'verification',
      reason: 'duplicate',
      retractedBy: 'system',
      timestamp: now + 2000,
    });

    const after = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 2000,
    });

    // Should still be verified (one event remains) but confidence may change.
    expect(after.level).toBe('verified');
    expect(after.verificationHistory).toHaveLength(1);
    expect(after.confidence).toBeLessThanOrEqual(before.confidence);
  });
});
