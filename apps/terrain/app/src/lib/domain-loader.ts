import type { Store } from '@engine/store/interface';
import type { LoadConceptsResult, EdgeType } from '@engine/types';
import { loadConcepts } from '@engine/graph/load';

export interface DomainConcept {
  id: string;
  name: string;
  description: string;
}

export interface DomainEdge {
  from: string;
  to: string;
  type: EdgeType;
  inferenceStrength: number;
}

export interface Territory {
  id: string;
  name: string;
  conceptIds: string[];
}

export interface Threshold {
  id: string;
  from: string;
  to: string;
  readinessCriteria: {
    conceptIds: string[];
    minimumLevel: 'verified' | 'inferred';
  };
}

export interface DomainPackage {
  id: string;
  name: string;
  version: string;
  concepts: DomainConcept[];
  edges: DomainEdge[];
  territories: Territory[];
  thresholds: Threshold[];
}

export function loadDomain(
  store: Store,
  domain: DomainPackage
): LoadConceptsResult {
  return loadConcepts(store, {
    concepts: domain.concepts,
    edges: domain.edges,
  });
}
