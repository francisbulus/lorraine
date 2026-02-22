// loadConcepts — ingests domain packages into the concept graph.
// Validates that all edge references point to concepts in the batch or already in the store.

import type { LoadConceptsInput, LoadConceptsResult, EdgeType } from '../types.js';
import type { Store } from '../store/interface.js';

export function loadConcepts(
  store: Store,
  input: LoadConceptsInput
): LoadConceptsResult {
  const errors: string[] = [];
  let loaded = 0;
  let edgesCreated = 0;

  // Build a set of concept IDs that will exist after loading.
  const incomingIds = new Set(input.concepts.map(c => c.id));

  // Validate edges: check for dangling references.
  for (const edge of input.edges) {
    const fromExists = incomingIds.has(edge.from) || store.getNode(edge.from) !== null;
    const toExists = incomingIds.has(edge.to) || store.getNode(edge.to) !== null;

    if (!fromExists) {
      errors.push(`Edge from "${edge.from}" to "${edge.to}": source concept "${edge.from}" not found`);
    }
    if (!toExists) {
      errors.push(`Edge from "${edge.from}" to "${edge.to}": target concept "${edge.to}" not found`);
    }
  }

  // If there are validation errors, return early without loading.
  if (errors.length > 0) {
    return { loaded: 0, edgesCreated: 0, errors };
  }

  // Insert concepts.
  for (const concept of input.concepts) {
    store.insertNode({
      id: concept.id,
      name: concept.name,
      description: concept.description,
    });
    loaded++;
  }

  // Insert edges.
  for (const edge of input.edges) {
    const edgeId = `edge_${edge.from}_${edge.to}_${Math.random().toString(36).slice(2, 8)}`;
    store.insertEdge({
      id: edgeId,
      fromConceptId: edge.from,
      toConceptId: edge.to,
      type: edge.type,
      inferenceStrength: edge.inferenceStrength,
    });
    edgesCreated++;
  }

  return { loaded, edgesCreated, errors };
}
