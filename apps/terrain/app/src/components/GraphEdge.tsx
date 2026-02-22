'use client';

export interface GraphEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bothVerified: boolean;
}

export default function GraphEdge({
  x1,
  y1,
  x2,
  y2,
  bothVerified,
}: GraphEdgeProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={bothVerified ? 'var(--stone)' : 'var(--stone-faint)'}
      strokeWidth={1}
    />
  );
}
