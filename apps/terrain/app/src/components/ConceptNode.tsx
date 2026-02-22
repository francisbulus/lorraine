'use client';

import { useState, useRef, useEffect } from 'react';
import type { TrustLevel } from '@engine/types';
import {
  deriveVisualTrustState,
  getNodeSize,
  getNodeColor,
  getNodeStrokeDash,
  getNodeStrokeWidth,
  getNodeFill,
  getNodeFillOpacity,
  getLabelColor,
  getLabelFont,
  getLabelSize,
} from '../lib/map-layout';

export interface ConceptNodeProps {
  id: string;
  name: string;
  x: number;
  y: number;
  trustLevel: TrustLevel;
  decayedConfidence?: number;
  isActive?: boolean;
  onClick?: (conceptId: string) => void;
}

export default function ConceptNode({
  id,
  name,
  x,
  y,
  trustLevel,
  decayedConfidence,
  isActive = false,
  onClick,
}: ConceptNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const prevTrustLevel = useRef(trustLevel);

  useEffect(() => {
    if (prevTrustLevel.current !== trustLevel) {
      prevTrustLevel.current = trustLevel;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 400);
      return () => clearTimeout(timer);
    }
  }, [trustLevel]);

  const visualState = deriveVisualTrustState(trustLevel, decayedConfidence);
  const size = getNodeSize(visualState);
  const color = getNodeColor(visualState);
  const fill = getNodeFill(visualState);
  const fillOpacity = getNodeFillOpacity(visualState);
  const strokeDash = getNodeStrokeDash(visualState);
  const strokeWidth = getNodeStrokeWidth(visualState);
  const labelColor = getLabelColor(visualState, hovered);
  const labelFont = getLabelFont(visualState);
  const labelSize = getLabelSize(visualState);
  const isContested = visualState === 'contested';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(id)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${name}: ${trustLevel}`}
      className={flashing ? 'trust-change-flash' : undefined}
    >
      {/* Trust change flash glow */}
      {flashing && (
        <circle
          r={size + 8}
          fill="var(--lamp-glow)"
          opacity={0.8}
          className="trust-change-flash__glow"
        />
      )}

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
        fill={isContested ? 'none' : fill}
        fillOpacity={isContested ? undefined : fillOpacity}
        stroke={color}
        strokeWidth={fill === 'none' || isContested ? strokeWidth : 0}
        strokeDasharray={strokeDash}
        className={isContested ? 'concept-node--contested' : undefined}
        style={{
          transition: 'fill 300ms var(--ease-settle), stroke 300ms var(--ease-settle), r 300ms var(--ease-settle)',
        }}
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
        fontSize={labelSize}
        fontFamily={labelFont}
      >
        {name.length > 16 ? name.slice(0, 14) + '…' : name}
      </text>
    </g>
  );
}
