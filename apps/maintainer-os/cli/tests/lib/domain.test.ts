import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSQLiteStore } from '../../src/engine.js';
import { validateDomainPack, loadDomainPack } from '../../src/lib/domain.js';

const FIXTURE_PATH = resolve(import.meta.dirname, '../../fixtures/example-domain.json');

describe('validateDomainPack', () => {
  it('validates a well-formed domain pack', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    const { pack, errors } = validateDomainPack(raw);
    expect(errors).toHaveLength(0);
    expect(pack.concepts).toHaveLength(8);
    expect(pack.edges).toHaveLength(4);
    expect(pack.bundles).toBeDefined();
    expect(pack.mappings).toBeDefined();
  });

  it('rejects non-object input', () => {
    const { errors } = validateDomainPack('not an object');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('must be a JSON object');
  });

  it('rejects missing concepts array', () => {
    const { errors } = validateDomainPack({ edges: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('concepts');
  });

  it('rejects concepts without id', () => {
    const { errors } = validateDomainPack({ concepts: [{ name: 'no-id' }] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('missing or invalid "id"');
  });

  it('rejects edges referencing nonexistent concepts', () => {
    const { errors } = validateDomainPack({
      concepts: [{ id: 'a', name: 'A', description: '' }],
      edges: [{ from: 'a', to: 'ghost', type: 'prerequisite', inferenceStrength: 0.5 }],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"to" concept "ghost" not found');
  });

  it('defaults edge type and inferenceStrength when missing', () => {
    const { pack, errors } = validateDomainPack({
      concepts: [
        { id: 'a', name: 'A', description: '' },
        { id: 'b', name: 'B', description: '' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    });
    expect(errors).toHaveLength(0);
    expect(pack.edges[0]!.type).toBe('related_to');
    expect(pack.edges[0]!.inferenceStrength).toBe(0.5);
  });
});

describe('loadDomainPack', () => {
  it('loads example domain into store', () => {
    const store = createSQLiteStore(':memory:');
    try {
      const result = loadDomainPack(store, FIXTURE_PATH);
      expect(result.errors).toHaveLength(0);
      expect(result.loaded).toBe(8);
      expect(result.edgesCreated).toBe(4);

      // Verify concepts exist in store
      const nodes = store.getAllNodes();
      expect(nodes).toHaveLength(8);
      const ids = nodes.map((n) => n.id);
      expect(ids).toContain('auth-boundaries');
      expect(ids).toContain('incident-triage');

      // Verify edges exist in store
      const edges = store.getAllEdges();
      expect(edges).toHaveLength(4);
    } finally {
      store.close();
    }
  });

  it('returns errors for invalid domain file', () => {
    const store = createSQLiteStore(':memory:');
    try {
      // Create a temp file with invalid content
      const tmpPath = resolve(import.meta.dirname, '../../fixtures/test-invalid.json');
      writeFileSync(tmpPath, JSON.stringify({ notValid: true }));
      try {
        const result = loadDomainPack(store, tmpPath);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.loaded).toBe(0);
      } finally {
        rmSync(tmpPath, { force: true });
      }
    } finally {
      store.close();
    }
  });
});
