import type { ImplicitSignal, ImplicitSignalType } from '@engine-services/types';
import type { TrustState } from '@engine/types';

// Fail-side signals: always auto-write to core.
const FAIL_SIDE_SIGNALS: ImplicitSignalType[] = [
  'incorrect_usage',
  'question_revealing_gap',
  'confusion_signal',
];

// Success-side signals that require additional conditions.
const SUCCESS_SIDE_SIGNALS: ImplicitSignalType[] = [
  'correct_usage',
  'natural_connection_made',
  'sophistication_increase',
];

export interface PolicyResult {
  write: ImplicitSignal[];
  candidate: ImplicitSignal[];
}

export function applySignalWritePolicy(
  signals: ImplicitSignal[],
  trustStates: Record<string, TrustState>
): PolicyResult {
  const write: ImplicitSignal[] = [];
  const candidate: ImplicitSignal[] = [];

  for (const signal of signals) {
    if (shouldAutoWrite(signal, trustStates)) {
      write.push(signal);
    } else {
      candidate.push(signal);
    }
  }

  return { write, candidate };
}

function shouldAutoWrite(
  signal: ImplicitSignal,
  trustStates: Record<string, TrustState>
): boolean {
  // self_correction always writes.
  if (signal.signalType === 'self_correction') {
    return true;
  }

  // Fail-side signals always write.
  if (FAIL_SIDE_SIGNALS.includes(signal.signalType)) {
    return true;
  }

  // Success-side signals: need all three conditions.
  if (SUCCESS_SIDE_SIGNALS.includes(signal.signalType)) {
    const state = trustStates[signal.conceptId];
    if (!state) return false;

    // Condition 1: concept must be verified or inferred.
    if (state.level !== 'verified' && state.level !== 'inferred') {
      return false;
    }

    // Condition 2: extractor confidence >= 0.85.
    if (signal.confidence < 0.85) {
      return false;
    }

    // Condition 3: evidence includes reasoning trace (non-empty, length check as proxy).
    if (!signal.evidence || signal.evidence.length < 20) {
      return false;
    }

    return true;
  }

  return false;
}
