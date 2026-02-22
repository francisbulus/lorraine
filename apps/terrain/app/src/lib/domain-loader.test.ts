import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { getGraph } from '@engine/graph/query';
import type { Store } from '@engine/store/interface';
import { loadDomain } from './domain-loader';
import type { DomainPackage } from './domain-loader';
import networkingDomain from '@domains/networking.json';

let store: Store;

beforeEach(() => {
  store = createSQLiteStore(':memory:');
});

afterEach(() => {
  store.close();
});

const domain = networkingDomain as unknown as DomainPackage;

describe('networking domain', () => {
  it('loads with zero errors', () => {
    const result = loadDomain(store, domain);
    expect(result.errors).toEqual([]);
    expect(result.loaded).toBe(domain.concepts.length);
    expect(result.edgesCreated).toBe(domain.edges.length);
  });

  it('loads all 19 concepts', () => {
    loadDomain(store, domain);
    expect(domain.concepts.length).toBe(19);
    const graph = getGraph(store, {});
    expect(graph.concepts.length).toBe(19);
  });

  it('loads all 26 edges', () => {
    loadDomain(store, domain);
    expect(domain.edges.length).toBe(26);
    const graph = getGraph(store, {});
    expect(graph.edges.length).toBe(26);
  });

  it('every concept has an id, name, and description', () => {
    for (const concept of domain.concepts) {
      expect(concept.id).toBeTruthy();
      expect(concept.name).toBeTruthy();
      expect(concept.description).toBeTruthy();
    }
  });

  it('every edge references existing concepts', () => {
    const conceptIds = new Set(domain.concepts.map(c => c.id));
    for (const edge of domain.edges) {
      expect(conceptIds.has(edge.from)).toBe(true);
      expect(conceptIds.has(edge.to)).toBe(true);
    }
  });

  it('every edge has a valid type', () => {
    const validTypes = ['prerequisite', 'component_of', 'related_to'];
    for (const edge of domain.edges) {
      expect(validTypes).toContain(edge.type);
    }
  });

  it('inference strengths are between 0 and 1', () => {
    for (const edge of domain.edges) {
      expect(edge.inferenceStrength).toBeGreaterThan(0);
      expect(edge.inferenceStrength).toBeLessThanOrEqual(1);
    }
  });
});

describe('territories', () => {
  it('defines at least 4 territories', () => {
    expect(domain.territories.length).toBeGreaterThanOrEqual(4);
  });

  it('includes TCP Reliability, DNS Resolution, HTTP Fundamentals, TCP Advanced', () => {
    const names = domain.territories.map(t => t.name);
    expect(names).toContain('TCP Reliability');
    expect(names).toContain('DNS Resolution');
    expect(names).toContain('HTTP Fundamentals');
    expect(names).toContain('TCP Advanced');
  });

  it('every territory concept exists in the domain', () => {
    const conceptIds = new Set(domain.concepts.map(c => c.id));
    for (const territory of domain.territories) {
      for (const cid of territory.conceptIds) {
        expect(conceptIds.has(cid)).toBe(true);
      }
    }
  });

  it('every concept belongs to at least one territory', () => {
    const assignedConcepts = new Set(
      domain.territories.flatMap(t => t.conceptIds)
    );
    for (const concept of domain.concepts) {
      expect(assignedConcepts.has(concept.id)).toBe(true);
    }
  });
});

describe('thresholds', () => {
  it('defines thresholds between territories', () => {
    expect(domain.thresholds.length).toBeGreaterThan(0);
  });

  it('threshold from/to reference existing territory ids', () => {
    const territoryIds = new Set(domain.territories.map(t => t.id));
    for (const threshold of domain.thresholds) {
      expect(territoryIds.has(threshold.from)).toBe(true);
      expect(territoryIds.has(threshold.to)).toBe(true);
    }
  });

  it('readiness criteria reference existing concepts', () => {
    const conceptIds = new Set(domain.concepts.map(c => c.id));
    for (const threshold of domain.thresholds) {
      for (const cid of threshold.readinessCriteria.conceptIds) {
        expect(conceptIds.has(cid)).toBe(true);
      }
    }
  });

  it('readiness criteria use valid minimum levels', () => {
    for (const threshold of domain.thresholds) {
      expect(['verified', 'inferred']).toContain(
        threshold.readinessCriteria.minimumLevel
      );
    }
  });
});

describe('graph queries after load', () => {
  beforeEach(() => {
    loadDomain(store, domain);
  });

  it('can query a subgraph around tcp-basics', () => {
    const graph = getGraph(store, {
      conceptIds: ['tcp-basics'],
      depth: 1,
    });
    expect(graph.concepts.length).toBeGreaterThan(1);
    const ids = graph.concepts.map(c => c.id);
    expect(ids).toContain('tcp-basics');
    expect(ids).toContain('tcp-handshake');
  });

  it('can query the full graph', () => {
    const graph = getGraph(store, {});
    expect(graph.concepts.length).toBe(19);
    expect(graph.edges.length).toBe(26);
  });
});
