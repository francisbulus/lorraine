import type {
  VerificationEvent,
  TrustLevel,
} from '../types.js';
import {
  MODALITY_STRENGTH as modalityStrengths,
  CROSS_MODALITY_CONFIDENCE_BONUS,
} from '../types.js';

export function computeTrustFromHistory(
  history: VerificationEvent[],
  existing: { level: TrustLevel; confidence: number; inferredFrom: string[] } | null
): { level: TrustLevel; confidence: number } {
  if (history.length === 0) {
    return { level: 'untested', confidence: 0 };
  }

  const demonstrated = history.filter((e) => e.result === 'demonstrated');
  const failed = history.filter((e) => e.result === 'failed');
  const partial = history.filter((e) => e.result === 'partial');

  const hasSuccess = demonstrated.length > 0 || partial.length > 0;
  const hasFailure = failed.length > 0;

  if (hasSuccess && hasFailure) {
    const successWeight = demonstrated.length + partial.length * 0.5;
    const totalWeight = successWeight + failed.length;
    const baseConfidence = successWeight / totalWeight;

    const demonstratedModalities = new Set(demonstrated.map((e) => e.modality));
    const modalityBonus = Math.max(
      0,
      (demonstratedModalities.size - 1) * CROSS_MODALITY_CONFIDENCE_BONUS
    );

    const confidence = Math.min(1.0, baseConfidence + modalityBonus);
    return { level: 'contested', confidence };
  }

  if (demonstrated.length > 0) {
    const modalities = new Set(demonstrated.map((e) => e.modality));
    let maxStrength = 0;
    for (const modality of modalities) {
      maxStrength = Math.max(maxStrength, modalityStrengths[modality]);
    }

    const modalityBonus = Math.max(
      0,
      (modalities.size - 1) * CROSS_MODALITY_CONFIDENCE_BONUS
    );

    const partialBonus = partial.length > 0 ? 0.05 : 0;
    const confidence = Math.min(1.0, maxStrength + modalityBonus + partialBonus);
    return { level: 'verified', confidence };
  }

  if (partial.length > 0 && failed.length === 0) {
    const modalities = new Set(partial.map((e) => e.modality));
    let maxStrength = 0;
    for (const modality of modalities) {
      maxStrength = Math.max(maxStrength, modalityStrengths[modality]);
    }

    const confidence = Math.min(1.0, maxStrength * 0.5);
    return { level: 'verified', confidence };
  }

  if (existing && (existing.level === 'verified' || existing.level === 'inferred')) {
    return { level: 'contested', confidence: 0.2 };
  }

  return { level: 'untested', confidence: 0 };
}
