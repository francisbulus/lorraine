import { describe, it, expect } from 'vitest';
import type { TrustState } from '@engine/types';
import {
  selectDepth,
  adjustDepth,
  getDepthIndex,
  isDeeper,
} from './depth-ladder';

function makeTrustState(overrides: Partial<TrustState> = {}): TrustState {
  return {
    conceptId: 'test',
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

describe('selectDepth', () => {
  it('returns intuition for untested concept with no prerequisites', () => {
    const concept = makeTrustState({ level: 'untested' });
    expect(selectDepth(concept, [])).toBe('intuition');
  });

  it('returns intuition for untested concept with untested prerequisites', () => {
    const concept = makeTrustState({ level: 'untested' });
    const prereqs = [makeTrustState({ level: 'untested' })];
    expect(selectDepth(concept, prereqs)).toBe('intuition');
  });

  it('returns abstraction when prerequisites are verified but concept is untested', () => {
    const concept = makeTrustState({ level: 'untested' });
    const prereqs = [makeTrustState({ level: 'verified' })];
    expect(selectDepth(concept, prereqs)).toBe('abstraction');
  });

  it('returns mechanism when prerequisites are verified and concept is inferred', () => {
    const concept = makeTrustState({ level: 'inferred' });
    const prereqs = [makeTrustState({ level: 'verified' })];
    expect(selectDepth(concept, prereqs)).toBe('mechanism');
  });

  it('returns implementation when concept itself is verified', () => {
    const concept = makeTrustState({ level: 'verified' });
    expect(selectDepth(concept, [])).toBe('implementation');
  });

  it('returns mechanism for contested concept', () => {
    const concept = makeTrustState({ level: 'contested' });
    expect(selectDepth(concept, [])).toBe('mechanism');
  });

  it('treats inferred prerequisites as solid', () => {
    const concept = makeTrustState({ level: 'untested' });
    const prereqs = [makeTrustState({ level: 'inferred' })];
    expect(selectDepth(concept, prereqs)).toBe('abstraction');
  });
});

describe('adjustDepth', () => {
  it('goes simpler from mechanism to abstraction', () => {
    expect(adjustDepth('mechanism', 'simpler')).toBe('abstraction');
  });

  it('goes deeper from abstraction to mechanism', () => {
    expect(adjustDepth('abstraction', 'deeper')).toBe('mechanism');
  });

  it('stays at intuition when going simpler', () => {
    expect(adjustDepth('intuition', 'simpler')).toBe('intuition');
  });

  it('stays at implementation when going deeper', () => {
    expect(adjustDepth('implementation', 'deeper')).toBe('implementation');
  });
});

describe('getDepthIndex', () => {
  it('returns correct indices', () => {
    expect(getDepthIndex('intuition')).toBe(0);
    expect(getDepthIndex('abstraction')).toBe(1);
    expect(getDepthIndex('mechanism')).toBe(2);
    expect(getDepthIndex('implementation')).toBe(3);
  });
});

describe('isDeeper', () => {
  it('mechanism is deeper than intuition', () => {
    expect(isDeeper('mechanism', 'intuition')).toBe(true);
  });

  it('intuition is not deeper than mechanism', () => {
    expect(isDeeper('intuition', 'mechanism')).toBe(false);
  });

  it('same level is not deeper', () => {
    expect(isDeeper('abstraction', 'abstraction')).toBe(false);
  });
});
