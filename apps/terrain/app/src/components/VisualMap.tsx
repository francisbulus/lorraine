'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { TrustLevel } from '@engine/types';
import { computeLayout, computeTerritoryZones, computeZoneOpacity, computeZoneLabelColor, type LayoutNode } from '../lib/map-layout';
import ConceptNode from './ConceptNode';
import GraphEdge from './GraphEdge';

export interface VisualMapConcept {
  id: string;
  name: string;
  trustLevel: TrustLevel;
  territory?: string;
  decayedConfidence?: number;
}

export interface VisualMapEdge {
  from: string;
  to: string;
  type: string;
}

export interface VisualMapTerritory {
  id: string;
  name: string;
  conceptIds: string[];
}

export interface VisualMapProps {
  concepts: VisualMapConcept[];
  edges: VisualMapEdge[];
  territories?: VisualMapTerritory[];
  activeConcept?: string | null;
  goalConcept?: string | null;
  onConceptClick?: (conceptId: string) => void;
}

export default function VisualMap({
  concepts,
  edges,
  territories = [],
  activeConcept,
  goalConcept,
  onConceptClick,
}: VisualMapProps) {
  const layout = useMemo(
    () => computeLayout({ concepts, edges }),
    [concepts, edges]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    for (const node of layout.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [layout.nodes]);

  // Build a map of decayedConfidence from concepts prop.
  const decayedConfidenceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of concepts) {
      if (c.decayedConfidence !== undefined) {
        map.set(c.id, c.decayedConfidence);
      }
    }
    return map;
  }, [concepts]);

  const zones = useMemo(
    () => computeTerritoryZones(layout.nodes, territories),
    [layout.nodes, territories]
  );

  // Compute ownership percentage per territory.
  const zoneOwnership = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of territories) {
      const conceptsInTerritory = concepts.filter((c) => t.conceptIds.includes(c.id));
      if (conceptsInTerritory.length === 0) {
        map.set(t.id, 0);
        continue;
      }
      const verified = conceptsInTerritory.filter((c) => c.trustLevel === 'verified' || c.trustLevel === 'inferred').length;
      map.set(t.id, (verified / conceptsInTerritory.length) * 100);
    }
    return map;
  }, [concepts, territories]);

  // Pan and zoom state.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const velocity = useRef({ vx: 0, vy: 0 });
  const lastMove = useRef({ x: 0, y: 0, time: 0 });
  const animFrame = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    velocity.current = { vx: 0, vy: 0 };
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    lastMove.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: dragStart.current.ox + dx,
      y: dragStart.current.oy + dy,
    });
    const now = performance.now();
    const dt = now - lastMove.current.time;
    if (dt > 0) {
      velocity.current = {
        vx: ((e.clientX - lastMove.current.x) / dt) * 16,
        vy: ((e.clientY - lastMove.current.y) / dt) * 16,
      };
    }
    lastMove.current = { x: e.clientX, y: e.clientY, time: now };
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    const animate = () => {
      const { vx, vy } = velocity.current;
      if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return;
      velocity.current = { vx: vx * 0.92, vy: vy * 0.92 };
      setOffset((prev) => ({
        x: prev.x + velocity.current.vx,
        y: prev.y + velocity.current.vy,
      }));
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.3, s * delta)));
  }, []);

  // Goal path.
  const goalPath = useMemo(() => {
    if (!activeConcept || !goalConcept) return null;
    const activeNode = nodeMap.get(activeConcept);
    const goalNode = nodeMap.get(goalConcept);
    if (!activeNode || !goalNode) return null;
    return { x1: activeNode.x, y1: activeNode.y, x2: goalNode.x, y2: goalNode.y };
  }, [activeConcept, goalConcept, nodeMap]);

  if (concepts.length === 0) {
    return (
      <div className="visual-map__empty font-data">
        No concepts loaded yet.
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="visual-map"
      width="100%"
      height="100%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      role="img"
      aria-label="Concept map"
    >
      <defs>
        <filter id="zone-blur">
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>

      <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
        {/* Territory zones — watercolor wash behind clusters */}
        {zones.map((zone) => {
          const ownership = zoneOwnership.get(zone.id) ?? 0;
          return (
            <g key={`zone-${zone.id}`}>
              <ellipse
                cx={zone.centroidX}
                cy={zone.centroidY}
                rx={zone.radiusX}
                ry={zone.radiusY}
                fill="var(--ground-soft)"
                opacity={computeZoneOpacity(ownership)}
                filter="url(#zone-blur)"
              />
              <text
                x={zone.centroidX}
                y={zone.centroidY - zone.radiusY + 14}
                textAnchor="middle"
                fill={computeZoneLabelColor(ownership)}
                fontSize={11}
                fontFamily="var(--font-voice)"
              >
                {zone.name}
              </text>
            </g>
          );
        })}

        {/* Goal path */}
        {goalPath && (
          <line
            x1={goalPath.x1}
            y1={goalPath.y1}
            x2={goalPath.x2}
            y2={goalPath.y2}
            stroke="var(--chalk-faint)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {/* Edges */}
        {layout.edges.map((edge, i) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;
          return (
            <GraphEdge
              key={`edge-${i}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              type={edge.type}
              fromTrustLevel={edge.fromTrustLevel}
              toTrustLevel={edge.toTrustLevel}
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => (
          <ConceptNode
            key={node.id}
            id={node.id}
            name={node.name}
            x={node.x}
            y={node.y}
            trustLevel={node.trustLevel}
            decayedConfidence={decayedConfidenceMap.get(node.id)}
            isActive={node.id === activeConcept}
            onClick={onConceptClick}
          />
        ))}
      </g>
    </svg>
  );
}
