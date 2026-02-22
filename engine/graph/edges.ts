// Relationship edges with inference strength.
// Edges connect concepts and carry the weight of how strongly
// trust in one implies trust in another.

import type { RelationshipEdge } from '../types.js';
import type { Store } from '../store/interface.js';

export function createEdge(store: Store, edge: RelationshipEdge): RelationshipEdge {
  store.insertEdge(edge);
  return edge;
}

export function getEdge(store: Store, id: string): RelationshipEdge | null {
  return store.getEdge(id);
}

export function getEdgesFrom(store: Store, conceptId: string): RelationshipEdge[] {
  return store.getEdgesFrom(conceptId);
}

export function getEdgesTo(store: Store, conceptId: string): RelationshipEdge[] {
  return store.getEdgesTo(conceptId);
}

export function getConnectedConcepts(store: Store, conceptId: string): RelationshipEdge[] {
  return [...store.getEdgesFrom(conceptId), ...store.getEdgesTo(conceptId)];
}
