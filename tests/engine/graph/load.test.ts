// Test: loadConcepts ingests domain packages with validation.

import { describe, it, expect, afterEach } from 'vitest';
import { createSQLiteStore } from '../../../engine/store/sqlite.js';
import { loadConcepts } from '../../../engine/graph/load.js';
import type { Store } from '../../../engine/store/interface.js';

let store: Store;

afterEach(() => {
  store?.close();
});

describe('loadConcepts', () => {
  it('loads concepts and edges into the graph', () => {
    store = createSQLiteStore(':memory:');

    const result = loadConcepts(store, {
      concepts: [
        { id: 'c1', name: 'Variables', description: 'Programming basics: variables and assignment' },
        { id: 'c2', name: 'Functions', description: 'Programming basics: function definition and calls' },
        { id: 'c3', name: 'Closures', description: 'Advanced: lexical closures' },
      ],
      edges: [
        { from: 'c1', to: 'c2', type: 'prerequisite', inferenceStrength: 0.8 },
        { from: 'c2', to: 'c3', type: 'prerequisite', inferenceStrength: 0.7 },
      ],
    });

    expect(result.loaded).toBe(3);
    expect(result.edgesCreated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('verifies concepts are retrievable after loading', () => {
    store = createSQLiteStore(':memory:');

    loadConcepts(store, {
      concepts: [
        { id: 'c1', name: 'Variables', description: 'Variables and assignment' },
      ],
      edges: [],
    });

    const node = store.getNode('c1');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('Variables');
    expect(node!.description).toBe('Variables and assignment');
  });

  it('rejects edges with dangling source reference', () => {
    store = createSQLiteStore(':memory:');

    const result = loadConcepts(store, {
      concepts: [
        { id: 'c1', name: 'Variables', description: 'Variables' },
      ],
      edges: [
        { from: 'nonexistent', to: 'c1', type: 'prerequisite', inferenceStrength: 0.8 },
      ],
    });

    expect(result.loaded).toBe(0);
    expect(result.edgesCreated).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('nonexistent');
  });

  it('rejects edges with dangling target reference', () => {
    store = createSQLiteStore(':memory:');

    const result = loadConcepts(store, {
      concepts: [
        { id: 'c1', name: 'Variables', description: 'Variables' },
      ],
      edges: [
        { from: 'c1', to: 'nonexistent', type: 'related_to', inferenceStrength: 0.5 },
      ],
    });

    expect(result.loaded).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('nonexistent');
  });

  it('allows edges referencing pre-existing concepts in the store', () => {
    store = createSQLiteStore(':memory:');

    // Pre-load a concept.
    loadConcepts(store, {
      concepts: [{ id: 'existing', name: 'Existing', description: 'Already in store' }],
      edges: [],
    });

    // Load new concepts with edges to the existing one.
    const result = loadConcepts(store, {
      concepts: [{ id: 'new1', name: 'New', description: 'New concept' }],
      edges: [
        { from: 'existing', to: 'new1', type: 'prerequisite', inferenceStrength: 0.6 },
      ],
    });

    expect(result.loaded).toBe(1);
    expect(result.edgesCreated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('handles empty input gracefully', () => {
    store = createSQLiteStore(':memory:');

    const result = loadConcepts(store, {
      concepts: [],
      edges: [],
    });

    expect(result.loaded).toBe(0);
    expect(result.edgesCreated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
