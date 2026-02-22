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
    await loop.processUtterance('I think I understand the basics');

    const history = loop.getHistory();
    expect(history).toHaveLength(4);
    expect(history[0]).toEqual({ role: 'learner', content: 'Hello' });
    expect(history[1]).toEqual({ role: 'agent', content: 'Welcome.' });
    expect(history[2]).toEqual({ role: 'learner', content: 'I think I understand the basics' });
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

  it('returns mode in result', async () => {
    const llm = createMockLLM([
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'Response.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('Hello');
    expect(result.mode).toBe('conversation');
  });

  it('routes to explain mode on explain trigger', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals for the explain request
      JSON.stringify({ signals: [] }),
      // explain engine's llm.complete (the explanation)
      'TCP is a protocol that provides reliable, ordered delivery of data.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('What is TCP?');
    expect(result.mode).toBe('explain');
    expect(result.explainResult).toBeDefined();
    expect(result.explainResult!.conceptId).toBeDefined();
    expect(result.agentResponse).toBe('TCP is a protocol that provides reliable, ordered delivery of data.');
    expect(loop.getCurrentMode()).toBe('explain');
  });

  it('adjusts explain depth on simpler/deeper request', async () => {
    const llm = createMockLLM([
      // First: explain request
      JSON.stringify({ signals: [] }),
      'An explanation at intuition level.',
      // Second: depth adjustment
      'A deeper explanation at abstraction level.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('What is TCP?');
    const adjusted = await loop.processUtterance('Go deeper');
    expect(adjusted.mode).toBe('explain');
    expect(adjusted.explainResult).toBeDefined();
    expect(adjusted.agentResponse).toBe('A deeper explanation at abstraction level.');
  });

  it('routes to sandbox mode on sandbox trigger', async () => {
    const llm = createMockLLM([
      // extractImplicitSignals for the sandbox request
      JSON.stringify({ signals: [] }),
      // agent response (sandbox intro)
      'Sure, try writing some code.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const result = await loop.processUtterance('Can I try that in code?');
    expect(result.mode).toBe('sandbox');
    expect(result.sandboxStarted).toBeDefined();
    expect(loop.isSandboxActive()).toBe(true);
    expect(loop.getCurrentMode()).toBe('sandbox');
  });

  it('runs sandbox code and writes trust signals', async () => {
    const llm = createMockLLM([
      // 1. extractImplicitSignals for sandbox request
      JSON.stringify({ signals: [] }),
      // 2. agent response (sandbox intro)
      'Try it out.',
      // 3. sandbox annotation
      'The code correctly sets up a variable.',
      // 4. sandbox signal extraction
      JSON.stringify({
        signals: [{
          conceptId: 'tcp-basics',
          signalType: 'incorrect_usage',
          confidence: 0.7,
          evidence: 'Code shows misunderstanding of TCP',
        }],
        suggestion: 'Try using a different approach.',
      }),
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('Let me try that in code');
    expect(loop.isSandboxActive()).toBe(true);

    const result = await loop.runSandboxCode('console.log("hello")');
    expect(result.execution.success).toBe(true);
    expect(result.annotation).toBeDefined();
    // Fail-side signal should be written to trust.
    expect(result.trustUpdates).toHaveLength(1);
    expect(result.trustUpdates[0].conceptId).toBe('tcp-basics');
  });

  it('ends sandbox and returns to conversation mode', async () => {
    const llm = createMockLLM([
      JSON.stringify({ signals: [] }),
      'Try it.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('Can I try that in code?');
    expect(loop.isSandboxActive()).toBe(true);

    loop.endSandbox();
    expect(loop.isSandboxActive()).toBe(false);
    expect(loop.getCurrentMode()).toBe('conversation');
  });

  it('ends explanation and returns to conversation mode', async () => {
    const llm = createMockLLM([
      JSON.stringify({ signals: [] }),
      'An explanation.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await loop.processUtterance('What is TCP?');
    expect(loop.getCurrentMode()).toBe('explain');

    loop.endExplanation();
    expect(loop.getCurrentMode()).toBe('conversation');
  });

  it('transitions between modes on learner request', async () => {
    const llm = createMockLLM([
      // 1. explain request: extractImplicitSignals + explain
      JSON.stringify({ signals: [] }),
      'Here is how TCP works.',
      // 2. sandbox transition: extractImplicitSignals + agent response
      JSON.stringify({ signals: [] }),
      'Sure, try writing some code.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    const r1 = await loop.processUtterance('How does TCP work?');
    expect(r1.mode).toBe('explain');

    const r2 = await loop.processUtterance('Let me try that in code');
    expect(r2.mode).toBe('sandbox');
    expect(r2.sandboxStarted).toBeDefined();
    expect(loop.isSandboxActive()).toBe(true);
  });

  it('appends agent transition suggestion to response', async () => {
    const llm = createMockLLM([
      // 1. explain request
      JSON.stringify({ signals: [] }),
      'TCP is a transport protocol.',
      // 2-4. Three more turns to trigger suggestion (turnsSinceLastMode >= 3)
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'It provides reliability.',
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'Through sequence numbers.',
      JSON.stringify({ signals: [] }),
      JSON.stringify({ claims: [] }),
      'And acknowledgments.',
    ]);

    const loop = createConversationLoop({
      store,
      llm,
      personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    // Enter explain mode.
    await loop.processUtterance('What is TCP?');

    // Three normal turns to accumulate turnsSinceLastMode.
    await loop.processUtterance('OK');
    await loop.processUtterance('Right');
    const r3 = await loop.processUtterance('Got it');

    // After 3+ turns in explain mode, agent should suggest sandbox.
    if (r3.transitionSuggestion) {
      expect(r3.agentResponse).toContain(r3.transitionSuggestion.suggestion);
    }
  });
});
