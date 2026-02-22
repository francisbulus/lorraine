import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { loadConcepts } from '@engine/graph/load';
import { recordVerification } from '@engine/trust/record';
import type { Store } from '@engine/store/interface';
import type { LLMProvider } from '@llm/types';
import {
  detectExplainRequest,
  detectDepthAdjustment,
  createExplainEngine,
} from './explain-engine';

let store: Store;

const CONCEPTS = [
  { id: 'tcp-basics', name: 'TCP Basics', description: 'TCP fundamentals' },
  { id: 'tcp-handshake', name: 'TCP Handshake', description: 'Three-way handshake' },
  { id: 'tcp-retransmission', name: 'TCP Retransmission', description: 'Retransmission mechanism' },
];

const EDGES = [
  { from: 'tcp-basics', to: 'tcp-handshake', type: 'prerequisite' as const, inferenceStrength: 0.6 },
  { from: 'tcp-basics', to: 'tcp-retransmission', type: 'prerequisite' as const, inferenceStrength: 0.5 },
];

const PERSON_ID = 'test-learner';

function createMockLLM(responses: string[]): LLMProvider {
  let callIndex = 0;
  return {
    complete: async () => {
      const content = responses[callIndex] ?? 'explanation text';
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

describe('detectExplainRequest', () => {
  const ids = CONCEPTS.map((c) => c.id);

  it('detects "what is" request', () => {
    const result = detectExplainRequest('what is TCP?', ids);
    expect(result).not.toBeNull();
  });

  it('detects "how does" request', () => {
    const result = detectExplainRequest('how does TCP work?', ids);
    expect(result).not.toBeNull();
  });

  it('detects "explain" request', () => {
    const result = detectExplainRequest('explain TCP basics', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBe('tcp-basics');
  });

  it('returns null for non-explain utterances', () => {
    expect(detectExplainRequest('test me on TCP', ids)).toBeNull();
    expect(detectExplainRequest('I know TCP well', ids)).toBeNull();
  });

  it('identifies concept from utterance', () => {
    const result = detectExplainRequest('tell me about tcp handshake', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBe('tcp-handshake');
  });
});

describe('detectDepthAdjustment', () => {
  it('detects simpler requests', () => {
    expect(detectDepthAdjustment('explain that more simply')).toBe('simpler');
    expect(detectDepthAdjustment('can you break it down?')).toBe('simpler');
    expect(detectDepthAdjustment('ELI5 please')).toBe('simpler');
  });

  it('detects deeper requests', () => {
    expect(detectDepthAdjustment('show me the code')).toBe('deeper');
    expect(detectDepthAdjustment('give me more detail')).toBe('deeper');
    expect(detectDepthAdjustment('go deeper')).toBe('deeper');
  });

  it('returns null for neutral utterances', () => {
    expect(detectDepthAdjustment('OK, I see')).toBeNull();
    expect(detectDepthAdjustment('what about DNS?')).toBeNull();
  });
});

describe('createExplainEngine', () => {
  it('starts explanation at intuition for untested concept', async () => {
    const llm = createMockLLM(['TCP is like a phone call...']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    const result = await engine.startExplanation('tcp-handshake');
    expect(result.depth).toBe('intuition');
    expect(result.explanation).toBe('TCP is like a phone call...');
    expect(engine.isExplaining()).toBe(true);
  });

  it('starts at abstraction when prerequisites are verified', async () => {
    // Verify the prerequisite first.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });

    const llm = createMockLLM(['The handshake uses three packets...']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    const result = await engine.startExplanation('tcp-handshake');
    expect(result.depth).toBe('abstraction');
  });

  it('adjusts depth simpler', async () => {
    const llm = createMockLLM(['Technical explanation', 'Simpler explanation']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    await engine.startExplanation('tcp-basics');
    const adjusted = await engine.adjustExplanation('simpler');
    // intuition is already the lowest, so stays at intuition
    expect(adjusted.depth).toBe('intuition');
  });

  it('adjusts depth deeper', async () => {
    const llm = createMockLLM(['Intuition explanation', 'Deeper explanation']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    await engine.startExplanation('tcp-basics');
    const adjusted = await engine.adjustExplanation('deeper');
    expect(adjusted.depth).toBe('abstraction');
  });

  it('throws when adjusting without active explanation', async () => {
    const llm = createMockLLM([]);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    await expect(engine.adjustExplanation('deeper')).rejects.toThrow('No active explanation');
  });

  it('ends explanation cleanly', async () => {
    const llm = createMockLLM(['Explanation']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    await engine.startExplanation('tcp-basics');
    expect(engine.isExplaining()).toBe(true);
    engine.endExplanation();
    expect(engine.isExplaining()).toBe(false);
  });

  it('starts at implementation for verified concept', async () => {
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });

    const llm = createMockLLM(['Implementation details...']);
    const engine = createExplainEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    const result = await engine.startExplanation('tcp-basics');
    expect(result.depth).toBe('implementation');
  });
});
