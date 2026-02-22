'use client';

import type { TrustLevel } from '@engine/types';

export interface GraphEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: string;
  fromTrustLevel: TrustLevel;
  toTrustLevel: TrustLevel;
}

function getEdgeStroke(from: TrustLevel, to: TrustLevel): string {
  if (from === 'verified' && to === 'verified') return 'var(--stone)';
  if (from === 'verified' || to === 'verified' || from === 'inferred' || to === 'inferred') {
    return 'var(--stone-dim)';
  }
  return 'var(--stone-faint)';
}

export default function GraphEdge({
  x1,
  y1,
  x2,
  y2,
  type,
  fromTrustLevel,
  toTrustLevel,
}: GraphEdgeProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={getEdgeStroke(fromTrustLevel, toTrustLevel)}
      strokeWidth={type === 'prerequisite' ? 1.5 : 1}
    />
  );
}
