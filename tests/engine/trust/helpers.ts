// Shared test helpers — builds a five-node prerequisite chain for testing trust math.
//
// The chain:  A → B → C → D → E
// A is the most foundational. E depends on everything before it.
// Each edge has inference_strength = 0.8 (strong prerequisite relationship).

import { createSQLiteStore } from '../../../engine/store/sqlite.js';
import { createNode } from '../../../engine/graph/nodes.js';
import { createEdge } from '../../../engine/graph/edges.js';
import type { Store } from '../../../engine/store/interface.js';

export const LEARNER_ID = 'learner_ade';

export const CONCEPTS = {
  A: { id: 'concept_a', name: 'Reliable Delivery', domain: 'networking', territory: 'tcp-fundamentals' },
  B: { id: 'concept_b', name: 'TCP Handshake', domain: 'networking', territory: 'tcp-fundamentals' },
  C: { id: 'concept_c', name: 'Sequence Numbers', domain: 'networking', territory: 'tcp-reliability' },
  D: { id: 'concept_d', name: 'Retransmission', domain: 'networking', territory: 'tcp-reliability' },
  E: { id: 'concept_e', name: 'Congestion Control', domain: 'networking', territory: 'tcp-advanced' },
} as const;

export function createTestGraph(): Store {
  const store = createSQLiteStore(':memory:');

  // Insert nodes.
  for (const concept of Object.values(CONCEPTS)) {
    createNode(store, concept);
  }

  // Create prerequisite chain: A → B → C → D → E
  const edges = [
    { id: 'edge_ab', fromConceptId: CONCEPTS.A.id, toConceptId: CONCEPTS.B.id, type: 'prerequisite' as const, inferenceStrength: 0.8 },
    { id: 'edge_bc', fromConceptId: CONCEPTS.B.id, toConceptId: CONCEPTS.C.id, type: 'prerequisite' as const, inferenceStrength: 0.8 },
    { id: 'edge_cd', fromConceptId: CONCEPTS.C.id, toConceptId: CONCEPTS.D.id, type: 'prerequisite' as const, inferenceStrength: 0.8 },
    { id: 'edge_de', fromConceptId: CONCEPTS.D.id, toConceptId: CONCEPTS.E.id, type: 'prerequisite' as const, inferenceStrength: 0.8 },
  ];

  for (const edge of edges) {
    createEdge(store, edge);
  }

  return store;
}
