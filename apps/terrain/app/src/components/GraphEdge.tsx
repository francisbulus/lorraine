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
  if (from === 'untested' && to === 'untested') return 'var(--stone-faint)';
  if (from === 'verified' && to === 'verified') return 'var(--stone)';
  return 'var(--stone-dim)';
}

function getEdgeWidth(from: TrustLevel, to: TrustLevel, type: string): number {
  let base: number;
  if (from === 'untested' && to === 'untested') {
    base = 0.5;
  } else if (from === 'verified' && to === 'verified') {
    base = 1;
  } else {
    base = 0.75;
  }
  if (type === 'prerequisite') base += 0.25;
  return base;
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
      strokeWidth={getEdgeWidth(fromTrustLevel, toTrustLevel, type)}
    />
  );
}
