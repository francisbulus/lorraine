# Lorraine: Projector Architecture

**Version:** 0.1<br>
**Last Updated:** March 1, 2026

This document describes how the engine keeps materialized trust state in sync with the event log. The implementation lives in `engine/trust/projector.ts`, with write-path integration in `engine/trust/record.ts` and `engine/trust/retract.ts`.

For the consistency model and drift prevention spec, see `docs/derived-state-consistency.md`.

---

## 1. Purpose

The event log is the source of truth. The `trust_states` table is a materialized cache for read performance. The projector is the only writer to `trust_states`. It replays events from the log, recomputes trust using the scoring algorithm, propagates inferences across the graph, and writes the results atomically.

---

## 2. Architecture Overview

```
Event arrives
  │
  ▼
┌────────────────────────────┐
│  Transaction boundary      │
│  1. Reserve event sequence │
│  2. Insert event           │
│  3. Enqueue projection job │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Projector                 │
│  1. Resolve scope          │
│  2. Load all events        │
│  3. Replay in order        │
│  4. Score + propagate      │
│  5. Write snapshots        │
│  6. Update checkpoint      │
└────────────────────────────┘
```

The write path has two phases. Phase 1 (event insert + job enqueue) runs inside a single database transaction. Phase 2 (projection) runs after the transaction commits. This separation guarantees that no event can be written without a corresponding projection job, while keeping the transaction short.

---

## 3. Projection Scope

Every projection operates on a scope: a set of concepts for a person.

### 3.1 Scope types

- **component**: the connected component of the concept graph that contains the anchor concept. Found by BFS traversal of edges in both directions (outgoing and incoming). This is the scope used for verification events and verification retractions.
- **concept**: a single concept. This is the scope used for claim retractions.

### 3.2 Scope key

Each scope has a deterministic key:

```
scope:component:person:alice:concepts:auth-boundaries|cache-coherency|tcp-acks
```

The key encodes the scope type, person, and sorted concept list. Projection checkpoints and jobs are keyed by this string.

### 3.3 Connected component discovery

`getConnectedComponentConceptIds(store, anchorConceptId)` performs BFS from the anchor concept:

1. Start with the anchor in the queue.
2. For each concept, follow outgoing edges (`getEdgesFrom`) and incoming edges (`getEdgesTo`).
3. Add unvisited neighbors to the queue.
4. Continue until the queue is empty.
5. Return all visited concept IDs, sorted and deduplicated.

This finds every concept reachable from the anchor through any chain of edges, regardless of direction. Graph changes (adding or removing edges) can change the composition of connected components.

---

## 4. Event Replay

The projector replays events deterministically:

1. **Collect events.** For each concept in the scope, load the full verification history from the store. This returns only non-retracted events.
2. **Sort.** All events across all concepts in the scope are sorted by: (a) timestamp ascending, (b) event sequence ascending, (c) event ID lexicographic ascending. This total order is deterministic.
3. **Initialize.** Create a mutable trust state for each concept in the scope, initialized to `untested` with confidence 0.
4. **Replay.** For each event in sorted order:
   - Append the event to the running history for its concept.
   - Call `computeTrustFromHistory` with the accumulated history and the current state.
   - Update the mutable state (level, confidence, lastVerified, modalitiesTested).
   - Run in-memory propagation from the event's concept outward through the graph.

This replay reconstructs the exact trust state that would result from processing every event sequentially. Because the sort order is deterministic and `computeTrustFromHistory` is a pure function, the same events always produce the same result.

---

## 5. In-Memory Propagation

After each event is scored, the projector propagates its implications through the graph. This happens in memory, not through the store.

### 5.1 Signal computation

The base propagation signal depends on the event result:

- **demonstrated**: source confidence + cross-modality bonus
- **partial**: source confidence * 0.5 + cross-modality bonus
- **failed**: source confidence * `FAILURE_PROPAGATION_MULTIPLIER` (1.5)

### 5.2 BFS propagation

From the source concept, follow outgoing edges:

```
attenuatedSignal = signalStrength
                   * edge.inferenceStrength
                   * PROPAGATION_ATTENUATION^(depth - 1)
```

At each hop:
- `edge.inferenceStrength` is the weight on the graph edge (0.0 to 1.0).
- `PROPAGATION_ATTENUATION` (0.5) reduces the signal by half per additional hop.
- If `attenuatedSignal < PROPAGATION_THRESHOLD` (0.05), propagation stops on that path.

### 5.3 State updates during propagation

For success propagation (demonstrated or partial):
- The target concept's confidence becomes the maximum of its current confidence and the attenuated signal.
- If the target was `untested` or `inferred`, it becomes `inferred`.
- The source concept ID is added to the target's `inferredFrom` set.

For failure propagation:
- The target concept's confidence is reduced by the attenuated signal.
- If the target was `verified` and its confidence dropped, it becomes `contested`.
- If the target was `inferred` and its confidence drops to 0, it becomes `untested`.

### 5.4 Scope boundary

Propagation only affects concepts within the resolved scope. If a BFS step reaches a concept outside the `allowedConcepts` set, that path is skipped. This prevents a projection from modifying trust state outside its scope.

---

## 6. Atomic Write

After replay and propagation complete, the projector writes results in a single transaction:

```typescript
store.withTransaction(() => {
  store.deleteTrustStatesForConcepts(scope.personId, scope.conceptIds);

  for (const state of finalRows.values()) {
    store.upsertTrustState(state);
  }

  store.upsertProjectionCheckpoint(scope.scopeKey, scopeEventSeq, now);
  store.markProjectionJobsCompleted(scope.scopeKey, scopeEventSeq);
});
```

This delete-then-insert pattern ensures that:
- Concepts that lost all evidence (e.g., all events retracted) are cleaned up.
- The checkpoint and job completion happen atomically with the state writes.
- No partial state is visible to readers.

Each written snapshot includes version metadata:

- `derivedFromEventSeq`: the highest event sequence number included in the projection.
- `graphVersion`: current graph version at projection time.
- `modelVersion`: current model version at projection time.
- `modalityTaxonomyVersion`: current modality taxonomy version at projection time.
- `computedAt`: wall clock time of the projection.

---

## 7. Freshness Detection

`getScopeFreshness` checks whether a scope's cached state is current. It compares:

1. **Checkpoint vs scope events.** If the projection checkpoint is behind the latest event sequence for the scope, events have been written but not yet projected.
2. **Snapshot vs scope events.** If any snapshot's `derivedFromEventSeq` is behind the scope's latest event, the snapshot is stale.
3. **Version mismatches.** If any snapshot's `graphVersion`, `modelVersion`, or `modalityTaxonomyVersion` differs from the current version metadata, the cache was computed under different rules.
4. **Missing snapshots.** If the scope has events but no snapshots at all, the cache is entirely missing.

The function returns a `ScopeFreshness` object with a boolean `stale` flag and an array of `staleReasons` explaining what specifically is out of date.

---

## 8. Read Consistency

Query functions in `engine/trust/query.ts` use freshness detection to implement two consistency modes:

### 8.1 Fast mode (default)

Read the current snapshot. Return it with a `cacheStatus` field that includes staleness information. The caller sees the cached data and knows whether it might be behind.

### 8.2 Strict mode

Check freshness first. If the scope is stale, run a synchronous projection before returning. The caller always gets fully up-to-date state, at the cost of potentially blocking on a projection.

Strict mode should be used for readiness gates, reviewer assignment, and any allow/deny decision. Fast mode is appropriate for informational displays where a few milliseconds of lag is acceptable.

---

## 9. Write Path Integration

### 9.1 Recording a verification event (`engine/trust/record.ts`)

```
Transaction:
  1. Reserve event sequence number
  2. Insert verification event
  3. Enqueue projection job (scope: component, reason: verification_appended)

After transaction:
  4. Run projectScope synchronously
  5. Return full TrustState with decayed confidence and calibration gap
```

### 9.2 Retracting an event (`engine/trust/retract.ts`)

```
Transaction:
  1. Reserve event sequence number
  2. Mark original event as retracted
  3. Insert retraction record
  4. Enqueue projection job (scope depends on event type)

After transaction:
  5. Run projectScope synchronously
  6. Return list of changed concept IDs
```

Verification retractions use component scope because the retracted event may have propagated inferences. Claim retractions use concept scope because claims do not propagate.

---

## 10. Idempotency

The projector is idempotent. Running a projection multiple times for the same scope and events produces the same result. This follows from:

- Events are sorted deterministically.
- `computeTrustFromHistory` is a pure function.
- Propagation follows deterministic BFS with deterministic tie-breaking.
- The delete-then-insert write pattern produces the same final state regardless of prior cache contents.

This means projection jobs can be safely retried on failure, and reconciliation jobs can reproject without risk of corrupting state.

---

## 11. Persistence Filtering

The projector does not write a snapshot for every concept in the scope. `shouldPersistState` filters out concepts that have no events, are untested, have zero confidence, have no lastVerified timestamp, have no inferred sources, and have no modalities tested. This avoids bloating the cache with empty rows for concepts that have never received any signal.

---

## 12. Change Detection

After writing, the projector compares the new snapshots against the previous ones to identify which concepts actually changed. This comparison normalizes floating-point values to 6 decimal places and sorts array fields before comparing. The `changedConceptIds` list in the result tells callers exactly what moved, which is useful for targeted downstream actions.
