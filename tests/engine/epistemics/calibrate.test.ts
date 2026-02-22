// Test: calibrate audits model quality and self-calibration quality.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from '../trust/helpers.js';
import { calibrate } from '../../../engine/epistemics/calibrate.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { recordClaim } from '../../../engine/trust/claim.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

const MS_PER_DAY = 86_400_000;

afterEach(() => {
  store?.close();
});

describe('calibrate', () => {
  it('returns zeroed result with recommendation when no data exists', () => {
    store = createTestGraph();

    const result = calibrate(store, { personId: PERSON_ID });

    expect(result.predictionAccuracy).toBe(0);
    expect(result.overconfidenceBias).toBe(0);
    expect(result.underconfidenceBias).toBe(0);
    expect(result.stalePercentage).toBe(0);
    expect(result.surpriseRate).toBe(0);
    expect(result.claimCalibration).toBe(0);
    expect(result.recommendation).toContain('No trust data');
  });

  it('returns all expected fields in the result', () => {
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

    const result = calibrate(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    expect(typeof result.predictionAccuracy).toBe('number');
    expect(typeof result.overconfidenceBias).toBe('number');
    expect(typeof result.underconfidenceBias).toBe('number');
    expect(typeof result.stalePercentage).toBe('number');
    expect(typeof result.surpriseRate).toBe('number');
    expect(typeof result.claimCalibration).toBe('number');
    expect(typeof result.recommendation).toBe('string');
  });

  it('detects stale concepts', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify a concept long ago.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recall',
      timestamp: now - 90 * MS_PER_DAY,
    });

    const result = calibrate(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    expect(result.stalePercentage).toBeGreaterThan(0);
  });

  it('computes claimCalibration from claim-evidence gap', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify and then claim accurately.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Transfer question',
      timestamp: now,
    });

    // Claim confidence very close to evidence.
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      selfReportedConfidence: 0.7, // grill:transfer strength is 0.7
      context: 'self-assessment',
      timestamp: now,
    });

    const result = calibrate(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    // Should show good calibration (close to 1.0).
    expect(result.claimCalibration).toBeGreaterThan(0.5);
  });

  it('detects poor claim calibration on overclaiming', () => {
    store = createTestGraph();
    const now = Date.now();

    // No verification, but a high claim.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recall',
      timestamp: now,
    });

    // Claim much higher than evidence.
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      selfReportedConfidence: 1.0, // grill:recall strength is only 0.3
      context: 'overconfident claim',
      timestamp: now,
    });

    const result = calibrate(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    // Should show poor calibration.
    expect(result.claimCalibration).toBeLessThan(0.8);
  });

  it('generates meaningful recommendation string', () => {
    store = createTestGraph();
    const now = Date.now();

    // Create a stale model.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Old verification',
      timestamp: now - 120 * MS_PER_DAY,
    });

    const result = calibrate(store, {
      personId: PERSON_ID,
      asOfTimestamp: now,
    });

    expect(result.recommendation.length).toBeGreaterThan(0);
  });
});
