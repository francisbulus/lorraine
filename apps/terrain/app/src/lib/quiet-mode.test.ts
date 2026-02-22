import { describe, it, expect } from 'vitest';
import { createQuietMode } from './quiet-mode';
import type { ImplicitSignal } from '@engine-services/types';

function makeSignal(conceptId: string): ImplicitSignal {
  return {
    conceptId,
    signalType: 'correct_usage',
    confidence: 0.8,
    evidence: 'test evidence',
  };
}

describe('quiet mode', () => {
  it('starts disabled', () => {
    const qm = createQuietMode();
    expect(qm.isEnabled()).toBe(false);
  });

  it('toggles on and off', () => {
    const qm = createQuietMode();
    expect(qm.toggle()).toBe(true);
    expect(qm.isEnabled()).toBe(true);
    expect(qm.toggle()).toBe(false);
    expect(qm.isEnabled()).toBe(false);
  });

  it('sets enabled directly', () => {
    const qm = createQuietMode();
    qm.setEnabled(true);
    expect(qm.isEnabled()).toBe(true);
  });

  it('adds pending signals', () => {
    const qm = createQuietMode();
    const ps = qm.addPending(makeSignal('tcp-basics'));
    expect(ps.id).toMatch(/^ps_/);
    expect(ps.signal.conceptId).toBe('tcp-basics');
    expect(qm.getPending()).toHaveLength(1);
  });

  it('accepts a pending signal and removes it', () => {
    const qm = createQuietMode();
    const ps = qm.addPending(makeSignal('tcp-basics'));
    const accepted = qm.acceptSignal(ps.id);
    expect(accepted).not.toBeNull();
    expect(accepted!.conceptId).toBe('tcp-basics');
    expect(qm.getPending()).toHaveLength(0);
  });

  it('dismisses a pending signal', () => {
    const qm = createQuietMode();
    const ps = qm.addPending(makeSignal('tcp-basics'));
    expect(qm.dismissSignal(ps.id)).toBe(true);
    expect(qm.getPending()).toHaveLength(0);
  });

  it('returns null for accepting non-existent signal', () => {
    const qm = createQuietMode();
    expect(qm.acceptSignal('nonexistent')).toBeNull();
  });

  it('returns false for dismissing non-existent signal', () => {
    const qm = createQuietMode();
    expect(qm.dismissSignal('nonexistent')).toBe(false);
  });

  it('clears all pending signals', () => {
    const qm = createQuietMode();
    qm.addPending(makeSignal('a'));
    qm.addPending(makeSignal('b'));
    expect(qm.getPending()).toHaveLength(2);
    qm.clear();
    expect(qm.getPending()).toHaveLength(0);
  });

  it('getPending returns a copy', () => {
    const qm = createQuietMode();
    qm.addPending(makeSignal('tcp-basics'));
    const pending = qm.getPending();
    pending.pop();
    expect(qm.getPending()).toHaveLength(1);
  });
});
