# Lorraine: Scope Invalidation

**Version:** 0.1<br>
**Last Updated:** March 1, 2026

This document describes how the engine determines which trust state needs recomputing when events or structure change. The implementation spans `engine/trust/projector.ts`, `engine/trust/record.ts`, and `engine/trust/retract.ts`.

For the full consistency model, see `docs/derived-state-consistency.md`.
For how recomputation works once a scope is identified, see `docs/engine-projector.md`.

---

## 1. Purpose

When something changes (a new event, a retraction, a graph edit, a model update), the engine must decide which cached trust state is affected. Recomputing everything is correct but expensive. Recomputing nothing is fast but wrong. Scope invalidation finds the minimum set of concepts that must be recomputed to keep the cache consistent.

---

## 2. Scope Types

### 2.1 Component scope

A connected component is the set of all concepts reachable from an anchor concept through any chain of edges, traversed in both directions. If concept A has an edge to concept B, and concept B has an edge to concept C, then A, B, and C are all in the same connected component regardless of edge direction.

Component scope is used when a change could have propagated trust through the graph. Because propagation follows edges, the connected component is the maximum set of concepts that could have been affected.

### 2.2 Concept scope

A single concept. Used when a change cannot have propagated (e.g., claim retraction, since claims do not propagate through the graph).

---

## 3. Invalidation Rules by Event Type

### 3.1 Verification event recorded

**Scope:** component containing the verified concept, for the person.

**Why component:** A verification event triggers propagation. Trust inferred from this event flows outward through graph edges. Any concept in the connected component could have its inferred trust changed by this event.

**What happens:** The write path inserts the event and enqueues a component-scoped projection job in one transaction. The projector then replays all events for all concepts in the component, recomputes direct trust, runs propagation, and writes the results.

### 3.2 Claim event recorded

**Scope:** concept only.

Claims are not evidence and do not propagate. They affect only the calibration gap for the specific concept. No projection is triggered because claims do not change trust level or confidence.

### 3.3 Verification retracted

**Scope:** component containing the retracted event's concept, for the person.

**Why component:** The original verification event may have produced inferred trust in downstream concepts through propagation. Retracting the event removes that propagation source. Only a full component recompute correctly removes all downstream inferences that depended on the retracted event.

**What happens:** The retraction path marks the event as retracted, records the retraction, and enqueues a component-scoped projection job in one transaction. The projector replays from scratch, now excluding the retracted event. Trust state that depended on the retracted event is recalculated or removed.

### 3.4 Claim retracted

**Scope:** concept only.

Claims do not propagate, so retracting a claim affects only the specific concept's calibration gap. The retraction path uses concept scope.

---

## 4. Invalidation Rules for Structural Changes

### 4.1 Graph changes (edges added or removed)

When edges change, connected components can split or merge. Propagation paths change. Trust that was previously inferred through a now-removed edge should no longer exist. Trust that could propagate through a newly added edge should now flow.

**Current approach:** Bump the global `graph_version`. This invalidates all cached trust state because every snapshot's `graphVersion` field will mismatch the new global version. Freshness checks will detect the mismatch and trigger recomputation.

**Future optimization:** Track graph changes at the component level. Only invalidate scopes in components whose edges actually changed. This reduces the recompute blast radius as the graph grows.

### 4.2 Model version changes

When scoring constants or propagation rules change (e.g., a modality strength is adjusted, the propagation attenuation factor changes), all previously computed trust state was derived under different rules.

**Action:** Bump `modelVersion`. All cached snapshots become stale. Strict reads trigger recomputation under the new rules. A background rebuild job can recompute all scopes proactively.

### 4.3 Modality taxonomy changes

When modalities are renamed or reclassified (e.g., splitting a modality into two, or changing a modality's strength category), cached modality sets and strength-based calculations become inconsistent.

**Action:** Bump `modalityTaxonomyVersion`. All cached snapshots become stale. Same recompute pattern as model version changes.

---

## 5. Version Tracking

Each cached trust state snapshot carries three version fields:

| Field | What it tracks | When it's bumped |
|---|---|---|
| `graphVersion` | Graph edge structure | Edge added, removed, or modified |
| `modelVersion` | Scoring and propagation constants | Any change to `MODALITY_STRENGTH`, `PROPAGATION_ATTENUATION`, `CROSS_MODALITY_CONFIDENCE_BONUS`, etc. |
| `modalityTaxonomyVersion` | Modality definitions | Modality renamed, added, removed, or reclassified |

These versions are stored as global metadata in the store (`getVersionMetadata()`) and stamped onto every snapshot during projection. Freshness detection compares the snapshot's versions against the current global versions.

---

## 6. Event Sequence Tracking

Every event gets a monotonically increasing `eventSeq` from `store.reserveEventSeq()`. This provides a total order across all event types (verifications, claims, retractions).

Each projection scope has a checkpoint (`projection_checkpoints` table) that records the `lastProjectedEventSeq` for that scope. Freshness detection compares:

- The checkpoint's `lastProjectedEventSeq` against the scope's latest event sequence (`getLatestEventSeqForScope`).
- Each snapshot's `derivedFromEventSeq` against the scope's latest event sequence.

If either is behind, the scope is stale and needs recomputation.

---

## 7. Freshness Detection in Detail

`getScopeFreshness` checks six conditions. If any condition is true, the scope is stale:

1. **checkpoint_behind_scope**: The projection checkpoint is behind the latest event sequence for the scope's concepts.
2. **snapshot_behind_scope**: The target concept's snapshot was derived from an older event sequence than what currently exists.
3. **scope_snapshot_behind_scope**: Any snapshot in the scope (not just the target) was derived from an older event sequence.
4. **missing_scope_snapshots**: The scope has events but no snapshots at all.
5. **graph_version_mismatch**: Any snapshot in the scope was computed under a different graph version.
6. **model_version_mismatch**: The target snapshot was computed under a different model version.
7. **modality_taxonomy_version_mismatch**: The target snapshot was computed under a different modality taxonomy version.
8. **scope_version_mismatch**: Any snapshot in the scope has any version mismatch.

The `staleReasons` array on the result explains exactly which conditions triggered staleness. This is surfaced in the `cacheStatus` field on `TrustState` responses, making staleness transparent to callers.

---

## 8. Connected Component BFS

The BFS in `getConnectedComponentConceptIds` is the key to scope resolution:

```
Input:  anchor concept ID
Output: sorted, deduplicated list of all concept IDs in the connected component

Algorithm:
  1. Initialize visited = {}, queue = [anchor]
  2. While queue is not empty:
     a. Dequeue current concept
     b. Skip if already visited
     c. Mark as visited
     d. Enqueue all targets of outgoing edges (getEdgesFrom)
     e. Enqueue all sources of incoming edges (getEdgesTo)
  3. Return sorted list of visited concept IDs
```

Both edge directions are traversed because trust propagation flows forward through edges, but a verification on concept B can still affect concept A if A has an edge to B. The connected component captures all concepts that share any propagation pathway.

---

## 9. Transaction Boundaries

The engine enforces a two-phase write pattern:

**Phase 1 (transactional):** Event insert + projection job enqueue happen in one database transaction. If either fails, neither is committed. This guarantees that no event exists without a corresponding projection job.

**Phase 2 (non-transactional):** Projection runs after the transaction commits. The projector's own writes (snapshot upserts, checkpoint update, job completion) happen in a separate transaction internal to `projectScope`.

If the process crashes between phase 1 and phase 2, the projection job remains in the queue. A recovery process can pick up unprocessed jobs and run the projector. Because the projector is idempotent, replaying a projection that partially completed is safe.

---

## 10. Practical Implications

**Adding an edge between two previously disconnected components:** Both components merge into one larger connected component. The next projection for any concept in the merged component will include all concepts from both former components. Previously isolated trust state may now propagate across the new edge.

**Removing an edge that splits a component:** One component becomes two. Future projections for a concept in one half will no longer include concepts from the other half. Inferred trust that depended on the removed edge will be cleared on the next projection.

**Retracting the only verification event for a concept:** The projector replays with no events for that concept. The concept returns to `untested`. Any downstream concepts that were inferred solely from this event also lose their inferred trust.

**Bulk event ingest:** Each event triggers a component-scoped projection. If many events land in the same component, each projection replays an incrementally larger event set. This is correct but potentially redundant. A future optimization could batch projection jobs for the same scope and run a single replay after all events are ingested.
