// Concept node type and basic operations.
// A concept node is a single unit of knowledge a person could demonstrate or fail to demonstrate.

import type { ConceptNode } from '../types.js';
import type { Store } from '../store/interface.js';

export function createNode(store: Store, node: ConceptNode): ConceptNode {
  store.insertNode(node);
  return node;
}

export function getNode(store: Store, id: string): ConceptNode | null {
  return store.getNode(id);
}

export function getAllNodes(store: Store): ConceptNode[] {
  return store.getAllNodes();
}

export function getDownstreamDependents(store: Store, conceptId: string): string[] {
  // Returns all concept IDs that depend on this concept (where this concept is a prerequisite).
  // Used for structural importance calculation in decay.
  return store.getDownstreamDependents(conceptId);
}
