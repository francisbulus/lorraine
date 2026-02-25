# Lorraine: Derived State Consistency

**Version:** 0.2 (Draft)<br>
**Last Updated:** February 26, 2026

This spec defines how Lorraine keeps materialized trust state consistent with the event log.

The event log remains the source of truth. `trust_states` is a derived cache for read performance.

---

## 1. Problem

Materialized trust state can drift when:

1. events are written but snapshots are not fully updated
2. propagation is skipped or partially applied
3. retractions do not fully invalidate downstream inferences
4. graph structure changes without recomputing affected trust state
5. model logic changes without recomputing cached values

---

## 2. Goals

1. Keep event log as canonical truth.
2. Keep cache fast for interactive reads.
3. Make drift detectable, explainable, and repairable.
4. Remove optional propagation behavior from application paths.
5. Support strict consistency for decision-critical reads.

---

## 3. Core Invariants

1. Trust state is derived, not manually set.
2. Only the projector writes `trust_states`.
3. Every cached row is versioned against event, graph, and model versions.
4. Any decision endpoint can demand strict consistency.
5. Full rebuild from event log is always possible.

---

## 4. Data Model Extensions

### 4.1 Event sequencing

Add monotonic `event_seq` to:

1. verification events
2. claim events
3. retraction events

### 4.2 Version metadata

Persist:

1. `graph_version`
2. `model_version`
3. `modality_taxonomy_version`

### 4.3 Trust snapshot metadata

Add to `trust_states`:

1. `derived_from_event_seq`
2. `graph_version`
3. `model_version`
4. `modality_taxonomy_version`
5. `computed_at`

### 4.4 Projection control tables

Add:

1. `projection_checkpoints` with `last_projected_event_seq` by scope
2. `projection_jobs` outbox queue

---

## 5. Projection Architecture

### 5.1 Write path

Within one transaction:

1. append event to log
2. enqueue projection job for affected scope

Do not update `trust_states` directly in application flows.

### 5.2 Projector behavior

For each job:

1. load non-retracted events for scope
2. recompute direct trust
3. recompute propagation and inference chains
4. recompute cached fields (`level`, `confidence`, `lastVerified`, `inferredFrom`, `modalitiesTested`)
5. upsert snapshots with current versions and watermark
6. update checkpoint

Projector must be idempotent.

---

## 6. Scope Rules

### 6.1 Verification event

Affected scope:

1. person
2. connected component containing the concept

### 6.2 Claim event

Affected scope:

1. person
2. concept

If aggregate calibration caches are introduced, claim scope can be widened to person.

### 6.3 Retraction event

Affected scope:

1. same person and connected component as the original verification event, if retracting verification
2. same person and concept as the original claim event, if retracting claim

This is required so downstream inferred confidence is removed when upstream evidence is retracted.

### 6.4 Graph changes

Initial approach:

1. bump global `graph_version`
2. enqueue recompute jobs for all persons

This is correct and simple.

Future optimization:

1. move to component-level graph versioning
2. only invalidate scopes in changed components

This reduces rebuild blast radius as graph size grows.

### 6.5 Model or modality taxonomy changes

1. bump `model_version` for logic/constant changes
2. bump `modality_taxonomy_version` for modality rename/reclassification
3. enqueue rebuild jobs for affected scopes (or all scopes)

---

## 7. Read Consistency Contract

All trust reads accept:

`consistency: "fast" | "strict"` (default `fast`)

### 7.1 Fast mode

1. read current snapshot
2. return staleness metadata when behind current versions or event watermark

### 7.2 Strict mode

1. check scope watermark and versions
2. if behind, run synchronous projection for scope
3. return snapshot only after caught up

Use strict mode for readiness gates, reviewer assignment, or any allow/deny decision.

---

## 8. Operational Safety

1. Add projection lag metrics by scope and globally.
2. Add drift reconciliation job:
   1. sample scopes
   2. replay from event log
   3. compare against snapshots
   4. alert and repair on mismatch
3. Provide admin rebuild command:
   1. `rebuild all`
   2. `rebuild person <id>`
   3. `rebuild component <id>` (future)

---

## 9. Migration Plan

1. Add schema fields and projection tables.
2. Backfill versions and event watermarks.
3. Run projector in shadow mode and compare outputs.
4. Switch decision endpoints to strict reads.
5. Move propagation under projector ownership.
6. Enable reconciliation alerts and scheduled repair.

---

## 10. Drift Coverage Matrix

| Drift Risk | Structural Fix |
|---|---|
| stale confidence/level after model change | `model_version` and rebuild |
| stale `inferredFrom` after graph updates | `graph_version` invalidation and recompute |
| stale modality sets after modality taxonomy changes | `modality_taxonomy_version` and migration rebuild |
| downstream confidence survives upstream retraction | explicit retraction scope recompute |
| partial update on write failure | event append + projection job enqueue in one transaction |

---

## 11. Non-Goals

1. Storing arbitrary manual trust overrides.
2. Making propagation optional at application level.
3. Hiding staleness from decision endpoints.

