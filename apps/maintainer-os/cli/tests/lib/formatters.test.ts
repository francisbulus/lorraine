import { describe, it, expect } from 'vitest';
import type { TrustState } from '../../src/engine.js';
import {
  groupByLevel,
  formatConfidence,
  formatTimeAgo,
  renderBar,
  renderHeader,
  renderSeparator,
} from '../../src/lib/formatters.js';

function stripAnsi(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function makeTrustState(overrides: Partial<TrustState> & { conceptId: string; level: TrustState['level'] }): TrustState {
  return {
    personId: 'test',
    confidence: 0.8,
    decayedConfidence: 0.75,
    verificationHistory: [],
    claimHistory: [],
    modalitiesTested: [],
    lastVerified: null,
    inferredFrom: [],
    calibrationGap: null,
    ...overrides,
  };
}

describe('groupByLevel', () => {
  it('groups states by trust level', () => {
    const states = [
      makeTrustState({ conceptId: 'a', level: 'verified', confidence: 0.9 }),
      makeTrustState({ conceptId: 'b', level: 'untested', confidence: 0 }),
      makeTrustState({ conceptId: 'c', level: 'inferred', confidence: 0.5 }),
      makeTrustState({ conceptId: 'd', level: 'verified', confidence: 0.7 }),
      makeTrustState({ conceptId: 'e', level: 'contested', confidence: 0.6 }),
    ];
    const groups = groupByLevel(states);
    expect(groups.verified).toHaveLength(2);
    expect(groups.inferred).toHaveLength(1);
    expect(groups.contested).toHaveLength(1);
    expect(groups.untested).toHaveLength(1);
  });

  it('sorts verified by confidence descending', () => {
    const states = [
      makeTrustState({ conceptId: 'low', level: 'verified', confidence: 0.5 }),
      makeTrustState({ conceptId: 'high', level: 'verified', confidence: 0.9 }),
    ];
    const groups = groupByLevel(states);
    expect(groups.verified[0]!.conceptId).toBe('high');
    expect(groups.verified[1]!.conceptId).toBe('low');
  });
});

describe('formatConfidence', () => {
  it('formats to 2 decimal places', () => {
    expect(formatConfidence(0.875)).toBe('0.88');
    expect(formatConfidence(0.1)).toBe('0.10');
    expect(formatConfidence(1)).toBe('1.00');
  });
});

describe('formatTimeAgo', () => {
  it('returns empty string for null', () => {
    expect(formatTimeAgo(null)).toBe('');
  });

  it('returns "today" for recent timestamps', () => {
    expect(formatTimeAgo(Date.now() - 1000)).toBe('today');
  });

  it('returns days ago for older timestamps', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago');
  });

  it('returns weeks ago for 14+ days', () => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    expect(formatTimeAgo(twoWeeksAgo)).toBe('2w ago');
  });

  it('returns weeks ago for 21 days', () => {
    const threeWeeksAgo = Date.now() - 21 * 24 * 60 * 60 * 1000;
    expect(formatTimeAgo(threeWeeksAgo)).toBe('3w ago');
  });
});

describe('renderBar', () => {
  it('renders a bar with filled and empty blocks', () => {
    const bar = renderBar(0.5, 10);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('█████░░░░░');
  });

  it('renders a full bar at 1.0', () => {
    const bar = renderBar(1.0, 10);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('██████████');
  });

  it('renders an empty bar at 0.0', () => {
    const bar = renderBar(0.0, 10);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('░░░░░░░░░░');
  });

  it('clamps values above 1.0', () => {
    const bar = renderBar(1.5, 10);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('██████████');
  });

  it('clamps values below 0.0', () => {
    const bar = renderBar(-0.5, 10);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('░░░░░░░░░░');
  });

  it('respects custom width', () => {
    const bar = renderBar(0.5, 6);
    const stripped = stripAnsi(bar);
    expect(stripped).toBe('███░░░');
  });
});

describe('renderHeader', () => {
  it('renders a header with middle dot separator', () => {
    const header = renderHeader('Label', 'value');
    const stripped = stripAnsi(header);
    expect(stripped).toBe('  Label · value');
  });
});

describe('renderSeparator', () => {
  it('renders a separator line with default width', () => {
    const sep = renderSeparator();
    expect(sep).toBe('  ' + '─'.repeat(50));
  });

  it('renders a separator line with custom width', () => {
    const sep = renderSeparator(10);
    expect(sep).toBe('  ──────────');
  });
});
