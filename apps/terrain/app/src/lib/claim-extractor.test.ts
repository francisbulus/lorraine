import { describe, it, expect } from 'vitest';
import { extractClaims } from './claim-extractor';
import type { LLMProvider } from '@llm/types';

function createMockLLM(response: string): LLMProvider {
  return {
    complete: async () => ({ content: response }),
  };
}

const CONCEPTS = ['tcp-basics', 'tcp-handshake', 'dns-resolution'];

describe('claim extractor', () => {
  it('extracts a high-confidence claim', async () => {
    const llm = createMockLLM(JSON.stringify({
      claims: [{
        conceptId: 'tcp-basics',
        selfReportedConfidence: 0.9,
        context: 'I know TCP basics well',
      }],
    }));
    const claims = await extractClaims(llm, 'I know TCP basics well', CONCEPTS);
    expect(claims).toHaveLength(1);
    expect(claims[0].conceptId).toBe('tcp-basics');
    expect(claims[0].selfReportedConfidence).toBe(0.9);
  });

  it('extracts a low-confidence claim', async () => {
    const llm = createMockLLM(JSON.stringify({
      claims: [{
        conceptId: 'dns-resolution',
        selfReportedConfidence: 0.1,
        context: "I don't understand DNS at all",
      }],
    }));
    const claims = await extractClaims(llm, "I don't understand DNS at all", CONCEPTS);
    expect(claims).toHaveLength(1);
    expect(claims[0].selfReportedConfidence).toBe(0.1);
  });

  it('returns empty for no claims', async () => {
    const llm = createMockLLM(JSON.stringify({ claims: [] }));
    const claims = await extractClaims(llm, 'How does TCP work?', CONCEPTS);
    expect(claims).toHaveLength(0);
  });

  it('filters claims for unknown concepts', async () => {
    const llm = createMockLLM(JSON.stringify({
      claims: [{
        conceptId: 'unknown-concept',
        selfReportedConfidence: 0.8,
        context: 'I know this',
      }],
    }));
    const claims = await extractClaims(llm, 'I know this', CONCEPTS);
    expect(claims).toHaveLength(0);
  });

  it('clamps confidence to 0-1 range', async () => {
    const llm = createMockLLM(JSON.stringify({
      claims: [{
        conceptId: 'tcp-basics',
        selfReportedConfidence: 1.5,
        context: 'I definitely know this',
      }],
    }));
    const claims = await extractClaims(llm, 'I definitely know this', CONCEPTS);
    expect(claims[0].selfReportedConfidence).toBe(1);
  });

  it('handles malformed LLM response gracefully', async () => {
    const llm = createMockLLM('This is not JSON');
    const claims = await extractClaims(llm, 'I know TCP', CONCEPTS);
    expect(claims).toHaveLength(0);
  });
});
