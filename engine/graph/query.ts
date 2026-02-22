// getGraph — returns the concept graph with optional trust state overlay.
// Supports filtering by conceptIds, optional BFS expansion via depth, and person trust overlay.

import type { GetGraphInput, GetGraphResult, TrustState } from '../types.js';
import type { Store } from '../store/interface.js';
import { getTrustState } from '../trust/query.js';

export function getGraph(
  store: Store,
  input: GetGraphInput
): GetGraphResult {
  let conceptIds: Set<string>;

  if (input.conceptIds && input.conceptIds.length > 0) {
    conceptIds = new Set(input.conceptIds);

    // BFS expansion if depth is specified.
    if (input.depth !== undefined && input.depth > 0) {
      let frontier = new Set(conceptIds);
      for (let d = 0; d < input.depth; d++) {
        const nextFrontier = new Set<string>();
        for (const id of frontier) {
          const edgesFrom = store.getEdgesFrom(id);
          const edgesTo = store.getEdgesTo(id);
          for (const edge of edgesFrom) {
            if (!conceptIds.has(edge.toConceptId)) {
              nextFrontier.add(edge.toConceptId);
              conceptIds.add(edge.toConceptId);
            }
          }
          for (const edge of edgesTo) {
            if (!conceptIds.has(edge.fromConceptId)) {
              nextFrontier.add(edge.fromConceptId);
              conceptIds.add(edge.fromConceptId);
            }
          }
        }
        frontier = nextFrontier;
        if (frontier.size === 0) break;
      }
    }
  } else {
    // No filter — return all concepts.
    const allNodes = store.getAllNodes();
    conceptIds = new Set(allNodes.map(n => n.id));
  }

  // Build concept list.
  const concepts: GetGraphResult['concepts'] = [];
  for (const id of conceptIds) {
    const node = store.getNode(id);
    if (!node) continue;

    let trustState: TrustState | undefined;
    if (input.personId) {
      trustState = getTrustState(store, {
        personId: input.personId,
        conceptId: id,
      });
    }

    concepts.push({
      id: node.id,
      name: node.name,
      description: node.description,
      ...(trustState ? { trustState } : {}),
    });
  }

  // Build edge list — include edges where both endpoints are in the result set.
  const allEdges = store.getAllEdges();
  const edges: GetGraphResult['edges'] = [];
  for (const edge of allEdges) {
    if (conceptIds.has(edge.fromConceptId) && conceptIds.has(edge.toConceptId)) {
      edges.push({
        from: edge.fromConceptId,
        to: edge.toConceptId,
        type: edge.type,
        inferenceStrength: edge.inferenceStrength,
      });
    }
  }

  return { concepts, edges };
}
