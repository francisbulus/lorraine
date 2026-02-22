import { describe, it, expect } from 'vitest';
import { computeLayout, getNodeSize, getNodeColor } from './map-layout';

describe('computeLayout', () => {
  it('returns empty layout for no concepts', () => {
    const result = computeLayout({ concepts: [], edges: [] });
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('positions a single concept', () => {
    const result = computeLayout({
      concepts: [{ id: 'a', name: 'A', trustLevel: 'untested' }],
      edges: [],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('a');
    expect(typeof result.nodes[0].x).toBe('number');
    expect(typeof result.nodes[0].y).toBe('number');
  });

  it('positions multiple concepts with positive coordinates', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'verified' },
        { id: 'b', name: 'B', trustLevel: 'untested' },
        { id: 'c', name: 'C', trustLevel: 'inferred' },
      ],
      edges: [
        { from: 'a', to: 'b', type: 'prerequisite' },
        { from: 'a', to: 'c', type: 'related_to' },
      ],
    });
    expect(result.nodes).toHaveLength(3);
    for (const node of result.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces edges matching input', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'verified' },
        { id: 'b', name: 'B', trustLevel: 'verified' },
      ],
      edges: [{ from: 'a', to: 'b', type: 'prerequisite' }],
    });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].from).toBe('a');
    expect(result.edges[0].to).toBe('b');
    expect(result.edges[0].fromVerified).toBe(true);
    expect(result.edges[0].toVerified).toBe(true);
  });

  it('filters edges with unknown nodes', () => {
    const result = computeLayout({
      concepts: [{ id: 'a', name: 'A', trustLevel: 'untested' }],
      edges: [{ from: 'a', to: 'missing', type: 'prerequisite' }],
    });
    expect(result.edges).toHaveLength(0);
  });

  it('preserves territory assignments', () => {
    const result = computeLayout({
      concepts: [{ id: 'a', name: 'A', trustLevel: 'untested', territory: 'tcp' }],
      edges: [],
    });
    expect(result.nodes[0].territory).toBe('tcp');
  });

  it('produces positive width and height', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'untested' },
        { id: 'b', name: 'B', trustLevel: 'untested' },
      ],
      edges: [],
    });
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('connected nodes are closer than unconnected', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'untested' },
        { id: 'b', name: 'B', trustLevel: 'untested' },
        { id: 'c', name: 'C', trustLevel: 'untested' },
      ],
      edges: [{ from: 'a', to: 'b', type: 'prerequisite' }],
    });
    const a = result.nodes.find((n) => n.id === 'a')!;
    const b = result.nodes.find((n) => n.id === 'b')!;
    const c = result.nodes.find((n) => n.id === 'c')!;
    const distAB = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    const distAC = Math.sqrt((a.x - c.x) ** 2 + (a.y - c.y) ** 2);
    expect(distAB).toBeLessThan(distAC);
  });
});

describe('getNodeSize', () => {
  it('verified is largest', () => {
    expect(getNodeSize('verified')).toBeGreaterThan(getNodeSize('untested'));
  });

  it('inferred is smaller than verified', () => {
    expect(getNodeSize('inferred')).toBeLessThan(getNodeSize('verified'));
  });

  it('untested is smallest', () => {
    expect(getNodeSize('untested')).toBeLessThanOrEqual(getNodeSize('inferred'));
  });
});

describe('getNodeColor', () => {
  it('returns correct CSS variables', () => {
    expect(getNodeColor('verified')).toBe('var(--verified)');
    expect(getNodeColor('contested')).toBe('var(--contested)');
    expect(getNodeColor('inferred')).toBe('var(--inferred)');
    expect(getNodeColor('untested')).toBe('var(--fog)');
  });
});
