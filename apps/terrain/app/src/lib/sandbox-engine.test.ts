import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { loadConcepts } from '@engine/graph/load';
import type { Store } from '@engine/store/interface';
import type { LLMProvider } from '@llm/types';
import {
  detectSandboxRequest,
  createSandboxEngine,
} from './sandbox-engine';

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
      const content = responses[callIndex] ?? '{}';
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

describe('detectSandboxRequest', () => {
  const ids = CONCEPTS.map((c) => c.id);

  it('detects "show me in code"', () => {
    const result = detectSandboxRequest('show me in code', ids);
    expect(result).not.toBeNull();
  });

  it('detects "can I try that?"', () => {
    const result = detectSandboxRequest('can I try that?', ids);
    expect(result).not.toBeNull();
  });

  it('detects "let me experiment"', () => {
    const result = detectSandboxRequest('let me experiment with this', ids);
    expect(result).not.toBeNull();
  });

  it('returns null for non-sandbox utterances', () => {
    expect(detectSandboxRequest('explain TCP', ids)).toBeNull();
    expect(detectSandboxRequest('test me on this', ids)).toBeNull();
  });

  it('identifies concept from utterance', () => {
    const result = detectSandboxRequest('show me tcp handshake in code', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBe('tcp-handshake');
  });

  it('returns null concept when no match', () => {
    const result = detectSandboxRequest('can I try that?', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBeNull();
  });
});

describe('createSandboxEngine', () => {
  it('starts sandbox and tracks state', () => {
    const llm = createMockLLM([]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    expect(engine.isSandboxActive()).toBe(false);
    engine.startSandbox('tcp-basics');
    expect(engine.isSandboxActive()).toBe(true);
    expect(engine.getSandboxState()!.conceptId).toBe('tcp-basics');
  });

  it('runs code and returns annotation', async () => {
    const llm = createMockLLM([
      'The code adds two numbers and logs the result.',
      '{"signals":[],"suggestion":null}',
    ]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    const result = await engine.runCode('console.log(1 + 2)');
    expect(result.execution.success).toBe(true);
    expect(result.execution.output).toBe('3');
    expect(result.annotation).toBe('The code adds two numbers and logs the result.');
  });

  it('extracts signals from run', async () => {
    const signalResponse = JSON.stringify({
      signals: [
        {
          conceptId: 'tcp-basics',
          signalType: 'correct_usage',
          confidence: 0.85,
          evidence: 'implemented correctly',
        },
      ],
      suggestion: 'Try setting the timeout to 0.',
    });
    const llm = createMockLLM(['annotation', signalResponse]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    const result = await engine.runCode('console.log("hello")');
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].conceptId).toBe('tcp-basics');
    expect(result.signals[0].signalType).toBe('correct_usage');
    expect(result.suggestion).toBe('Try setting the timeout to 0.');
  });

  it('filters signals to known concepts', async () => {
    const signalResponse = JSON.stringify({
      signals: [
        { conceptId: 'unknown-concept', signalType: 'correct_usage', confidence: 0.8, evidence: 'test' },
        { conceptId: 'tcp-basics', signalType: 'correct_usage', confidence: 0.8, evidence: 'test' },
      ],
      suggestion: null,
    });
    const llm = createMockLLM(['annotation', signalResponse]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    const result = await engine.runCode('console.log(1)');
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].conceptId).toBe('tcp-basics');
  });

  it('handles execution errors', async () => {
    const llm = createMockLLM([
      'The code threw a reference error.',
      '{"signals":[{"conceptId":"tcp-basics","signalType":"incorrect_usage","confidence":0.6,"evidence":"reference error"}],"suggestion":null}',
    ]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    const result = await engine.runCode('undeclaredVar.method()');
    expect(result.execution.success).toBe(false);
    expect(result.execution.error).not.toBeNull();
    expect(result.signals[0].signalType).toBe('incorrect_usage');
  });

  it('tracks run history', async () => {
    const llm = createMockLLM([
      'annotation1', '{"signals":[],"suggestion":null}',
      'annotation2', '{"signals":[],"suggestion":null}',
    ]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    await engine.runCode('console.log(1)');
    await engine.runCode('console.log(2)');
    expect(engine.getSandboxState()!.runs).toHaveLength(2);
  });

  it('throws when running without active sandbox', async () => {
    const llm = createMockLLM([]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    await expect(engine.runCode('console.log(1)')).rejects.toThrow('No active sandbox');
  });

  it('ends sandbox cleanly', () => {
    const llm = createMockLLM([]);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    expect(engine.isSandboxActive()).toBe(true);
    engine.endSandbox();
    expect(engine.isSandboxActive()).toBe(false);
    expect(engine.getSandboxState()).toBeNull();
  });

  it('handles malformed LLM signal response gracefully', async () => {
    const llm = createMockLLM(['annotation', 'not valid json at all']);
    const engine = createSandboxEngine({
      store, llm, personId: PERSON_ID, conceptIds: CONCEPTS.map((c) => c.id),
    });

    engine.startSandbox('tcp-basics');
    const result = await engine.runCode('console.log(1)');
    expect(result.signals).toHaveLength(0);
    expect(result.suggestion).toBeNull();
  });
});
