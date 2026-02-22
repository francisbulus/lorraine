import type { TrustLevel } from '@engine/types';

export interface LayoutNode {
  id: string;
  name: string;
  x: number;
  y: number;
  trustLevel: TrustLevel;
  territory?: string;
}

export interface LayoutEdge {
  from: string;
  to: string;
  type: string;
  fromTrustLevel: TrustLevel;
  toTrustLevel: TrustLevel;
}

export interface TerritoryZone {
  id: string;
  name: string;
  centroidX: number;
  centroidY: number;
  radiusX: number;
  radiusY: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export interface LayoutInput {
  concepts: { id: string; name: string; trustLevel: TrustLevel; territory?: string }[];
  edges: { from: string; to: string; type: string }[];
}

// Simple force-directed layout.
// Not physics-accurate but stable and deterministic enough for a map panel.
const REPULSION = 2000;
const ATTRACTION = 0.05;
const DAMPING = 0.9;
const ITERATIONS = 80;
const MIN_DISTANCE = 40;

export function computeLayout(input: LayoutInput): LayoutResult {
  const { concepts, edges } = input;
  if (concepts.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Initialize positions in a circle.
  const radius = Math.max(80, concepts.length * 20);
  const nodes: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    trustLevel: TrustLevel;
    territory?: string;
  }> = concepts.map((c, i) => {
    const angle = (2 * Math.PI * i) / concepts.length;
    return {
      id: c.id,
      name: c.name,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      trustLevel: c.trustLevel,
      territory: c.territory,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Run simulation.
  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE);
        const force = REPULSION / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
    }

    // Attraction along edges.
    for (const edge of edges) {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const fx = dx * ATTRACTION;
      const fy = dy * ATTRACTION;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Apply velocity with damping.
    for (const node of nodes) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  // Normalize to positive coordinates with padding.
  const padding = 60;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }

  const layoutNodes: LayoutNode[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    x: n.x - minX + padding,
    y: n.y - minY + padding,
    trustLevel: n.trustLevel,
    territory: n.territory,
  }));

  const layoutEdges: LayoutEdge[] = edges
    .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
    .map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type,
      fromTrustLevel: nodeMap.get(e.from)!.trustLevel,
      toTrustLevel: nodeMap.get(e.to)!.trustLevel,
    }));

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function getNodeSize(trustLevel: TrustLevel): number {
  switch (trustLevel) {
    case 'verified': return 8;
    case 'contested': return 6;
    case 'inferred': return 6;
    case 'untested': return 4;
    default: return 4;
  }
}

export function getNodeColor(trustLevel: TrustLevel): string {
  switch (trustLevel) {
    case 'verified': return 'var(--verified)';
    case 'contested': return 'var(--contested)';
    case 'inferred': return 'var(--inferred)';
    case 'untested': return 'var(--fog)';
    default: return 'var(--stone)';
  }
}

export function getNodeStrokeDash(trustLevel: TrustLevel): string | undefined {
  if (trustLevel === 'untested') return '2 2';
  return undefined;
}

export function getLabelColor(trustLevel: TrustLevel, hovered: boolean): string {
  if (hovered) return 'var(--chalk)';
  switch (trustLevel) {
    case 'verified': return 'var(--chalk-dim)';
    case 'contested': return 'var(--chalk-faint)';
    case 'inferred': return 'var(--chalk-faint)';
    case 'untested': return 'var(--stone-dim)';
    default: return 'var(--stone-dim)';
  }
}

export function computeTerritoryZones(
  nodes: LayoutNode[],
  territories: { id: string; name: string; conceptIds: string[] }[]
): TerritoryZone[] {
  return territories
    .map((t) => {
      const tNodes = nodes.filter((n) => t.conceptIds.includes(n.id));
      if (tNodes.length === 0) return null;

      const cx = tNodes.reduce((s, n) => s + n.x, 0) / tNodes.length;
      const cy = tNodes.reduce((s, n) => s + n.y, 0) / tNodes.length;

      let maxDx = 0;
      let maxDy = 0;
      for (const n of tNodes) {
        maxDx = Math.max(maxDx, Math.abs(n.x - cx));
        maxDy = Math.max(maxDy, Math.abs(n.y - cy));
      }

      return {
        id: t.id,
        name: t.name,
        centroidX: cx,
        centroidY: cy,
        radiusX: Math.max(maxDx + 40, 50),
        radiusY: Math.max(maxDy + 40, 50),
      };
    })
    .filter((z): z is TerritoryZone => z !== null);
}
