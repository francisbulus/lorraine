// Test: extractImplicitSignals mines natural conversation for trust signals.

import { describe, it, expect } from 'vitest';
import { extractImplicitSignals } from '../../../engine/services/extractImplicitSignals.js';
import type { LLMProvider } from '../../../llm/types.js';
import type { TrustState } from '../../../engine/types.js';

function createMockLLM(response: string): LLMProvider {
  return {
    async complete() {
      return { content: response };
    },
  };
}

function makeTrustState(conceptId: string, overrides: Partial<TrustState> = {}): TrustState {
  return {
    conceptId,
    personId: 'person_1',
    level: 'untested',
    confidence: 0,
    verificationHistory: [],
    claimHistory: [],
    modalitiesTested: [],
    lastVerified: null,
    inferredFrom: [],
    decayedConfidence: 0,
    calibrationGap: null,
    ...overrides,
  };
}

describe('extractImplicitSignals', () => {
  it('extracts correct_usage signal from natural conversation', async () => {
    const llm = createMockLLM(JSON.stringify({
      signals: [{
        conceptId: 'tcp-reliability',
        signalType: 'correct_usage',
        confidence: 0.9,
        evidence: 'Correctly explained retransmission as acknowledgment-based',
      }],
    }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'So TCP retransmits because the receiver sends ACKs back, and if the sender does not get an ACK it resends.',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.conceptId).toBe('tcp-reliability');
    expect(result[0]!.signalType).toBe('correct_usage');
    expect(result[0]!.confidence).toBe(0.9);
  });

  it('extracts question_revealing_gap signal', async () => {
    const llm = createMockLLM(JSON.stringify({
      signals: [{
        conceptId: 'tcp-handshake',
        signalType: 'question_revealing_gap',
        confidence: 0.85,
        evidence: 'Asked why the handshake needs three steps, revealing missing understanding of two-way agreement',
      }],
    }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'Wait, why does it need three steps? Cannot the client just say hello and start sending?',
      conversationHistory: ['We were discussing how TCP connections are established.'],
      personId: 'person_1',
      currentTrustState: {
        'tcp-handshake': makeTrustState('tcp-handshake', { level: 'inferred', confidence: 0.4, decayedConfidence: 0.35 }),
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.signalType).toBe('question_revealing_gap');
  });

  it('extracts multiple signals from a single utterance', async () => {
    const llm = createMockLLM(JSON.stringify({
      signals: [
        {
          conceptId: 'tcp-reliability',
          signalType: 'correct_usage',
          confidence: 0.88,
          evidence: 'Correctly used retransmission concept',
        },
        {
          conceptId: 'flow-control',
          signalType: 'confusion_signal',
          confidence: 0.92,
          evidence: 'Confused flow control with congestion control',
        },
      ],
    }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'TCP retransmits lost packets, and it also uses flow control to avoid... wait, is congestion control the same thing?',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.signalType).toBe('correct_usage');
    expect(result[1]!.signalType).toBe('confusion_signal');
  });

  it('returns empty array when no signals found', async () => {
    const llm = createMockLLM(JSON.stringify({ signals: [] }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'What should we talk about today?',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    expect(result).toHaveLength(0);
  });

  it('handles malformed LLM response gracefully', async () => {
    const llm = createMockLLM('Sorry, I cannot analyze this text properly.');

    const result = await extractImplicitSignals(llm, {
      utterance: 'TCP uses acknowledgments.',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    expect(result).toHaveLength(0);
  });

  it('clamps confidence values and filters invalid signal types', async () => {
    const llm = createMockLLM(JSON.stringify({
      signals: [
        {
          conceptId: 'tcp-reliability',
          signalType: 'correct_usage',
          confidence: 2.0,
          evidence: 'Used correctly',
        },
        {
          conceptId: 'dns',
          signalType: 'invalid_type',
          confidence: 0.5,
          evidence: 'Something',
        },
      ],
    }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'TCP retransmits because of acknowledgments.',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    // Only valid signal type passes through.
    expect(result).toHaveLength(1);
    expect(result[0]!.confidence).toBe(1.0);
  });

  it('includes conversation history and trust state in LLM context', async () => {
    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({ signals: [] }) };
      },
    };

    await extractImplicitSignals(llm, {
      utterance: 'TCP uses sequence numbers for ordering.',
      conversationHistory: ['Previous message about networking', 'Another previous message'],
      personId: 'person_1',
      currentTrustState: {
        'tcp-reliability': makeTrustState('tcp-reliability', {
          level: 'verified',
          confidence: 0.7,
          decayedConfidence: 0.65,
        }),
      },
    });

    expect(capturedUserMessage).toContain('Previous message about networking');
    expect(capturedUserMessage).toContain('tcp-reliability');
    expect(capturedUserMessage).toContain('verified');
  });

  it('extracts self_correction signal', async () => {
    const llm = createMockLLM(JSON.stringify({
      signals: [{
        conceptId: 'tcp-handshake',
        signalType: 'self_correction',
        confidence: 0.95,
        evidence: 'Initially said SYN-ACK goes from client to server, then corrected to server to client',
      }],
    }));

    const result = await extractImplicitSignals(llm, {
      utterance: 'The SYN-ACK goes from the client... wait no, the server sends SYN-ACK back to the client.',
      conversationHistory: [],
      personId: 'person_1',
      currentTrustState: {},
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.signalType).toBe('self_correction');
    expect(result[0]!.confidence).toBe(0.95);
  });
});
