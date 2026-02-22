import { describe, it, expect } from 'vitest';
import {
  computeLayout,
  getNodeSize,
  getNodeColor,
  getNodeStrokeDash,
  getLabelColor,
  computeTerritoryZones,
} from './map-layout';

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

  it('produces edges with trust levels', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'verified' },
        { id: 'b', name: 'B', trustLevel: 'inferred' },
      ],
      edges: [{ from: 'a', to: 'b', type: 'prerequisite' }],
    });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].from).toBe('a');
    expect(result.edges[0].to).toBe('b');
    expect(result.edges[0].fromTrustLevel).toBe('verified');
    expect(result.edges[0].toTrustLevel).toBe('inferred');
  });

  it('preserves edge type', () => {
    const result = computeLayout({
      concepts: [
        { id: 'a', name: 'A', trustLevel: 'untested' },
        { id: 'b', name: 'B', trustLevel: 'untested' },
      ],
      edges: [{ from: 'a', to: 'b', type: 'prerequisite' }],
    });
    expect(result.edges[0].type).toBe('prerequisite');
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

describe('getNodeStrokeDash', () => {
  it('returns dash pattern for untested', () => {
    expect(getNodeStrokeDash('untested')).toBe('2 2');
  });

  it('returns undefined for verified', () => {
    expect(getNodeStrokeDash('verified')).toBeUndefined();
  });

  it('returns undefined for inferred', () => {
    expect(getNodeStrokeDash('inferred')).toBeUndefined();
  });

  it('returns undefined for contested', () => {
    expect(getNodeStrokeDash('contested')).toBeUndefined();
  });
});

describe('getLabelColor', () => {
  it('returns --chalk when hovered', () => {
    expect(getLabelColor('untested', true)).toBe('var(--chalk)');
    expect(getLabelColor('verified', true)).toBe('var(--chalk)');
  });

  it('returns --chalk-dim for verified', () => {
    expect(getLabelColor('verified', false)).toBe('var(--chalk-dim)');
  });

  it('returns --chalk-faint for inferred and contested', () => {
    expect(getLabelColor('inferred', false)).toBe('var(--chalk-faint)');
    expect(getLabelColor('contested', false)).toBe('var(--chalk-faint)');
  });

  it('returns --stone-dim for untested', () => {
    expect(getLabelColor('untested', false)).toBe('var(--stone-dim)');
  });
});

describe('computeTerritoryZones', () => {
  const nodes = [
    { id: 'a', name: 'A', x: 100, y: 100, trustLevel: 'verified' as const },
    { id: 'b', name: 'B', x: 200, y: 100, trustLevel: 'inferred' as const },
    { id: 'c', name: 'C', x: 300, y: 300, trustLevel: 'untested' as const },
  ];

  it('computes zones for territories with matching nodes', () => {
    const zones = computeTerritoryZones(nodes, [
      { id: 't1', name: 'Zone 1', conceptIds: ['a', 'b'] },
    ]);
    expect(zones).toHaveLength(1);
    expect(zones[0].name).toBe('Zone 1');
    expect(zones[0].centroidX).toBe(150);
    expect(zones[0].centroidY).toBe(100);
  });

  it('skips territories with no matching nodes', () => {
    const zones = computeTerritoryZones(nodes, [
      { id: 't1', name: 'Zone 1', conceptIds: ['missing'] },
    ]);
    expect(zones).toHaveLength(0);
  });

  it('computes radii with minimum size', () => {
    const zones = computeTerritoryZones(
      [{ id: 'a', name: 'A', x: 100, y: 100, trustLevel: 'verified' as const }],
      [{ id: 't1', name: 'Solo', conceptIds: ['a'] }]
    );
    expect(zones[0].radiusX).toBeGreaterThanOrEqual(50);
    expect(zones[0].radiusY).toBeGreaterThanOrEqual(50);
  });

  it('computes radii covering all nodes', () => {
    const zones = computeTerritoryZones(nodes, [
      { id: 't1', name: 'All', conceptIds: ['a', 'b', 'c'] },
    ]);
    // centroid is at (200, ~167), max spread > 50 in each axis
    expect(zones[0].radiusX).toBeGreaterThan(50);
    expect(zones[0].radiusY).toBeGreaterThan(50);
  });
});
