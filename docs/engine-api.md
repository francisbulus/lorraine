# Lorraine: Engine API

**Version:** 0.4 (Draft)<br>
**Last Updated:** February 23, 2026<br>
**Implements:** foundational.md v0.5<br>
**Scope:** This documents the reference implementation: the TypeScript engine in `engine/`. It is the API for the code that implements the four framework layers (schema, data, computation, query).

---

## 0. Architecture

The engine implements the framework in two parts:

**Engine Core**: the four framework layers. Pure trust machine. Deterministic. No LLM dependency. Can run fully encrypted client-side. Accepts events, computes trust state, propagates, decays, calibrates, explains.

**Engine Services**: LLM-powered adapters built on top of the core. Generate verification prompts, interpret responses, extract implicit signals. Vary by application context. Optional. The core works without them.

This split means:
- Core can run without any LLM (for external event ingestion, batch processing, encrypted contexts)
- Services can be swapped per application (learning vs. hiring vs. certification)
- Compliance requirements are handled in services, not core
- Core is stable; services iterate

### Design Rule

If an API doesn't serve at least one engine invariant or human experience default, it doesn't belong. If an invariant isn't served by at least one API, the engine is incomplete.

### Engine Vocabulary

Six primitives:
- **Concept**: a node in the graph
- **Edge**: a connection between nodes
- **Verification event**: a moment where understanding was observed
- **Claim event**: a person's self-reported belief about their understanding
- **Trust state**: per concept, per person, derived from events + decay + propagation (not a primary store)
- **Retraction event**: a correction to a previous event, preserving audit integrity

---

## 1. Core: Trust APIs

These are the heart of the engine. Everything else reads from or writes to the event log and derived trust state.

### 1.1 recordVerification

```
recordVerification({
  conceptId,
  personId,
  modality,        // grill:recall | grill:inference | grill:transfer |
                   // grill:discrimination | sandbox:execution |
                   // sandbox:debugging | write:explanation |
                   // write:teaching | sketch:diagram | sketch:process |
                   // integrated:use | external:observed
  result,          // demonstrated | failed | partial
  context,         // what specifically was tested — the question, the code,
                   //   the prompt, the real-world action.
                   //   This is the provenance.
  source,          // internal | external
                   //   internal: verification happened inside Lorraine
                   //   external: submitted via SDK from an outside system
  timestamp
}) → updatedTrustState
```

**What it does:**
Records a single verification event: one moment where a person's understanding was observed. This is the atomic evidence write. Every question answered, every experiment run, every concept used naturally in reasoning, every real-world action observed by an external system. Each one produces a call to this API.

**Why it exists:**
Without verification events, trust has no evidence (Invariant 1). The context field ensures every trust claim has provenance: you can always trace backward and ask "why does the system believe this person knows this?" (Invariant 3). The modality field enables cross-modality analysis (Propagation Rule 4).

**What it does NOT do:**
It does not decide what to verify next. It does not interpret responses. It records structured events. The services layer handles generation and interpretation.

---

### 1.2 recordClaim

```
recordClaim({
  conceptId,
  personId,
  selfReportedConfidence,   // 0.0 – 1.0
  context,                   // what prompted the claim
                             //   "initial self-assessment"
                             //   "challenged model — claims higher"
                             //   "admitted uncertainty"
                             //   "hiring intake questionnaire"
  timestamp
}) → {
  recorded,
  currentTrustState,         // the evidence-based trust for comparison
  calibrationGap             // difference between claim and evidence
}
```

**What it does:**
Records a person's self-reported belief about their understanding of a concept. This is NOT a verification event. Claims are hypothesis, not evidence.

**Why it exists:**
The gap between claims and verified trust is diagnostic (Foundational Spec Section 4.4):
- Overclaiming on untested concepts → overconfidence signal
- Underclaiming on verified concepts → imposter syndrome signal
- Calibration convergence over time → growing epistemic self-awareness
- In hiring: candidate claims are the starting point that verification tests against

**What it returns:**
The current evidence-based trust state alongside the claim, so the gap is immediately visible. The `calibrationGap` is the delta between self-reported confidence and evidence-derived confidence.

---

### 1.3 retractEvent

```
retractEvent({
  eventId,           // the verification or claim event to retract
  eventType,         // verification | claim
  reason,            // fraudulent | duplicate | identity_mixup |
                     //   consent_erasure | data_correction
  retractedBy,       // who authorized the retraction
  timestamp
}) → {
  retracted,
  trustStatesAffected   // concepts whose derived trust state changed
                        //   as a result of recomputation
}
```

**What it does:**
Marks an event as retracted and recomputes all affected trust state. The retraction is itself a logged event. The original event is never deleted. It is marked as retracted with the reason preserved. The audit trail remains complete.

**Why it exists:**
Invariant 6 says trust state is derived from events with no direct state edits. But events themselves may need correction: fraudulent verification, duplicated submissions, identity mixups, GDPR/consent erasure requests. `retractEvent` is the correction mechanism that preserves the invariant: you don't edit state, you edit the event log, and state recomputes.

**What it does NOT do:**
It does not allow inflating trust. Retracting a failure event would recompute trust upward, but the retraction reason is logged, the retractor is logged, and the audit trail shows exactly what happened. Abuse is visible.

---

### 1.4 getTrustState

```
getTrustState({
  conceptId,
  personId
}) → {
  level,              // verified | inferred | untested | contested
  confidence,         // 0.0 – 1.0 (derived from events + decay + propagation)
  verificationHistory,// ordered list of all verification events
  claimHistory,       // ordered list of all claim events
  modalitiesTested,   // which modalities have produced signals
  lastVerified,       // timestamp of most recent verification event
  inferredFrom,       // if level is inferred: which verified nodes
                      //   led to this inference
  decayedConfidence,  // confidence adjusted for time since last verification
  calibrationGap      // current gap between latest claim and evidence
}
```

**What it does:**
Reads the full derived trust state for a single concept for a single person. This is the atomic read operation. Applications call this constantly.

**Why it exists:**
Any system built on the engine needs to know what a person knows (Invariant 1). The person needs to be able to see what the system believes about them (Invariant 3). The distinction between `level` and `confidence` matters: a concept can be `inferred` at 0.8 confidence: "fairly sure, but never directly demonstrated."

**Critical design decisions:**
- `inferredFrom` is exposed, not hidden. Provenance is always traceable (Invariant 3).
- `claimHistory` is included alongside `verificationHistory`. Claims and evidence are both visible.
- `calibrationGap` surfaces the claim-evidence delta at read time.
- Trust state is derived. It can be recomputed from the event logs at any time (Invariant 6).

---

### 1.5 getBulkTrustState

```
getBulkTrustState({
  personId,
  conceptIds       // optional: if omitted, returns all concepts
                   //   with any trust state for this person
}) → TrustState[]
```

**What it does:**
Reads trust state across many concepts at once. Applications need this for rendering maps, evaluating readiness across a group of concepts, computing aggregate understanding, or comparing a person's state against requirements.

**Why it exists:**
Performance API. Returns the same data as `getTrustState`, just in batch. Without it, applications make N individual calls.

---

### 1.6 propagateTrust

```
propagateTrust({
  sourceConceptId,
  personId,
  verificationEvent
}) → [
  { conceptId, previousState, newState, inferenceStrength, reason }
]
```

**What it does:**
When a verification event occurs on one concept, this computes the ripple effects across the graph. Each affected concept gets an updated derived state, and the reason for the update is recorded.

**The propagation rules (hardcoded, Invariant 2):**

1. Verification never propagates as verification. Only as inference.
2. Inference attenuates with distance.
3. Failure propagates more aggressively than success.
4. Cross-modality verification strengthens the propagation signal.
5. Time decay applies to propagated trust just as it does to direct trust.

**Why hardcoded:**
Epistemic integrity constraints. If configurable, a bad configuration could inflate trust scores. The system's honesty depends on conservative propagation. This is a safety property.

---

### 1.7 decayTrust

```
decayTrust({
  personId,
  asOfTimestamp
}) → [
  { conceptId, previousConfidence, decayedConfidence, daysSinceVerified }
]
```

**What it does:**
Runs the decay function across all concepts for a person. Returns every concept whose derived confidence has dropped since the last computation.

**Decay model:**
Exponential decay (Ebbinghaus curve), with two modifiers:
- **Depth of original verification:** Cross-modality verified concepts decay slower.
- **Structural importance:** Foundational concepts (many downstream dependents) decay slower.

---

## 2. Core: Graph APIs

These manage the concept graph: the structure of knowledge independent of any person's trust state.

### 2.1 loadConcepts

```
loadConcepts({
  concepts: [{
    id,
    name,
    description
  }],
  edges: [{
    from,
    to,
    type,              // prerequisite | component_of | related_to
    inferenceStrength   // 0.0 – 1.0
  }]
}) → {
  loaded,
  edgesCreated,
  errors
}
```

**What it does:**
Loads concepts and edges into the graph. This is how domain packages get ingested. The engine validates and stores them.

**Why concepts and edges load together:**
Edges reference concepts. Loading together lets the engine validate the entire graph in one pass. No dangling references.

---

### 2.2 getGraph

```
getGraph({
  conceptIds?,        // optional: subset of concepts
  personId?,          // optional: include trust state overlay
  depth?              // optional: hops from specified concepts
}) → {
  concepts: [{
    id, name, description,
    trustState?
  }],
  edges: [{
    from, to, type, inferenceStrength
  }]
}
```

**What it does:**
Returns the concept graph, optionally filtered and optionally overlaid with derived trust state. This is what applications use to build maps, dashboards, groupings, readiness checks.

---

## 3. Core: Epistemics APIs

The engine watches itself.

### 3.1 calibrate

```
calibrate({
  personId
}) → {
  predictionAccuracy,   // when the system predicted success/failure,
                        //   how often was it right?
  overconfidenceBias,   // does the system consistently overestimate?
  underconfidenceBias,  // does it consistently underestimate?
  stalePercentage,      // % of model based on old inferences
  surpriseRate,         // how often does performance differ from prediction?
  claimCalibration,     // how well do the person's claims match evidence?
  recommendation        // what the system should do to improve its model
}
```

**What it does:**
The engine audits its own model quality AND the person's self-calibration quality.

`claimCalibration` is new: it measures how well the person's claims track their evidence-based trust state. This is the Lorraine Code metric: knowing well includes knowing what you don't know.

---

### 3.2 explainDecision

```
explainDecision({
  decisionType,       // trust_update | propagation_result |
                      //   decay_result | contested_detection |
                      //   calibration_finding
  decisionContext
}) → {
  reasoning,
  trustInputs,
  alternatives,
  confidence
}
```

**What it does:**
Makes the engine's reasoning transparent (Invariant 3). Any trust update, propagation, or calibration finding can be traced and explained.

---

## 4. Services: Verification APIs

These are LLM-powered. They sit between the core and applications. They generate and interpret the human-facing interactions that produce verification events for the core.

**These are not part of the engine core.** They are built on top of the four framework layers. They can be swapped, specialized, or omitted entirely. An application that only receives external verification events (CI/CD pipeline, code review tool, exam system) doesn't need services at all.

### 4.1 generateVerification

```
generateVerification({
  personId,
  conceptId?,
  targetModality?,
  difficultyAxis?,    // recall | inference | transfer | discrimination
  reason,             // scheduled | person_requested |
                      //   contested_resolution | probing | external_requirement
  applicationContext  // learning | hiring | certification | onboarding
                      //   services use this to calibrate tone, framing, constraints
}) → {
  type,               // grill_question | sandbox_prompt | write_prompt |
                      //   sketch_prompt | conversational_probe
  content,
  expectedSignals,
  conceptsTested
}
```

**What it does:**
Generates a verification interaction. Reads trust state from the core to decide *what* to verify. Uses LLM to generate *how*: the actual prompt, calibrated to the person and the application context.

**Why `applicationContext` matters:**
A learning app generates conversational Socratic questions. A hiring service generates technical interview prompts. A certification service generates standardized assessments. Same engine, same trust math, different framing.

---

### 4.2 interpretResponse

```
interpretResponse({
  verificationId,
  personId,
  response,
  responseModality
}) → {
  trustUpdates: [{
    conceptId,
    result,          // demonstrated | failed | partial (what happened in this response)
    previousState,
    newState,        // where the concept ends up after this event
    evidence
  }],
  contestedDetected,
  implicitSignals
}
```

**What it does:**
Takes a person's response and translates it into structured trust updates. A single response can touch multiple concepts with different results. Each trust update carries its own result (what happened) and newState (the consequence). These updates are then written to the core via `recordVerification`. The services layer interprets; the core records.

---

### 4.3 extractImplicitSignals

```
extractImplicitSignals({
  utterance,
  conversationHistory,
  personId,
  currentTrustState
}) → [{
  conceptId,
  signalType,         // correct_usage | incorrect_usage | question_revealing_gap |
                      //   self_correction | sophistication_increase |
                      //   confusion_signal | natural_connection_made
  confidence,
  evidence
}]
```

**What it does:**
Mines natural interaction for trust signals. The richest verification comes from integrated use: concepts appearing naturally in reasoning without scaffolding.

**Why `confidence` matters:**
Implicit extraction is noisier than explicit testing. High-confidence signals get written to the core via `recordVerification`. Low-confidence signals are noted but don't drive trust updates.

---

### 4.4 requestSelfVerification

```
requestSelfVerification({
  personId,
  conceptId?,
  reason              // person_uncertain | person_claims_knowledge |
                      //   person_challenges_model
}) → generateVerification(...)
```

**What it does:**
The person initiates verification. Routes through `generateVerification` with appropriate framing.

**Why it exists:**
Two-way verification. The person has private information: a gut feeling that something isn't solid, or knowledge gained outside the system. This lets them act on it.

---

## 5. Invariant Coverage Matrix

| Invariant / Default | Served by |
|---------------------|-----------|
| Inv 1: Trust is foundational | recordVerification, recordClaim, getTrustState, propagateTrust |
| Inv 2: Never inflates trust | propagateTrust (hardcoded conservative rules) |
| Inv 3: Transparent and challengeable | getTrustState (exposes inferredFrom, claimHistory), explainDecision, requestSelfVerification |
| Inv 4: Failure is most informative | recordVerification (failure recorded with context), propagateTrust (aggressive failure propagation) |
| Inv 5: Never manipulates verification | generateVerification (no difficulty ceiling), interpretResponse (failure is signal, not error) |
| Inv 6: Trust state is derived | All reads compute from events — no direct state edit API exists. Corrections via retractEvent. |
| Def 7: Independent arrival | generateVerification (transfer questions that require derivation) |
| Def 8: Self-reflection | recordClaim (captures self-assessment), calibrate (measures self-calibration) |
| Def 9: Collapse cost of action | decayTrust (honest about fading — no false confidence) |
| Def 10: Approach-agnostic | generateVerification (any modality, any difficulty axis) |
| Def 11: Foundational capability | propagateTrust (structural importance), getGraph (edges reveal foundations) |

No orphaned invariants. No orphaned APIs.

---

## 6. What's Not in the Engine

### Not in Core:
- Natural language generation or interpretation (services layer)
- LLM calls of any kind (services layer)
- Groupings, territories, maps (application layer)
- Thresholds, gates, readiness criteria (application layer)
- Goals, paths, navigation (application layer)
- Conversation management (application layer)
- UI rendering (application layer)
- Gamification (deliberately absent everywhere)
- Role-specific logic (application layer)
- Manual trust state overrides (deliberately impossible, Invariant 6)

### Not in Services:
- Domain graph content (data, loaded via core)
- Trust math (core)
- Propagation rules (core, hardcoded)
- Decay function (core)
- Storage (core)

### Not anywhere:
- Streak tracking, point systems, badge systems
- Direct trust state editing without events
- Configurable propagation rules
- Event deletion (retraction marks events, never deletes them)
