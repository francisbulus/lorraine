// Test: getGraph returns concept graph with optional trust overlay and depth expansion.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from '../trust/helpers.js';
import { getGraph } from '../../../engine/graph/query.js';
import { recordVerification } from '../../../engine/trust/record.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('getGraph', () => {
  it('returns all concepts and edges when no filter is specified', () => {
    store = createTestGraph();

    const result = getGraph(store, {});

    expect(result.concepts).toHaveLength(5);
    expect(result.edges).toHaveLength(4);
  });

  it('filters to specified conceptIds', () => {
    store = createTestGraph();

    const result = getGraph(store, {
      conceptIds: [CONCEPTS.A.id, CONCEPTS.B.id],
    });

    expect(result.concepts).toHaveLength(2);
    const ids = result.concepts.map(c => c.id);
    expect(ids).toContain(CONCEPTS.A.id);
    expect(ids).toContain(CONCEPTS.B.id);

    // Should include the edge between A and B.
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
    expect(result.edges.some(e => e.from === CONCEPTS.A.id && e.to === CONCEPTS.B.id)).toBe(true);
  });

  it('expands concepts via depth parameter', () => {
    store = createTestGraph();

    // Start from A, expand by 1 hop — should get B too.
    const result = getGraph(store, {
      conceptIds: [CONCEPTS.A.id],
      depth: 1,
    });

    const ids = result.concepts.map(c => c.id);
    expect(ids).toContain(CONCEPTS.A.id);
    expect(ids).toContain(CONCEPTS.B.id);
    expect(result.concepts.length).toBe(2);
  });

  it('includes trust state overlay when personId is provided', () => {
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

    const result = getGraph(store, {
      conceptIds: [CONCEPTS.A.id],
      personId: PERSON_ID,
    });

    expect(result.concepts).toHaveLength(1);
    const concept = result.concepts[0]!;
    expect(concept.trustState).toBeDefined();
    expect(concept.trustState!.level).toBe('verified');
    expect(concept.trustState!.confidence).toBeGreaterThan(0);
  });

  it('does not include trustState when personId is omitted', () => {
    store = createTestGraph();

    const result = getGraph(store, {
      conceptIds: [CONCEPTS.A.id],
    });

    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0]!.trustState).toBeUndefined();
  });
});
