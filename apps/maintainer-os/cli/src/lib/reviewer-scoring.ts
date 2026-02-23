import { getBulkTrustState } from '../engine.js';
import type { Store, TrustState } from '../engine.js';

export interface ReviewerScore {
  personId: string;
  conceptScores: ConceptScore[];
  verifiedCount: number;
  inferredCount: number;
  untestedCount: number;
  totalScore: number;
}

export interface ConceptScore {
  conceptId: string;
  level: TrustState['level'];
  confidence: number;
  decayedConfidence: number;
  lastVerified: number | null;
}

export function scoreReviewers(
  store: Store,
  conceptIds: string[],
  personIds: string[],
  topN: number,
): ReviewerScore[] {
  const scores: ReviewerScore[] = [];

  for (const personId of personIds) {
    const score = scoreCandidate(store, personId, conceptIds);
    // Only include candidates with at least some relevant trust
    if (score.verifiedCount > 0 || score.inferredCount > 0) {
      scores.push(score);
    }
  }

  // Sort by: verified count desc, total score desc
  scores.sort((a, b) => {
    if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
    return b.totalScore - a.totalScore;
  });

  return scores.slice(0, topN);
}

function scoreCandidate(store: Store, personId: string, conceptIds: string[]): ReviewerScore {
  const states = getBulkTrustState(store, { personId, conceptIds });
  const stateMap = new Map(states.map((s) => [s.conceptId, s]));

  const conceptScores: ConceptScore[] = [];
  let verifiedCount = 0;
  let inferredCount = 0;
  let untestedCount = 0;
  let totalScore = 0;

  for (const conceptId of conceptIds) {
    const state = stateMap.get(conceptId);
    const level = state?.level ?? 'untested';
    const confidence = state?.decayedConfidence ?? 0;
    const lastVerified = state?.lastVerified ?? null;

    conceptScores.push({
      conceptId,
      level,
      confidence,
      decayedConfidence: confidence,
      lastVerified,
    });

    switch (level) {
      case 'verified':
        verifiedCount++;
        totalScore += confidence;
        break;
      case 'inferred':
        inferredCount++;
        totalScore += confidence * 0.5;
        break;
      case 'contested':
        totalScore += confidence * 0.3;
        break;
      case 'untested':
        untestedCount++;
        break;
    }
  }

  return { personId, conceptScores, verifiedCount, inferredCount, untestedCount, totalScore };
}
