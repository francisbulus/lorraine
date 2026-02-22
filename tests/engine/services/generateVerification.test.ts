// Test: generateVerification generates LLM-powered verification prompts.

import { describe, it, expect, afterEach } from 'vitest';
import { createTestGraph, PERSON_ID, CONCEPTS } from '../trust/helpers.js';
import { generateVerification } from '../../../engine/services/generateVerification.js';
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

describe('generateVerification', () => {
  it('generates a verification prompt for an untested concept', async () => {
    store = createTestGraph();
    const llm = createMockLLM(JSON.stringify({
      type: 'grill_question',
      content: 'Explain how TCP ensures reliable delivery.',
      expectedSignals: [CONCEPTS.A.id],
      conceptsTested: [CONCEPTS.A.id],
    }));

    const result = await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      reason: 'probing',
      applicationContext: 'learning',
    });

    expect(result.type).toBe('grill_question');
    expect(result.content).toContain('TCP');
    expect(result.conceptsTested).toContain(CONCEPTS.A.id);
  });

  it('passes difficultyAxis to the LLM', async () => {
    store = createTestGraph();
    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({
          type: 'grill_question',
          content: 'Apply this concept to a novel scenario.',
          expectedSignals: [CONCEPTS.A.id],
          conceptsTested: [CONCEPTS.A.id],
        }) };
      },
    };

    await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      difficultyAxis: 'transfer',
      reason: 'probing',
      applicationContext: 'learning',
    });

    expect(capturedUserMessage).toContain('transfer');
  });

  it('includes trust state context when concept has verification history', async () => {
    store = createTestGraph();
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'Recalled TCP basics',
    });

    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({
          type: 'grill_question',
          content: 'Go deeper on TCP.',
          expectedSignals: [CONCEPTS.A.id],
          conceptsTested: [CONCEPTS.A.id],
        }) };
      },
    };

    await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      reason: 'scheduled',
      applicationContext: 'learning',
    });

    expect(capturedUserMessage).toContain('verified');
  });

  it('handles malformed LLM response gracefully', async () => {
    store = createTestGraph();
    const llm = createMockLLM('Here is a verification question about TCP retransmission...');

    const result = await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      reason: 'probing',
      applicationContext: 'learning',
    });

    expect(result.type).toBe('grill_question');
    expect(result.content).toContain('TCP retransmission');
    expect(result.conceptsTested).toContain(CONCEPTS.A.id);
  });

  it('works without a specific conceptId', async () => {
    store = createTestGraph();
    const llm = createMockLLM(JSON.stringify({
      type: 'conversational_probe',
      content: 'What areas of networking interest you most?',
      expectedSignals: [],
      conceptsTested: [],
    }));

    const result = await generateVerification(store, llm, {
      personId: PERSON_ID,
      reason: 'probing',
      applicationContext: 'learning',
    });

    expect(result.type).toBe('conversational_probe');
    expect(result.conceptsTested).toEqual([]);
  });

  it('passes applicationContext to the LLM', async () => {
    store = createTestGraph();
    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({
          type: 'grill_question',
          content: 'Describe TCP in a technical interview context.',
          expectedSignals: [CONCEPTS.A.id],
          conceptsTested: [CONCEPTS.A.id],
        }) };
      },
    };

    await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.A.id,
      reason: 'probing',
      applicationContext: 'hiring',
    });

    expect(capturedUserMessage).toContain('hiring');
  });

  it('includes graph edges in LLM context', async () => {
    store = createTestGraph();
    let capturedUserMessage = '';
    const llm: LLMProvider = {
      async complete(_system, messages) {
        capturedUserMessage = messages[0]!.content;
        return { content: JSON.stringify({
          type: 'grill_question',
          content: 'Question about handshake.',
          expectedSignals: [CONCEPTS.B.id],
          conceptsTested: [CONCEPTS.B.id],
        }) };
      },
    };

    await generateVerification(store, llm, {
      personId: PERSON_ID,
      conceptId: CONCEPTS.B.id,
      reason: 'probing',
      applicationContext: 'learning',
    });

    // B has edges to A (prerequisite from A) and to C (prerequisite to C).
    expect(capturedUserMessage).toContain(CONCEPTS.A.id);
    expect(capturedUserMessage).toContain(CONCEPTS.C.id);
  });
});
