import type { Store } from '@engine/store/interface';
import type { TrustState, CalibrateResult } from '@engine/types';
import { getTrustState } from '@engine/trust/query';
import { calibrate } from '@engine/epistemics/calibrate';

export type CalibrationCategory = 'aligned' | 'overclaimed' | 'underclaimed';

export interface CalibrationConcept {
  conceptId: string;
  category: CalibrationCategory;
  claimConfidence: number;
  evidenceConfidence: number;
  gap: number;
  trustLevel: string;
}

export interface CalibrationData {
  calibrationPercent: number;
  aligned: CalibrationConcept[];
  overclaimed: CalibrationConcept[];
  underclaimed: CalibrationConcept[];
  calibrateResult: CalibrateResult;
}

const OVERCLAIM_THRESHOLD = 0.1;
const UNDERCLAIM_THRESHOLD = -0.1;

export function computeCalibrationData(
  store: Store,
  personId: string,
  conceptIds: string[]
): CalibrationData {
  const calibrateResult = calibrate(store, { personId });

  const aligned: CalibrationConcept[] = [];
  const overclaimed: CalibrationConcept[] = [];
  const underclaimed: CalibrationConcept[] = [];

  for (const conceptId of conceptIds) {
    const trustState = getTrustState(store, { personId, conceptId });
    const latestClaim = store.getLatestClaim(personId, conceptId);
    if (!latestClaim) continue;

    const claimConfidence = latestClaim.selfReportedConfidence;
    const evidenceConfidence = trustState.decayedConfidence;
    const gap = claimConfidence - evidenceConfidence;

    const entry: CalibrationConcept = {
      conceptId,
      category: categorizeGap(gap),
      claimConfidence,
      evidenceConfidence,
      gap,
      trustLevel: trustState.level,
    };

    if (gap > OVERCLAIM_THRESHOLD) {
      overclaimed.push(entry);
    } else if (gap < UNDERCLAIM_THRESHOLD) {
      underclaimed.push(entry);
    } else {
      aligned.push(entry);
    }
  }

  const total = aligned.length + overclaimed.length + underclaimed.length;
  const calibrationPercent = total > 0
    ? Math.round((aligned.length / total) * 100)
    : 0;

  return {
    calibrationPercent,
    aligned,
    overclaimed,
    underclaimed,
    calibrateResult,
  };
}

function categorizeGap(gap: number): CalibrationCategory {
  if (gap > OVERCLAIM_THRESHOLD) return 'overclaimed';
  if (gap < UNDERCLAIM_THRESHOLD) return 'underclaimed';
  return 'aligned';
}
