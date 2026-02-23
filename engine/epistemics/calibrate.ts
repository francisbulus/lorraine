// calibrate — audits model quality and self-calibration quality.
// Computes predictionAccuracy, overconfidenceBias, underconfidenceBias,
// stalePercentage, surpriseRate, claimCalibration, and recommendation.

import type { CalibrateResult } from '../types.js';
import type { Store } from '../store/interface.js';
import { computeDecayedConfidence } from '../trust/decay.js';

export interface CalibrateInput {
  personId: string;
  asOfTimestamp?: number;
}

const MS_PER_DAY = 86_400_000;
const STALE_THRESHOLD_DAYS = 60;

export function calibrate(
  store: Store,
  input: CalibrateInput
): CalibrateResult {
  const asOf = input.asOfTimestamp ?? Date.now();
  const allStates = store.getAllTrustStates(input.personId);

  if (allStates.length === 0) {
    return {
      predictionAccuracy: 0,
      overconfidenceBias: 0,
      underconfidenceBias: 0,
      stalePercentage: 0,
      surpriseRate: 0,
      claimCalibration: 0,
      recommendation: 'No trust data available. Begin verification to build a model.',
      predictionCount: 0,
      claimCount: 0,
      staleFromInferred: 0,
    };
  }

  // Track prediction accuracy: for each concept with multiple verification events,
  // did the confidence before the latest event predict the outcome?
  let predictions = 0;
  let correctPredictions = 0;
  let surprises = 0;
  let overconfidenceSum = 0;
  let underconfidenceSum = 0;
  let overconfidenceCount = 0;
  let underconfidenceCount = 0;
  let staleCount = 0;
  let staleFromInferred = 0;

  for (const state of allStates) {
    const history = store.getVerificationHistory(input.personId, state.conceptId);

    // Stale check: concepts not verified within threshold.
    if (state.lastVerified) {
      const daysSince = (asOf - state.lastVerified) / MS_PER_DAY;
      if (daysSince > STALE_THRESHOLD_DAYS) {
        staleCount++;
      }
    } else if (state.level === 'inferred') {
      staleCount++;
      staleFromInferred++;
    }

    if (history.length >= 2) {
      // Use the confidence at the second-to-last event to predict the last event's outcome.
      const lastEvent = history[history.length - 1]!;
      const confidenceBefore = state.confidence;

      predictions++;

      if (lastEvent.result === 'demonstrated' && confidenceBefore >= 0.5) {
        correctPredictions++;
      } else if (lastEvent.result === 'failed' && confidenceBefore < 0.5) {
        correctPredictions++;
      } else if (lastEvent.result === 'demonstrated' && confidenceBefore < 0.5) {
        // System underestimated — surprise success.
        surprises++;
        underconfidenceSum += (1 - confidenceBefore);
        underconfidenceCount++;
      } else if (lastEvent.result === 'failed' && confidenceBefore >= 0.5) {
        // System overestimated — surprise failure.
        surprises++;
        overconfidenceSum += confidenceBefore;
        overconfidenceCount++;
      }
    }
  }

  const predictionAccuracy = predictions > 0 ? correctPredictions / predictions : 0;
  const surpriseRate = predictions > 0 ? surprises / predictions : 0;
  const overconfidenceBias = overconfidenceCount > 0 ? overconfidenceSum / overconfidenceCount : 0;
  const underconfidenceBias = underconfidenceCount > 0 ? underconfidenceSum / underconfidenceCount : 0;
  const stalePercentage = allStates.length > 0 ? staleCount / allStates.length : 0;

  // Claim calibration: compare self-reported claims with evidence-based trust.
  let claimGapSum = 0;
  let claimCount = 0;

  for (const state of allStates) {
    const latestClaim = store.getLatestClaim(input.personId, state.conceptId);
    if (latestClaim) {
      const downstreamDeps = store.getDownstreamDependents(state.conceptId);
      const decayed = state.lastVerified
        ? computeDecayedConfidence(
            state.confidence,
            state.lastVerified,
            asOf,
            state.modalitiesTested.length,
            downstreamDeps.length
          )
        : state.confidence;

      const gap = Math.abs(latestClaim.selfReportedConfidence - decayed);
      claimGapSum += gap;
      claimCount++;
    }
  }

  // claimCalibration: 1.0 = perfect calibration, 0.0 = maximally miscalibrated.
  const claimCalibration = claimCount > 0 ? Math.max(0, 1 - (claimGapSum / claimCount)) : 0;

  // Generate recommendation.
  let recommendation: string;
  if (stalePercentage > 0.5) {
    recommendation = 'More than half the model is stale. Prioritize re-verification of foundational concepts.';
  } else if (overconfidenceBias > 0.3) {
    recommendation = 'System shows overconfidence bias. Increase verification frequency and use harder modalities.';
  } else if (underconfidenceBias > 0.3) {
    recommendation = 'System shows underconfidence bias. Trust state may be lagging behind actual understanding.';
  } else if (surpriseRate > 0.3) {
    recommendation = 'High surprise rate. Model predictions frequently differ from outcomes. More evidence needed.';
  } else if (claimCalibration < 0.5 && claimCount > 0) {
    recommendation = 'Self-assessment poorly calibrated with evidence. Focus on claim-evidence alignment.';
  } else if (predictions === 0) {
    recommendation = 'Insufficient data for calibration. Need concepts with 2+ verification events to measure prediction accuracy.';
  } else {
    recommendation = 'Model is performing within acceptable parameters. Continue regular verification.';
  }

  return {
    predictionAccuracy,
    overconfidenceBias,
    underconfidenceBias,
    stalePercentage,
    surpriseRate,
    claimCalibration,
    recommendation,
    predictionCount: predictions,
    claimCount,
    staleFromInferred,
  };
}
