import type { TrustState, TrustLevel } from '@engine/types';

export type DepthLevel = 'intuition' | 'abstraction' | 'mechanism' | 'implementation';

const DEPTH_ORDER: DepthLevel[] = ['intuition', 'abstraction', 'mechanism', 'implementation'];

export const DEPTH_DESCRIPTIONS: Record<DepthLevel, string> = {
  intuition: 'Big-picture analogy. No jargon. "It works like..."',
  abstraction: 'Conceptual model. Key properties and relationships.',
  mechanism: 'How it actually works. Internal structure and process.',
  implementation: 'Code-level detail. Concrete implementation.',
};

export function selectDepth(
  conceptTrust: TrustState,
  prerequisiteTrust: TrustState[]
): DepthLevel {
  const prereqsVerified = prerequisiteTrust.length > 0 &&
    prerequisiteTrust.every((ts) => ts.level === 'verified' || ts.level === 'inferred');

  // If the concept itself has some verification, go deeper.
  if (conceptTrust.level === 'verified') {
    return 'implementation';
  }

  if (conceptTrust.level === 'contested') {
    // Contested: go to mechanism level to address gaps.
    return 'mechanism';
  }

  // If prerequisites are solid, skip intuition.
  if (prereqsVerified) {
    return conceptTrust.level === 'inferred' ? 'mechanism' : 'abstraction';
  }

  // Default: start at intuition.
  return 'intuition';
}

export function adjustDepth(
  current: DepthLevel,
  direction: 'simpler' | 'deeper'
): DepthLevel {
  const idx = DEPTH_ORDER.indexOf(current);
  if (direction === 'simpler') {
    return DEPTH_ORDER[Math.max(0, idx - 1)];
  }
  return DEPTH_ORDER[Math.min(DEPTH_ORDER.length - 1, idx + 1)];
}

export function getDepthIndex(level: DepthLevel): number {
  return DEPTH_ORDER.indexOf(level);
}

export function isDeeper(a: DepthLevel, b: DepthLevel): boolean {
  return getDepthIndex(a) > getDepthIndex(b);
}
