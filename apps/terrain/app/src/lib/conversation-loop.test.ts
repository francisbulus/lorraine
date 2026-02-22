import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { loadConcepts } from '@engine/graph/load';
import { getTrustState } from '@engine/trust/query';
import type { Store } from '@engine/store/interface';
import type { LLMProvider } from '@llm/types';
import { createConversationLoop } from './conversation-loop';

let store: Store;

const CONCEPTS = [
  { id: 'tcp-basics', name: 'TCP Basics', description: 'TCP fundamentals' },
  { id: 'tcp-handshake', name: 'TCP Handshake', description: 'Three-way handshake' },
];

const EDGES = [
  { from: 'tcp-basics', to: 'tcp-handshake', type: 'prerequisite' as const, inferenceStrength: 0.6 },
];

const PERSON_ID = 'test-learner';

function createMockLLM(responses: string[]): LLMProvider {
  let callIndex = 0;
  return {
    complete: async () => {
      const content = responses[callIndex] ?? '{"signals":[]}';
      callIndex++;
      return { content };
    },
  };
}

beforeEach(() => {
  store = createSQLiteStore(':memory:');
  loadConcepts(store, { concepts: CONCEPTS, edges: EDGES });
});

afterEach(() => {
  store.close();
});

describe('conversation loop', () => {
  it('processes an utterance and returns agent response', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals response
      JSON.stringify({ signals: [] }),
      // extractClaims response
      JSON.stringify({ claims: [] }),
      // agent response
      'What aspect of TCP interests you most?',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('I want to learn about TCP');
    expect(result.agentResponse).toBe('What aspect of TCP interests you most?');
    expect(result.trustUpdates).toHaveLength(0);
  });

  it('writes fail-side implicit signals to core', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals: incorrect_usage signal
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'incorrect_usage',
          confidence: 0.8,
          evidence: 'Learner said TCP is connectionless, which is incorrect',
        }],
      }),
      // extractClaims
      JSON.stringify({ claims: [] }),
      // agent response
      'Actually, TCP is connection-oriented.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('TCP is connectionless, right?');
    expect(result.trustUpdates).toHaveLength(1);
    expect(result.trustUpdates[0].conceptId).toBe('tcp-basics');

    // Verify the event was written to core.
    const trustState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
    });
    expect(trustState.verificationHistory).toHaveLength(1);
    expect(trustState.verificationHistory[0].result).toBe('failed');
  });

  it('holds success-side signals as candidates when conditions not met', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals: correct_usage on untested concept
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'correct_usage',
          confidence: 0.9,
          evidence: 'Correctly explained that TCP provides reliable ordered delivery',
        }],
      }),
      // extractClaims
      JSON.stringify({ claims: [] }),
      // agent response
      'Good foundation.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('TCP provides reliable, ordered delivery');
    // Should be a candidate because concept is untested.
    expect(result.trustUpdates).toHaveLength(0);
    expect(result.candidateSignals).toHaveLength(1);
    expect(result.candidateSignals[0].signalType).toBe('correct_usage');
  });

  it('records claims from learner self-assessments', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals
      JSON.stringify({ signals: [] }),
      // extractClaims: learner claims confidence
      JSON.stringify({
        claims: [{
          conceptId: 'tcp-basics',
          selfReportedConfidence: 0.9,
          context: 'I know TCP basics well',
        }],
      }),
      // agent response
      'Let me test that.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('I know TCP basics well');

    // Verify claim was recorded.
    const trustState = getTrustState(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
    });
    expect(trustState.claimHistory).toHaveLength(1);
    expect(trustState.claimHistory[0].selfReportedConfidence).toBe(0.9);
  });

  it('deduplicates identical signals within 10-minute window', async () => {
    // First call: signal gets through
    const llm = createMockLLM([
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'confusion_signal',
          confidence: 0.7,
          evidence: 'expressed confusion about TCP',
        }],
      }),
      JSON.stringify({ claims: [] }),
      'Let me explain.',
      // Second call: same signal should be deduplicated
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'confusion_signal',
          confidence: 0.7,
          evidence: 'still confused about TCP',
        }],
      }),
      JSON.stringify({ claims: [] }),
      'Let me try a different approach.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const r1 = await loop.processUtterance("I don't get TCP");
    expect(r1.trustUpdates).toHaveLength(1);

    const r2 = await loop.processUtterance("I still don't get TCP");
    expect(r2.trustUpdates).toHaveLength(0); // deduplicated
  });

  it('maintains conversation history', async () => {
    const llm = createMockLLM([
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'Welcome.',
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'Tell me more.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('Hello');
    await loop.processUtterance('How does TCP work?');

    const history = loop.getHistory();
    expect(history).toHaveLength(4);
    expect(history[0]).toEqual({ role: 'learner', content: 'Hello' });
    expect(history[1]).toEqual({ role: 'agent', content: 'Welcome.' });
    expect(history[2]).toEqual({ role: 'learner', content: 'How does TCP work?' });
    expect(history[3]).toEqual({ role: 'agent', content: 'Tell me more.' });
  });

  it('always writes self_correction signals regardless of concept state', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'self_correction',
          confidence: 0.8,
          evidence: 'Learner corrected themselves about TCP being connectionless',
        }],
      }),
      JSON.stringify({ claims: [] }),
      'Good catch.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance(
      'Wait, I said TCP is connectionless but that is wrong, it is connection-oriented.'
    );
    expect(result.trustUpdates).toHaveLength(1);
    expect(result.trustUpdates[0].conceptId).toBe('tcp-basics');
  });
});
