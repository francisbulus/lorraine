// Test: recordClaim records self-reported beliefs and computes calibration gaps.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { recordClaim } from '../../../engine/trust/claim.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { getTrustState } from '../../../engine/trust/query.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('recordClaim', () => {
  it('records a claim event and returns recorded: true', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.7,
      context: 'initial self-assessment',
      timestamp: now,
    });

    expect(result.recorded).toBe(true);
    expect(result.currentTrustState).toBeDefined();
    expect(typeof result.calibrationGap).toBe('number');
  });

  it('computes positive calibration gap for overclaiming on untested concept', () => {
    store = createTestGraph();
    const now = Date.now();

    const result = recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.8,
      context: 'claims strong understanding',
      timestamp: now,
    });

    // Untested concept has 0 confidence, so gap = 0.8 - 0 = 0.8
    expect(result.calibrationGap).toBeCloseTo(0.8, 2);
    expect(result.currentTrustState.level).toBe('untested');
  });

  it('computes negative calibration gap for underclaiming on verified concept', () => {
    store = createTestGraph();
    const now = Date.now();

    // First verify the concept.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived from first principles',
      timestamp: now,
    });

    // Then claim low confidence.
    const result = recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.1,
      context: 'admitted uncertainty',
      timestamp: now,
    });

    // Evidence says high confidence, claim says low — negative gap (underclaim).
    expect(result.calibrationGap).toBeLessThan(0);
    expect(result.currentTrustState.level).toBe('verified');
  });

  it('returns current evidence-based trust state alongside the claim', () => {
    store = createTestGraph();
    const now = Date.now();

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Implemented handshake',
      timestamp: now,
    });

    const result = recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      selfReportedConfidence: 0.6,
      context: 'moderate confidence',
      timestamp: now,
    });

    expect(result.currentTrustState.conceptId).toBe(CONCEPTS.B.id);
    expect(result.currentTrustState.personId).toBe(PERSON_ID);
    expect(result.currentTrustState.level).toBe('verified');
    expect(result.currentTrustState.confidence).toBeGreaterThan(0);
  });

  it('builds claim history over multiple claims', () => {
    store = createTestGraph();
    const now = Date.now();

    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.3,
      context: 'initial assessment',
      timestamp: now,
    });

    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.5,
      context: 'revised upward',
      timestamp: now + 1000,
    });

    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.7,
      context: 'revised upward again',
      timestamp: now + 2000,
    });

    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 2000,
    });

    expect(state.claimHistory).toHaveLength(3);
    expect(state.claimHistory[0]!.selfReportedConfidence).toBe(0.3);
    expect(state.claimHistory[2]!.selfReportedConfidence).toBe(0.7);
  });

  it('getTrustState reflects calibrationGap after a claim is recorded', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify and then claim.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'write:explanation',
      result: 'demonstrated',
      context: 'Wrote explanation of sequence numbers',
      timestamp: now,
    });

    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      selfReportedConfidence: 0.9,
      context: 'feels very confident',
      timestamp: now,
    });

    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      asOfTimestamp: now,
    });

    expect(state.calibrationGap).not.toBeNull();
    expect(typeof state.calibrationGap).toBe('number');
  });

  it('calibrationGap is null when no claims exist', () => {
    store = createTestGraph();
    const now = Date.now();

    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled retransmission basics',
      timestamp: now,
    });

    const state = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      asOfTimestamp: now,
    });

    expect(state.calibrationGap).toBeNull();
  });
});
