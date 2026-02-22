import { describe, it, expect } from 'vitest';
import { applySignalWritePolicy } from './signal-write-policy';
import type { ImplicitSignal } from '@engine-services/types';
import type { TrustState } from '@engine/types';

function makeTrustState(overrides: Partial<TrustState> = {}): TrustState {
  return {
    conceptId: 'tcp-basics',
    personId: 'p1',
    level: 'verified',
    confidence: 0.7,
    verificationHistory: [],
    claimHistory: [],
    modalitiesTested: [],
    lastVerified: null,
    inferredFrom: [],
    decayedConfidence: 0.7,
    calibrationGap: null,
    ...overrides,
  };
}

describe('signal write policy', () => {
  it('always writes fail-side signals: incorrect_usage', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'incorrect_usage',
      confidence: 0.5,
      evidence: 'short',
    };
    const { write, candidate } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'untested' }) }
    );
    expect(write).toHaveLength(1);
    expect(candidate).toHaveLength(0);
  });

  it('always writes fail-side signals: question_revealing_gap', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'question_revealing_gap',
      confidence: 0.3,
      evidence: '',
    };
    const { write } = applySignalWritePolicy([signal], {});
    expect(write).toHaveLength(1);
  });

  it('always writes fail-side signals: confusion_signal', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'confusion_signal',
      confidence: 0.4,
      evidence: '',
    };
    const { write } = applySignalWritePolicy([signal], {});
    expect(write).toHaveLength(1);
  });

  it('always writes self_correction signals', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'self_correction',
      confidence: 0.6,
      evidence: 'learner corrected themselves',
    };
    const { write } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'untested' }) }
    );
    expect(write).toHaveLength(1);
  });

  it('writes success-side when all conditions met: verified + confidence >= 0.85 + reasoning', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'correct_usage',
      confidence: 0.9,
      evidence: 'correctly explained why retransmission needs acknowledgments in detail',
    };
    const { write, candidate } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'verified' }) }
    );
    expect(write).toHaveLength(1);
    expect(candidate).toHaveLength(0);
  });

  it('candidates success-side when concept is untested', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'correct_usage',
      confidence: 0.9,
      evidence: 'correctly explained why retransmission needs acknowledgments in detail',
    };
    const { write, candidate } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'untested' }) }
    );
    expect(write).toHaveLength(0);
    expect(candidate).toHaveLength(1);
  });

  it('candidates success-side when confidence < 0.85', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'correct_usage',
      confidence: 0.7,
      evidence: 'correctly explained why retransmission needs acknowledgments in detail',
    };
    const { write, candidate } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'verified' }) }
    );
    expect(write).toHaveLength(0);
    expect(candidate).toHaveLength(1);
  });

  it('candidates success-side when evidence is too short', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'correct_usage',
      confidence: 0.9,
      evidence: 'used TCP',
    };
    const { write, candidate } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'verified' }) }
    );
    expect(write).toHaveLength(0);
    expect(candidate).toHaveLength(1);
  });

  it('writes inferred concepts on success-side when all conditions met', () => {
    const signal: ImplicitSignal = {
      conceptId: 'tcp-basics',
      signalType: 'natural_connection_made',
      confidence: 0.95,
      evidence: 'learner connected TCP acknowledgment pattern to database write-ahead logging',
    };
    const { write } = applySignalWritePolicy(
      [signal],
      { 'tcp-basics': makeTrustState({ level: 'inferred' }) }
    );
    expect(write).toHaveLength(1);
  });

  it('separates mixed signals correctly', () => {
    const signals: ImplicitSignal[] = [
      { conceptId: 'tcp-basics', signalType: 'incorrect_usage', confidence: 0.5, evidence: 'wrong' },
      { conceptId: 'tcp-handshake', signalType: 'correct_usage', confidence: 0.9, evidence: 'correctly explained the three-way handshake in detail' },
      { conceptId: 'dns-resolution', signalType: 'correct_usage', confidence: 0.6, evidence: 'short' },
    ];
    const states: Record<string, TrustState> = {
      'tcp-basics': makeTrustState({ conceptId: 'tcp-basics' }),
      'tcp-handshake': makeTrustState({ conceptId: 'tcp-handshake', level: 'verified' }),
      'dns-resolution': makeTrustState({ conceptId: 'dns-resolution', level: 'verified' }),
    };
    const { write, candidate } = applySignalWritePolicy(signals, states);
    // incorrect_usage always writes, correct_usage for tcp-handshake qualifies, dns doesn't (low confidence)
    expect(write).toHaveLength(2);
    expect(candidate).toHaveLength(1);
  });
});
