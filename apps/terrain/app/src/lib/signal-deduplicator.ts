import type { ImplicitSignal } from '@engine-services/types';

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface SignalRecord {
  key: string;
  timestamp: number;
}

export class SignalDeduplicator {
  private recent: SignalRecord[] = [];

  isDuplicate(signal: ImplicitSignal, timestamp: number): boolean {
    const key = `${signal.conceptId}:${signal.signalType}`;

    // Prune expired records.
    this.recent = this.recent.filter(
      (r) => timestamp - r.timestamp < DEDUP_WINDOW_MS
    );

    // Check for duplicate.
    const exists = this.recent.some((r) => r.key === key);
    if (exists) {
      return true;
    }

    // Record this signal.
    this.recent.push({ key, timestamp });
    return false;
  }

  clear(): void {
    this.recent = [];
  }
}
