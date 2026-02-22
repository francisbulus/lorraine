// Test: Decay reduces confidence over time following an exponential curve.
// Test: Cross-modality verification decays slower than single-modality.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from './helpers.js';
import { recordVerification } from '../../../engine/trust/record.js';
import { decayTrust, computeDecayedConfidence, computeHalfLife } from '../../../engine/trust/decay.js';
import { getTrustState } from '../../../engine/trust/query.js';
import { BASE_DECAY_HALF_LIFE_DAYS } from '../../../engine/types.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

const MS_PER_DAY = 86_400_000;

afterEach(() => {
  store?.close();
});

describe('trust decay', () => {
  it('reduces confidence over time following an exponential curve', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify a concept.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Derived reliability from first principles',
      timestamp: now,
    });

    const freshState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now,
    });

    // Check at multiple time points — should follow exponential decay.
    const after7days = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 7 * MS_PER_DAY,
    });

    const after30days = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 30 * MS_PER_DAY,
    });

    const after90days = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 90 * MS_PER_DAY,
    });

    // Confidence should decrease monotonically.
    expect(freshState.decayedConfidence).toBeGreaterThan(after7days.decayedConfidence);
    expect(after7days.decayedConfidence).toBeGreaterThan(after30days.decayedConfidence);
    expect(after30days.decayedConfidence).toBeGreaterThan(after90days.decayedConfidence);

    // After one half-life, confidence should be approximately halved.
    const halfLife = computeHalfLife(1, 0);
    const afterHalfLife = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + halfLife * MS_PER_DAY,
    });

    // Allow 5% tolerance for floating point.
    expect(afterHalfLife.decayedConfidence).toBeCloseTo(
      freshState.confidence * 0.5,
      1
    );

    // Should never go below 0.
    const afterYear = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: now + 365 * MS_PER_DAY,
    });
    expect(afterYear.decayedConfidence).toBeGreaterThanOrEqual(0);
  });

  it('decays slower for cross-modality verified concepts', () => {
    store = createTestGraph();
    const now = Date.now();

    // Single modality on concept A.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Transfer question',
      timestamp: now,
    });

    // Multiple modalities on concept B.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
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
      timestamp: now + 1,
    });
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'write:explanation',
      result: 'demonstrated',
      context: 'Written explanation',
      timestamp: now + 2,
    });

    // Check decay after 30 days.
    const futureTimestamp = now + 30 * MS_PER_DAY;

    const aState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      asOfTimestamp: futureTimestamp,
    });

    const bState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      asOfTimestamp: futureTimestamp,
    });

    // B should retain more confidence (slower decay due to cross-modality).
    // We compare the ratio of decayed/original confidence.
    const aRetention = aState.decayedConfidence / aState.confidence;
    const bRetention = bState.decayedConfidence / bState.confidence;

    expect(bRetention).toBeGreaterThan(aRetention);
  });

  it('decayTrust returns all concepts with reduced confidence', () => {
    store = createTestGraph();
    const now = Date.now();

    // Verify two concepts.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Question',
      timestamp: now,
    });
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'Code',
      timestamp: now,
    });

    // Run decay 60 days later.
    const results = decayTrust(store, {
      personId: PERSON_ID,
      asOfTimestamp: now + 60 * MS_PER_DAY,
    });

    // Both should show decay.
    expect(results.length).toBe(2);

    for (const r of results) {
      expect(r.decayedConfidence).toBeLessThan(r.previousConfidence);
      expect(r.daysSinceVerified).toBeCloseTo(60, 0);
    }
  });
});

describe('computeDecayedConfidence (pure function)', () => {
  it('returns original confidence when no time has passed', () => {
    const now = Date.now();
    expect(computeDecayedConfidence(0.8, now, now, 1, 0)).toBe(0.8);
  });

  it('returns 0 for zero confidence', () => {
    expect(computeDecayedConfidence(0, Date.now() - MS_PER_DAY * 30, Date.now(), 1, 0)).toBe(0);
  });

  it('halves confidence at the half-life point', () => {
    const now = Date.now();
    const halfLife = computeHalfLife(1, 0);
    const decayed = computeDecayedConfidence(1.0, now, now + halfLife * MS_PER_DAY, 1, 0);
    expect(decayed).toBeCloseTo(0.5, 2);
  });

  it('structural importance slows decay', () => {
    const now = Date.now();
    const future = now + 30 * MS_PER_DAY;

    const noImportance = computeDecayedConfidence(0.8, now, future, 1, 0);
    const highImportance = computeDecayedConfidence(0.8, now, future, 1, 5);

    expect(highImportance).toBeGreaterThan(noImportance);
  });
});
