import type { TrustState, TrustLevel } from '@engine/types';
import type { Territory, Threshold } from './domain-loader';

export interface ConceptBreakdown {
  conceptId: string;
  level: TrustLevel;
  decayedConfidence: number;
}

export interface TerritoryState {
  territory: Territory;
  verifiedCount: number;
  inferredCount: number;
  contestedCount: number;
  untestedCount: number;
  totalConcepts: number;
  verifiedPercent: number;
  progressPercent: number;
  contestedConcepts: string[];
  concepts: ConceptBreakdown[];
}

export interface ThresholdReadiness {
  threshold: Threshold;
  ready: string[];
  missing: string[];
  totalRequired: number;
  isReady: boolean;
}

export function computeTerritoryState(
  territory: Territory,
  trustStates: Map<string, TrustState>
): TerritoryState {
  let verifiedCount = 0;
  let inferredCount = 0;
  let contestedCount = 0;
  let untestedCount = 0;
  const contestedConcepts: string[] = [];
  const concepts: ConceptBreakdown[] = [];

  for (const cid of territory.conceptIds) {
    const ts = trustStates.get(cid);
    const level: TrustLevel = ts?.level ?? 'untested';
    const decayedConfidence = ts?.decayedConfidence ?? 0;

    concepts.push({ conceptId: cid, level, decayedConfidence });

    switch (level) {
      case 'verified':
        verifiedCount++;
        break;
      case 'inferred':
        inferredCount++;
        break;
      case 'contested':
        contestedCount++;
        contestedConcepts.push(cid);
        break;
      default:
        untestedCount++;
    }
  }

  const totalConcepts = territory.conceptIds.length;
  const verifiedPercent = totalConcepts > 0
    ? (verifiedCount / totalConcepts) * 100
    : 0;
  // Progress: verified = full credit, inferred = half credit.
  const progressPercent = totalConcepts > 0
    ? ((verifiedCount + inferredCount * 0.5) / totalConcepts) * 100
    : 0;

  return {
    territory,
    verifiedCount,
    inferredCount,
    contestedCount,
    untestedCount,
    totalConcepts,
    verifiedPercent,
    progressPercent,
    contestedConcepts,
    concepts,
  };
}

export function computeThresholdReadiness(
  threshold: Threshold,
  trustStates: Map<string, TrustState>
): ThresholdReadiness {
  const { conceptIds, minimumLevel } = threshold.readinessCriteria;
  const ready: string[] = [];
  const missing: string[] = [];

  const meetsMinimum = (level: TrustLevel): boolean => {
    if (minimumLevel === 'verified') return level === 'verified';
    // 'inferred' minimum: verified or inferred both qualify.
    return level === 'verified' || level === 'inferred';
  };

  for (const cid of conceptIds) {
    const ts = trustStates.get(cid);
    const level: TrustLevel = ts?.level ?? 'untested';

    if (meetsMinimum(level)) {
      ready.push(cid);
    } else {
      missing.push(cid);
    }
  }

  return {
    threshold,
    ready,
    missing,
    totalRequired: conceptIds.length,
    isReady: missing.length === 0,
  };
}

export function buildTrustStateMap(trustStates: TrustState[]): Map<string, TrustState> {
  const map = new Map<string, TrustState>();
  for (const ts of trustStates) {
    map.set(ts.conceptId, ts);
  }
  return map;
}
