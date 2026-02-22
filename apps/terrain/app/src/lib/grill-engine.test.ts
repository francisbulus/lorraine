import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { loadConcepts } from '@engine/graph/load';
import { recordVerification } from '@engine/trust/record';
import { getTrustState } from '@engine/trust/query';
import type { Store } from '@engine/store/interface';
import type { LLMProvider } from '@llm/types';
import {
  selectDifficultyAxis,
  selectGrillTarget,
  detectGrillRequest,
  interpretGrillResponse,
  createGrillEngine,
} from './grill-engine';

let store: Store;

const CONCEPTS = [
  { id: 'tcp-basics', name: 'TCP Basics', description: 'TCP fundamentals' },
  { id: 'tcp-handshake', name: 'TCP Handshake', description: 'Three-way handshake' },
  { id: 'dns-resolution', name: 'DNS Resolution', description: 'DNS lookup process' },
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

describe('selectDifficultyAxis', () => {
  it('returns recall when no grill modalities tested', () => {
    expect(selectDifficultyAxis([])).toBe('recall');
  });

  it('returns recall when only non-grill modalities tested', () => {
    expect(selectDifficultyAxis(['integrated:use'])).toBe('recall');
  });

  it('returns inference when recall tested', () => {
    expect(selectDifficultyAxis(['grill:recall'])).toBe('inference');
  });

  it('returns transfer when recall and inference tested', () => {
    expect(selectDifficultyAxis(['grill:recall', 'grill:inference'])).toBe('transfer');
  });

  it('returns discrimination when recall, inference, and transfer tested', () => {
    expect(
      selectDifficultyAxis(['grill:recall', 'grill:inference', 'grill:transfer'])
    ).toBe('discrimination');
  });
});

describe('selectGrillTarget', () => {
  it('prefers contested concepts', () => {
    // Create a contested state: demonstrated then failed.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'correct',
      source: 'internal',
    });
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:inference',
      result: 'failed',
      context: 'incorrect',
      source: 'internal',
    });

    const target = selectGrillTarget(store, PERSON_ID, CONCEPTS.map(c => c.id));
    expect(target).toBe('tcp-basics');
  });

  it('prefers untested concepts with claims over plain untested', () => {
    // Record a claim on dns-resolution but leave tcp concepts untouched.
    store.insertClaimEvent({
      id: 'claim-1',
      personId: PERSON_ID,
      conceptId: 'dns-resolution',
      selfReportedConfidence: 0.8,
      context: 'I know DNS',
      timestamp: Date.now(),
      retracted: false,
    });

    const target = selectGrillTarget(store, PERSON_ID, CONCEPTS.map(c => c.id));
    expect(target).toBe('dns-resolution');
  });

  it('returns first concept when all are equally untested', () => {
    const target = selectGrillTarget(store, PERSON_ID, CONCEPTS.map(c => c.id));
    // All untested with score=10, first one wins since it's checked first.
    expect(target).toBe('tcp-basics');
  });
});

describe('detectGrillRequest', () => {
  const ids = CONCEPTS.map(c => c.id);

  it('detects "test me" request', () => {
    const result = detectGrillRequest('test me on TCP', ids);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('person_requested');
  });

  it('detects "quiz me" request', () => {
    const result = detectGrillRequest('quiz me please', ids);
    expect(result).not.toBeNull();
  });

  it('detects "check my understanding" request', () => {
    const result = detectGrillRequest('can you check my understanding?', ids);
    expect(result).not.toBeNull();
  });

  it('detects "do I really know" request', () => {
    const result = detectGrillRequest('do I really know this stuff?', ids);
    expect(result).not.toBeNull();
  });

  it('returns null for normal conversation', () => {
    expect(detectGrillRequest('How does TCP work?', ids)).toBeNull();
    expect(detectGrillRequest('Tell me about DNS', ids)).toBeNull();
  });

  it('identifies concept from utterance when possible', () => {
    const result = detectGrillRequest('test me on tcp basics', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBe('tcp-basics');
  });

  it('returns null conceptId when concept not identifiable', () => {
    const result = detectGrillRequest('test me', ids);
    expect(result).not.toBeNull();
    expect(result!.conceptId).toBeNull();
  });
});

describe('interpretGrillResponse', () => {
  it('parses a demonstrated result', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        result: 'demonstrated',
        contestedDetected: false,
        implicitSignals: [],
      }),
    ]);

    const result = await interpretGrillResponse(
      llm,
      'What is the TCP handshake?',
      'It is a three-step process: SYN, SYN-ACK, ACK.',
      ['tcp-handshake']
    );
    expect(result.result).toBe('demonstrated');
    expect(result.contestedDetected).toBe(false);
  });

  it('parses a failed result', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        result: 'failed',
        contestedDetected: false,
        implicitSignals: [],
      }),
    ]);

    const result = await interpretGrillResponse(
      llm,
      'What is the TCP handshake?',
      'I have no idea.',
      ['tcp-handshake']
    );
    expect(result.result).toBe('failed');
  });

  it('detects contested state', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        result: 'partial',
        contestedDetected: true,
        implicitSignals: [],
      }),
    ]);

    const result = await interpretGrillResponse(
      llm,
      'Explain TCP reliability.',
      'TCP uses checksums but I think it is connectionless.',
      ['tcp-basics']
    );
    expect(result.contestedDetected).toBe(true);
  });

  it('captures implicit signals from interpretation', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        result: 'demonstrated',
        contestedDetected: false,
        implicitSignals: [{
          conceptId: 'tcp-handshake',
          signalType: 'correct_usage',
          confidence: 0.9,
          evidence: 'Correctly described the three-way handshake sequence',
        }],
      }),
    ]);

    const result = await interpretGrillResponse(
      llm,
      'What is the TCP handshake?',
      'SYN, SYN-ACK, ACK — a three-step connection establishment.',
      ['tcp-handshake']
    );
    expect(result.implicitSignals).toHaveLength(1);
    expect(result.implicitSignals[0].signalType).toBe('correct_usage');
  });

  it('filters signals for concepts not being tested', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        result: 'demonstrated',
        contestedDetected: false,
        implicitSignals: [{
          conceptId: 'unrelated-concept',
          signalType: 'correct_usage',
          confidence: 0.9,
          evidence: 'spurious signal',
        }],
      }),
    ]);

    const result = await interpretGrillResponse(
      llm,
      'What is TCP?',
      'TCP provides reliable delivery.',
      ['tcp-basics']
    );
    expect(result.implicitSignals).toHaveLength(0);
  });

  it('handles malformed LLM response', async () => {
    const llm = createMockLLM(['This is not JSON at all']);

    const result = await interpretGrillResponse(
      llm,
      'What is TCP?',
      'I dont know',
      ['tcp-basics']
    );
    expect(result.result).toBe('partial');
    expect(result.contestedDetected).toBe(false);
    expect(result.implicitSignals).toHaveLength(0);
  });
});

describe('createGrillEngine', () => {
  it('starts a grill and tracks pending state', async () => {
    const llm = createMockLLM([
      // generateVerification response
      JSON.stringify({
        type: 'grill_question',
        content: 'What does the SYN flag do in a TCP handshake?',
        expectedSignals: ['tcp-handshake'],
        conceptsTested: ['tcp-handshake'],
      }),
    ]);

    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    expect(engine.hasPendingGrill()).toBe(false);
    const pending = await engine.startGrill('tcp-handshake');
    expect(engine.hasPendingGrill()).toBe(true);
    expect(pending.question).toBe('What does the SYN flag do in a TCP handshake?');
    expect(pending.conceptsTested).toContain('tcp-handshake');
  });

  it('processes grill response and records verification', async () => {
    const llm = createMockLLM([
      // generateVerification
      JSON.stringify({
        type: 'grill_question',
        content: 'What is the TCP handshake?',
        expectedSignals: ['tcp-handshake'],
        conceptsTested: ['tcp-handshake'],
      }),
      // interpretGrillResponse
      JSON.stringify({
        result: 'demonstrated',
        contestedDetected: false,
        implicitSignals: [],
      }),
    ]);

    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await engine.startGrill('tcp-handshake');
    const result = await engine.processGrillResponse('SYN, SYN-ACK, ACK');

    expect(result.result).toBe('demonstrated');
    expect(result.trustUpdates).toHaveLength(1);
    expect(result.trustUpdates[0].conceptId).toBe('tcp-handshake');
    expect(result.trustUpdates[0].newLevel).toBe('verified');

    // Verify the event was written to core.
    const ts = getTrustState(store, { personId: PERSON_ID, conceptId: 'tcp-handshake' });
    expect(ts.verificationHistory).toHaveLength(1);
    expect(ts.verificationHistory[0].result).toBe('demonstrated');
  });

  it('records failed grill result to core', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        type: 'grill_question',
        content: 'What is TCP?',
        expectedSignals: ['tcp-basics'],
        conceptsTested: ['tcp-basics'],
      }),
      JSON.stringify({
        result: 'failed',
        contestedDetected: false,
        implicitSignals: [],
      }),
    ]);

    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await engine.startGrill('tcp-basics');
    const result = await engine.processGrillResponse('I have no idea');

    expect(result.result).toBe('failed');
    const ts = getTrustState(store, { personId: PERSON_ID, conceptId: 'tcp-basics' });
    expect(ts.verificationHistory).toHaveLength(1);
    expect(ts.verificationHistory[0].result).toBe('failed');
  });

  it('clears pending grill after processing', async () => {
    const llm = createMockLLM([
      JSON.stringify({
        type: 'grill_question',
        content: 'Question?',
        expectedSignals: [],
        conceptsTested: ['tcp-basics'],
      }),
      JSON.stringify({ result: 'partial', contestedDetected: false, implicitSignals: [] }),
    ]);

    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await engine.startGrill('tcp-basics');
    expect(engine.hasPendingGrill()).toBe(true);
    await engine.processGrillResponse('some answer');
    expect(engine.hasPendingGrill()).toBe(false);
  });

  it('throws when processing response without pending grill', async () => {
    const llm = createMockLLM([]);
    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await expect(engine.processGrillResponse('answer')).rejects.toThrow('No pending grill');
  });

  it('uses correct modality based on difficulty axis', async () => {
    // First verify recall so axis will be inference.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'recall test',
      source: 'internal',
    });

    const llm = createMockLLM([
      JSON.stringify({
        type: 'grill_question',
        content: 'Infer something.',
        expectedSignals: [],
        conceptsTested: ['tcp-basics'],
      }),
      JSON.stringify({ result: 'demonstrated', contestedDetected: false, implicitSignals: [] }),
    ]);

    const engine = createGrillEngine({
      store, llm, personId: PERSON_ID,
      conceptIds: CONCEPTS.map(c => c.id),
    });

    await engine.startGrill('tcp-basics');
    expect(engine.getPendingGrill()!.difficultyAxis).toBe('inference');

    await engine.processGrillResponse('good answer');

    const ts = getTrustState(store, { personId: PERSON_ID, conceptId: 'tcp-basics' });
    // Should have 2 events: the recall one we set up + the inference one from grill.
    expect(ts.verificationHistory).toHaveLength(2);
    const grillEvent = ts.verificationHistory.find(e => e.modality === 'grill:inference');
    expect(grillEvent).toBeDefined();
  });
});
