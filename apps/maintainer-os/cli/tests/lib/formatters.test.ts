import { describe, it, expect } from 'vitest';
import type { TrustState } from '../../src/engine.js';
import {
  groupByLevel,
  formatConfidence,
  formatTimeAgo,
  renderBar,
  renderHeader,
  renderSeparator,
  computeConceptWidth,
  padName,
  iconForLevelGradient,
  renderFrame,
  renderDoubleFrame,
  renderPositionMarker,
  renderReviewerHeader,
  renderInnerSeparator,
  renderDoubleBand,
  renderCalibrationLine,
  isStale,
  stripAnsi,
  CONCEPT_COL,
} from '../../src/lib/formatters.js';

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

  it('sorts by decayed confidence descending', () => {
    const states = [
      makeTrustState({ conceptId: 'low', level: 'verified', confidence: 0.5, decayedConfidence: 0.45 }),
      makeTrustState({ conceptId: 'high', level: 'verified', confidence: 0.9, decayedConfidence: 0.85 }),
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

describe('computeConceptWidth', () => {
  it('returns CONCEPT_COL for empty list', () => {
    expect(computeConceptWidth([])).toBe(CONCEPT_COL);
  });

  it('returns CONCEPT_COL + 2 when names are shorter', () => {
    expect(computeConceptWidth(['abc', 'def'])).toBe(CONCEPT_COL + 2);
  });

  it('returns longest name + 2 when longer than CONCEPT_COL', () => {
    const longName = 'a'.repeat(CONCEPT_COL + 5);
    expect(computeConceptWidth([longName, 'short'])).toBe(longName.length + 2);
  });
});

describe('padName', () => {
  it('pads name to specified width', () => {
    expect(padName('abc', 10)).toBe('abc       ');
    expect(padName('abc', 10).length).toBe(10);
  });

  it('does not truncate names longer than width', () => {
    expect(padName('abcdef', 3)).toBe('abcdef');
  });
});

describe('iconForLevelGradient', () => {
  it('returns icon character for each level', () => {
    expect(stripAnsi(iconForLevelGradient('verified', 0.8))).toBe('✓');
    expect(stripAnsi(iconForLevelGradient('inferred', 0.5))).toBe('~');
    expect(stripAnsi(iconForLevelGradient('contested', 0.6))).toBe('⚡');
    expect(stripAnsi(iconForLevelGradient('untested', 0))).toBe('·');
  });
});

describe('renderFrame', () => {
  it('creates a box-drawing frame with title and subject', () => {
    const lines = renderFrame('Test', 'subject', ['content']);
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toContain('┌');
    expect(stripped[0]).toContain('Test');
    expect(stripped[0]).toContain('subject');
    expect(stripped[0]).toContain('┐');
    expect(stripped[stripped.length - 1]).toContain('└');
    expect(stripped[stripped.length - 1]).toContain('┘');
  });

  it('includes content lines with frame borders', () => {
    const lines = renderFrame('T', 'S', ['hello', 'world']);
    const stripped = lines.map(stripAnsi);
    const contentLines = stripped.filter((l) => l.includes('│'));
    expect(contentLines.some((l) => l.includes('hello'))).toBe(true);
    expect(contentLines.some((l) => l.includes('world'))).toBe(true);
  });

  it('includes footer in bottom border', () => {
    const lines = renderFrame('T', 'S', ['content'], 'my footer');
    const stripped = lines.map(stripAnsi);
    const bottom = stripped[stripped.length - 1];
    expect(bottom).toContain('my footer');
    expect(bottom).toContain('└');
    expect(bottom).toContain('┘');
  });
});

describe('renderDoubleFrame', () => {
  it('creates a double-line frame', () => {
    const lines = renderDoubleFrame(['blocker content']);
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toContain('╔');
    expect(stripped[0]).toContain('╗');
    expect(stripped[stripped.length - 1]).toContain('╚');
    expect(stripped[stripped.length - 1]).toContain('╝');
  });

  it('includes label in top border', () => {
    const lines = renderDoubleFrame(['content'], 'BLOCKERS');
    const stripped = lines.map(stripAnsi);
    expect(stripped[0]).toContain('BLOCKERS');
  });

  it('uses double-line side borders', () => {
    const lines = renderDoubleFrame(['inner']);
    const stripped = lines.map(stripAnsi);
    const inner = stripped.filter((l) => l.includes('║'));
    expect(inner.length).toBeGreaterThan(0);
    expect(inner.some((l) => l.includes('inner'))).toBe(true);
  });
});

describe('renderPositionMarker', () => {
  it('places a marker at the correct position', () => {
    const result = stripAnsi(renderPositionMarker(0, 10));
    expect(result[0]).toBe('█');
    expect(result.length).toBe(10);
  });

  it('places marker at end for value 1.0', () => {
    const result = stripAnsi(renderPositionMarker(1.0, 10));
    expect(result[9]).toBe('█');
  });

  it('clamps values', () => {
    const result = stripAnsi(renderPositionMarker(1.5, 10));
    expect(result[9]).toBe('█');
  });
});

describe('renderCalibrationLine', () => {
  it('returns axis with claim and evidence markers', () => {
    const lines = renderCalibrationLine(0.3, 0.7, 20);
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('◄');
    expect(lines[0]).toContain('►');
    expect(lines[0]).toContain('C');
    expect(lines[0]).toContain('E');
  });

  it('labels show 0 and 1', () => {
    const lines = renderCalibrationLine(0.5, 0.5, 20);
    expect(lines[1]).toContain('0');
    expect(lines[1]).toContain('1');
  });
});

describe('renderReviewerHeader', () => {
  it('includes rank, name, and coverage', () => {
    const header = stripAnsi(renderReviewerHeader(1, 'bob', '2/2 verified', 50));
    expect(header).toContain('1');
    expect(header).toContain('bob');
    expect(header).toContain('2/2 verified');
    expect(header).toContain('───');
  });
});

describe('renderInnerSeparator', () => {
  it('renders a dim thin line', () => {
    const sep = stripAnsi(renderInnerSeparator(10));
    expect(sep).toBe('─'.repeat(10));
  });
});

describe('renderDoubleBand', () => {
  it('renders a double-line band', () => {
    const band = renderDoubleBand(20);
    expect(band).toBe('═'.repeat(20));
  });
});

describe('isStale', () => {
  it('returns false for null', () => {
    expect(isStale(null)).toBe(false);
  });

  it('returns false for recent timestamps', () => {
    expect(isStale(Date.now() - 1000)).toBe(false);
  });

  it('returns true for timestamps older than 60 days', () => {
    const old = Date.now() - 61 * 24 * 60 * 60 * 1000;
    expect(isStale(old)).toBe(true);
  });
});

describe('stripAnsi', () => {
  it('removes ANSI escape codes', () => {
    expect(stripAnsi('\u001b[32mhello\u001b[39m')).toBe('hello');
  });

  it('preserves plain text', () => {
    expect(stripAnsi('hello world')).toBe('hello world');
  });
});
