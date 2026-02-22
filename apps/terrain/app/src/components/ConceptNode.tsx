'use client';

import { useState } from 'react';
import type { TrustLevel } from '@engine/types';
import { getNodeSize, getNodeColor, getNodeStrokeDash, getLabelColor } from '../lib/map-layout';

export interface ConceptNodeProps {
  id: string;
  name: string;
  x: number;
  y: number;
  trustLevel: TrustLevel;
  isActive?: boolean;
  onClick?: (conceptId: string) => void;
}

export default function ConceptNode({
  id,
  name,
  x,
  y,
  trustLevel,
  isActive = false,
  onClick,
}: ConceptNodeProps) {
  const [hovered, setHovered] = useState(false);
  const size = getNodeSize(trustLevel);
  const color = getNodeColor(trustLevel);
  const isFilled = trustLevel === 'verified';
  const isContested = trustLevel === 'contested';
  const strokeDash = getNodeStrokeDash(trustLevel);
  const labelColor = getLabelColor(trustLevel, hovered);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(id)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${name}: ${trustLevel}`}
    >
      {/* Hover glow ring */}
      {hovered && (
        <circle
          r={size + 6}
          fill="var(--lamp-glow)"
          stroke="var(--lamp-dim)"
          strokeWidth={0.5}
          opacity={0.6}
        />
      )}

      {/* Active lamp ring */}
      {isActive && (
        <circle
          r={size + 4}
          fill="none"
          stroke="var(--lamp)"
          strokeWidth={1.5}
          opacity={0.8}
        />
      )}

      {/* Half-fill clipPath for contested */}
      {isContested && (
        <clipPath id={`half-${id}`}>
          <rect x={-size} y={0} width={size * 2} height={size} />
        </clipPath>
      )}

      {/* Node circle */}
      <circle
        r={size}
        fill={isFilled ? color : 'none'}
        stroke={color}
        strokeWidth={isFilled ? 0 : 1.5}
        strokeDasharray={strokeDash}
        className={isContested ? 'concept-node--contested' : undefined}
      />

      {/* Half-fill for contested */}
      {isContested && (
        <circle
          r={size}
          fill={color}
          clipPath={`url(#half-${id})`}
          className="concept-node--contested"
        />
      )}

      {/* Persistent label below node */}
      <text
        y={size + 12}
        textAnchor="middle"
        fill={labelColor}
        fontSize={9}
        fontFamily="var(--font-data)"
      >
        {name.length > 16 ? name.slice(0, 14) + '…' : name}
      </text>
    </g>
  );
}
