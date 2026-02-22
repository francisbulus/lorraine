'use client';

import type { TrustLevel } from '@engine/types';

export type GlyphLevel = TrustLevel | 'decayed';

const GLYPH_MAP: Record<GlyphLevel, string> = {
  verified: '●',
  contested: '◐',
  inferred: '○',
  untested: '◌',
  decayed: '◦',
};

const COLOR_MAP: Record<GlyphLevel, string> = {
  verified: 'var(--trust-verified)',
  contested: 'var(--trust-contested)',
  inferred: 'var(--trust-inferred)',
  untested: 'var(--trust-untested)',
  decayed: 'var(--trust-decayed)',
};

export interface TrustGlyphProps {
  level: GlyphLevel;
  label?: string;
}

export default function TrustGlyph({ level, label }: TrustGlyphProps) {
  const glyph = GLYPH_MAP[level];
  const color = COLOR_MAP[level];

  return (
    <span
      className="trust-glyph"
      style={{ color }}
      title={label ?? level}
      aria-label={label ?? level}
    >
      {glyph}
    </span>
  );
}
