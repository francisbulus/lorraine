import { describe, it, expect } from 'vitest';

describe('engine imports', () => {
  it('imports core types', async () => {
    const engine = await import('@engine/types');
    expect(engine.MODALITY_STRENGTH).toBeDefined();
    expect(engine.MODALITY_STRENGTH['grill:recall']).toBe(0.3);
  });

  it('imports core functions', async () => {
    const { createSQLiteStore } = await import('@engine/store/sqlite');
    expect(typeof createSQLiteStore).toBe('function');
  });

  it('imports trust APIs', async () => {
    const { recordVerification } = await import('@engine/trust/record');
    const { getTrustState } = await import('@engine/trust/query');
    expect(typeof recordVerification).toBe('function');
    expect(typeof getTrustState).toBe('function');
  });

  it('imports graph APIs', async () => {
    const { loadConcepts } = await import('@engine/graph/load');
    const { getGraph } = await import('@engine/graph/query');
    expect(typeof loadConcepts).toBe('function');
    expect(typeof getGraph).toBe('function');
  });

  it('imports services layer', async () => {
    const { generateVerification } = await import('@engine-services/generateVerification');
    const { interpretResponse } = await import('@engine-services/interpretResponse');
    const { extractImplicitSignals } = await import('@engine-services/extractImplicitSignals');
    expect(typeof generateVerification).toBe('function');
    expect(typeof interpretResponse).toBe('function');
    expect(typeof extractImplicitSignals).toBe('function');
  });

  it('imports LLM provider', async () => {
    const { createAnthropicProvider } = await import('@llm/anthropic');
    expect(typeof createAnthropicProvider).toBe('function');
  });
});
