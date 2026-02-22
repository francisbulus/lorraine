import { describe, it, expect } from 'vitest';
import { SignalDeduplicator } from './signal-deduplicator';
import type { ImplicitSignal } from '@engine-services/types';

function makeSignal(conceptId: string, signalType: ImplicitSignal['signalType']): ImplicitSignal {
  return { conceptId, signalType, confidence: 0.8, evidence: 'test' };
}

describe('SignalDeduplicator', () => {
  it('allows the first signal', () => {
    const dedup = new SignalDeduplicator();
    const signal = makeSignal('tcp-basics', 'correct_usage');
    expect(dedup.isDuplicate(signal, 1000)).toBe(false);
  });

  it('rejects duplicate signal within 10-minute window', () => {
    const dedup = new SignalDeduplicator();
    const signal = makeSignal('tcp-basics', 'correct_usage');
    const t = Date.now();
    dedup.isDuplicate(signal, t);
    expect(dedup.isDuplicate(signal, t + 5 * 60_000)).toBe(true); // 5 min later
  });

  it('allows same signal after 10-minute window expires', () => {
    const dedup = new SignalDeduplicator();
    const signal = makeSignal('tcp-basics', 'correct_usage');
    const t = Date.now();
    dedup.isDuplicate(signal, t);
    expect(dedup.isDuplicate(signal, t + 11 * 60_000)).toBe(false); // 11 min later
  });

  it('allows different concept same signal type', () => {
    const dedup = new SignalDeduplicator();
    const t = Date.now();
    dedup.isDuplicate(makeSignal('tcp-basics', 'correct_usage'), t);
    expect(dedup.isDuplicate(makeSignal('dns-resolution', 'correct_usage'), t)).toBe(false);
  });

  it('allows same concept different signal type', () => {
    const dedup = new SignalDeduplicator();
    const t = Date.now();
    dedup.isDuplicate(makeSignal('tcp-basics', 'correct_usage'), t);
    expect(dedup.isDuplicate(makeSignal('tcp-basics', 'incorrect_usage'), t)).toBe(false);
  });

  it('clears all records', () => {
    const dedup = new SignalDeduplicator();
    const signal = makeSignal('tcp-basics', 'correct_usage');
    const t = Date.now();
    dedup.isDuplicate(signal, t);
    dedup.clear();
    expect(dedup.isDuplicate(signal, t)).toBe(false);
  });
});
