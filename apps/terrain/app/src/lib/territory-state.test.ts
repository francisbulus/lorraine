import { describe, it, expect } from 'vitest';
import type { TrustState } from '@engine/types';
import type { Territory, Threshold } from './domain-loader';
import {
  computeTerritoryState,
  computeThresholdReadiness,
  buildTrustStateMap,
} from './territory-state';

function makeTrustState(conceptId: string, overrides: Partial<TrustState> = {}): TrustState {
  return {
    conceptId,
    personId: 'test',
    level: 'untested',
    confidence: 0,
    verificationHistory: [],
    claimHistory: [],
    modalitiesTested: [],
    lastVerified: null,
    inferredFrom: [],
    decayedConfidence: 0,
    calibrationGap: null,
    ...overrides,
  };
}

const TERRITORY: Territory = {
  id: 'tcp-reliability',
  name: 'TCP Reliability',
  conceptIds: ['tcp-basics', 'tcp-handshake', 'tcp-ack', 'tcp-retransmission'],
};

describe('computeTerritoryState', () => {
  it('returns all untested when no trust data', () => {
    const map = new Map<string, TrustState>();
    const state = computeTerritoryState(TERRITORY, map);

    expect(state.totalConcepts).toBe(4);
    expect(state.untestedCount).toBe(4);
    expect(state.verifiedCount).toBe(0);
    expect(state.verifiedPercent).toBe(0);
    expect(state.progressPercent).toBe(0);
  });

  it('counts verified concepts correctly', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'verified', decayedConfidence: 0.8 }),
      makeTrustState('tcp-handshake', { level: 'verified', decayedConfidence: 0.7 }),
    ]);

    const state = computeTerritoryState(TERRITORY, map);
    expect(state.verifiedCount).toBe(2);
    expect(state.untestedCount).toBe(2);
    expect(state.verifiedPercent).toBe(50);
  });

  it('counts inferred concepts with half credit in progress', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'verified', decayedConfidence: 0.8 }),
      makeTrustState('tcp-handshake', { level: 'inferred', decayedConfidence: 0.5 }),
    ]);

    const state = computeTerritoryState(TERRITORY, map);
    expect(state.verifiedCount).toBe(1);
    expect(state.inferredCount).toBe(1);
    // Progress: 1 verified (1.0) + 1 inferred (0.5) = 1.5 / 4 = 37.5%
    expect(state.progressPercent).toBe(37.5);
  });

  it('tracks contested concepts by name', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'contested', decayedConfidence: 0.3 }),
      makeTrustState('tcp-ack', { level: 'contested', decayedConfidence: 0.2 }),
    ]);

    const state = computeTerritoryState(TERRITORY, map);
    expect(state.contestedCount).toBe(2);
    expect(state.contestedConcepts).toEqual(['tcp-basics', 'tcp-ack']);
  });

  it('computes 100% when all verified', () => {
    const map = buildTrustStateMap(
      TERRITORY.conceptIds.map((cid) =>
        makeTrustState(cid, { level: 'verified', decayedConfidence: 0.9 })
      )
    );

    const state = computeTerritoryState(TERRITORY, map);
    expect(state.verifiedPercent).toBe(100);
    expect(state.progressPercent).toBe(100);
    expect(state.untestedCount).toBe(0);
  });

  it('includes concept-level breakdown', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'verified', decayedConfidence: 0.8 }),
    ]);

    const state = computeTerritoryState(TERRITORY, map);
    expect(state.concepts).toHaveLength(4);
    expect(state.concepts[0]).toEqual({
      conceptId: 'tcp-basics',
      level: 'verified',
      decayedConfidence: 0.8,
    });
    expect(state.concepts[1].level).toBe('untested');
  });
});

describe('computeThresholdReadiness', () => {
  const THRESHOLD: Threshold = {
    id: 'tcp-to-advanced',
    from: 'tcp-reliability',
    to: 'tcp-advanced',
    readinessCriteria: {
      conceptIds: ['tcp-basics', 'tcp-handshake', 'tcp-ack'],
      minimumLevel: 'verified',
    },
  };

  it('returns all missing when no trust data', () => {
    const map = new Map<string, TrustState>();
    const readiness = computeThresholdReadiness(THRESHOLD, map);

    expect(readiness.isReady).toBe(false);
    expect(readiness.ready).toHaveLength(0);
    expect(readiness.missing).toHaveLength(3);
    expect(readiness.totalRequired).toBe(3);
  });

  it('tracks ready and missing separately', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'verified' }),
      makeTrustState('tcp-handshake', { level: 'verified' }),
    ]);

    const readiness = computeThresholdReadiness(THRESHOLD, map);
    expect(readiness.isReady).toBe(false);
    expect(readiness.ready).toEqual(['tcp-basics', 'tcp-handshake']);
    expect(readiness.missing).toEqual(['tcp-ack']);
  });

  it('returns ready when all criteria met', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'verified' }),
      makeTrustState('tcp-handshake', { level: 'verified' }),
      makeTrustState('tcp-ack', { level: 'verified' }),
    ]);

    const readiness = computeThresholdReadiness(THRESHOLD, map);
    expect(readiness.isReady).toBe(true);
    expect(readiness.missing).toHaveLength(0);
  });

  it('inferred does not satisfy verified minimum', () => {
    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'inferred' }),
      makeTrustState('tcp-handshake', { level: 'verified' }),
      makeTrustState('tcp-ack', { level: 'verified' }),
    ]);

    const readiness = computeThresholdReadiness(THRESHOLD, map);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missing).toContain('tcp-basics');
  });

  it('inferred satisfies inferred minimum level', () => {
    const threshold: Threshold = {
      id: 'test',
      from: 'a',
      to: 'b',
      readinessCriteria: {
        conceptIds: ['tcp-basics'],
        minimumLevel: 'inferred',
      },
    };

    const map = buildTrustStateMap([
      makeTrustState('tcp-basics', { level: 'inferred' }),
    ]);

    const readiness = computeThresholdReadiness(threshold, map);
    expect(readiness.isReady).toBe(true);
  });
});

describe('buildTrustStateMap', () => {
  it('builds a map keyed by conceptId', () => {
    const states = [
      makeTrustState('a', { level: 'verified' }),
      makeTrustState('b', { level: 'untested' }),
    ];

    const map = buildTrustStateMap(states);
    expect(map.size).toBe(2);
    expect(map.get('a')!.level).toBe('verified');
    expect(map.get('b')!.level).toBe('untested');
  });
});
