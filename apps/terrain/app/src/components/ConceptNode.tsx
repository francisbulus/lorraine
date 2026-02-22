'use client';

import { useState } from 'react';
import type { TrustLevel } from '@engine/types';
import { getNodeSize, getNodeColor } from '../lib/map-layout';

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

      {/* Node circle */}
      <circle
        r={size}
        fill={isFilled ? color : 'none'}
        stroke={color}
        strokeWidth={isFilled ? 0 : 1.5}
        className={isContested ? 'concept-node--contested' : undefined}
      />

      {/* Half-fill for contested */}
      {isContested && (
        <clipPath id={`half-${id}`}>
          <rect x={-size} y={0} width={size * 2} height={size} />
        </clipPath>
      )}
      {isContested && (
        <circle
          r={size}
          fill={color}
          clipPath={`url(#half-${id})`}
          className="concept-node--contested"
        />
      )}

      {/* Tooltip */}
      {hovered && (
        <g>
          <rect
            x={-40}
            y={-size - 24}
            width={80}
            height={18}
            rx={2}
            fill="var(--ground-raised)"
            stroke="var(--stone-faint)"
            strokeWidth={0.5}
          />
          <text
            x={0}
            y={-size - 12}
            textAnchor="middle"
            fill="var(--chalk)"
            fontSize={9}
            fontFamily="var(--font-data)"
          >
            {name.length > 14 ? name.slice(0, 12) + '…' : name}
          </text>
        </g>
      )}
    </g>
  );
}
