// Test: interpretResponse translates natural language responses into structured trust updates.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from '../trust/helpers.js';
import { interpretResponse } from '../../../engine/services/interpretResponse.js';
import { recordVerification } from '../../../engine/trust/record.js';
import type { Store } from '../../../engine/store/interface.js';
import type { LLMProvider } from '../../../llm/types.js';

function createMockLLM(response: string): LLMProvider {
  return {
    async complete() {
      return { content: response };
    },
  };
}

let store: Store;

afterEach(() => {
  store?.close();
});

describe('interpretResponse', () => {
  it('interprets a demonstrated response', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Explain TCP reliable delivery',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    const llm = createMockLLM(JSON.stringify({
      trustUpdates: [{
        conceptId: CONCEPTS.A.id,
        result: 'demonstrated',
        evidence: 'Correctly described acknowledgment-based reliability',
      }],
      contestedDetected: false,
      implicitSignals: [],
    }));

    const result = await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'TCP uses acknowledgments to ensure every byte arrives.',
      responseModality: 'grill:recall',
    });

    expect(result.trustUpdates).toHaveLength(1);
    expect(result.trustUpdates[0]!.conceptId).toBe(CONCEPTS.A.id);
    expect(result.trustUpdates[0]!.result).toBe('demonstrated');
    expect(result.trustUpdates[0]!.evidence).toContain('acknowledgment');
    expect(result.contestedDetected).toBe(false);
  });

  it('interprets a failed response with contested detection', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      modality: 'grill:inference',
      result: 'demonstrated',
      context: 'Explain the three-way handshake',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    const llm = createMockLLM(JSON.stringify({
      trustUpdates: [{
        conceptId: CONCEPTS.B.id,
        result: 'failed',
        evidence: 'Could not explain why SYN-ACK is needed',
      }],
      contestedDetected: true,
      implicitSignals: [{
        conceptId: CONCEPTS.B.id,
        signalType: 'confusion_signal',
        confidence: 0.9,
        evidence: 'Confused SYN with ACK',
      }],
    }));

    const result = await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'I think SYN sends the data... or is that ACK?',
      responseModality: 'grill:inference',
    });

    expect(result.trustUpdates[0]!.result).toBe('failed');
    expect(result.contestedDetected).toBe(true);
    expect(result.implicitSignals).toHaveLength(1);
    expect(result.implicitSignals[0]!.signalType).toBe('confusion_signal');
  });

  it('handles malformed LLM response gracefully', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Explain TCP',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    const llm = createMockLLM('This response is not JSON at all.');

    const result = await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'Something about TCP',
      responseModality: 'grill:recall',
    });

    expect(result.trustUpdates).toHaveLength(0);
    expect(result.implicitSignals).toHaveLength(0);
  });

  it('extracts implicit signals alongside main assessment', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.C.id,
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'Apply sequence numbers to a novel scenario',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    const llm = createMockLLM(JSON.stringify({
      trustUpdates: [{
        conceptId: CONCEPTS.C.id,
        result: 'demonstrated',
        evidence: 'Applied sequence numbers correctly',
      }],
      contestedDetected: false,
      implicitSignals: [
        {
          conceptId: CONCEPTS.A.id,
          signalType: 'natural_connection_made',
          confidence: 0.9,
          evidence: 'Connected sequence numbers to reliable delivery without prompting',
        },
        {
          conceptId: CONCEPTS.C.id,
          signalType: 'sophistication_increase',
          confidence: 0.85,
          evidence: 'Showed deeper understanding of ordering guarantees',
        },
      ],
    }));

    const result = await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'Sequence numbers ensure ordering, which is key for reliable delivery...',
      responseModality: 'grill:transfer',
    });

    expect(result.implicitSignals).toHaveLength(2);
    expect(result.implicitSignals[0]!.signalType).toBe('natural_connection_made');
    expect(result.implicitSignals[1]!.signalType).toBe('sophistication_increase');
  });

  it('clamps confidence values to 0-1 range', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Test',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    const llm = createMockLLM(JSON.stringify({
      trustUpdates: [],
      contestedDetected: false,
      implicitSignals: [{
        conceptId: CONCEPTS.A.id,
        signalType: 'correct_usage',
        confidence: 1.5,
        evidence: 'Used correctly',
      }],
    }));

    const result = await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'TCP ensures reliability through acknowledgments.',
      responseModality: 'grill:recall',
    });

    expect(result.implicitSignals[0]!.confidence).toBe(1.0);
  });

  it('provides verification context to the LLM', async () => {
    store = createTestGraph();
    const state = recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.D.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Explain retransmission timers in TCP',
    });
    const veId = state.verificationHistory[state.verificationHistory.length - 1]!.id;

    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({
          trustUpdates: [],
          contestedDetected: false,
          implicitSignals: [],
        }) };
      },
    };

    await interpretResponse(store, llm, {
      verificationId: veId,
      personId: PERSON_ID,
      response: 'Retransmission timers back off exponentially.',
      responseModality: 'grill:recall',
    });

    expect(capturedUserMessage).toContain('retransmission timers');
    expect(capturedUserMessage).toContain(CONCEPTS.D.id);
  });
});
