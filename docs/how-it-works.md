# Lorraine: How It Works

**Version:** 0.1<br>
**Last Updated:** February 23, 2026

This document walks through what happens at each layer of the framework with concrete examples. Read this before the API reference.

---

## The Four Layers

```
Schema        what trust data looks like
Data          where trust data lives
Computation   what trust data means
Query         how you ask questions about it
```

---

## 1. Schema Layer

The schema defines five primitives. Everything in Lorraine composes from these.

**Concept**: a node in the graph. Something a person could know or not know. Has an id, a name, and a description.

```
{ id: "tcp-acknowledgments", name: "TCP Acknowledgments", description: "How TCP receivers confirm receipt of data." }
```

**Edge**: a typed, weighted connection between concepts. Has a source, a target, a type, and an inference strength.

```
{ from: "tcp-acknowledgments", to: "tcp-retransmission", type: "component_of", inferenceStrength: 0.7 }
```

Three edge types:
- `prerequisite`: must understand A before B
- `component_of`: A is a part of B
- `related_to`: A illuminates B but doesn't block it

Inference strength (0.0–1.0) determines how strongly verified trust in one concept implies trust in the connected concept. Higher means stronger inference.

**Verification event**: a single observation of understanding.

```
{
  conceptId: "tcp-acknowledgments",
  personId: "ade",
  modality: "grill:transfer",
  result: "demonstrated",
  context: "Derived acknowledgment-based reliability from first principles when asked to design a protocol guaranteeing delivery",
  source: "internal",
  timestamp: 1708646400000
}
```

The `context` field is the provenance. It's what makes every trust claim traceable: you can always ask "why does the system believe this?" and get an answer that points to a specific moment with a specific context.

The `modality` field records how the understanding was observed. Different modalities have different trust strengths: integrated use in natural reasoning is stronger than recall of a fact.

The `result` is one of three values: `demonstrated`, `failed`, `partial`.

**Claim event**: a person's self-reported belief about their own understanding.

```
{
  conceptId: "tcp-acknowledgments",
  personId: "ade",
  selfReportedConfidence: 0.9,
  context: "Said 'oh I actually know TCP' during conversation",
  timestamp: 1708646400000
}
```

Claims are not evidence. They are tracked separately because the gap between what someone claims and what they've demonstrated is itself diagnostic.

**Trust state**: per concept, per person, derived from events. Not a primitive that's stored; a view that's computed.

```
{
  level: "verified",
  confidence: 0.85,
  verificationHistory: [...events],
  claimHistory: [...claims],
  modalitiesTested: ["grill:transfer"],
  lastVerified: 1708646400000,
  inferredFrom: null,
  decayedConfidence: 0.82,
  calibrationGap: 0.08
}
```

This is never written directly. It's always computed from the events through the computation layer.

---

## 2. Data Layer

The data layer persists events and concepts. It has two properties:

**Append-only.** Events are never deleted. When an event needs to be corrected (fraud, duplication, identity mixup), it is retracted. A new event is written that marks the original as retracted with a reason. The original stays in the log. The audit trail is always complete.

**Storage-agnostic.** The data layer is defined by a store interface, not a specific database. The interface requires:

- Write a verification event
- Write a claim event
- Write a retraction event
- Read events for a person + concept
- Read all events for a person
- Read concepts and edges
- Write concepts and edges

Any database that implements this interface works. SQLite for local/embedded use. Postgres for production. DynamoDB for serverless. The framework doesn't care. The computation layer operates on the events the data layer provides, regardless of where they came from.

---

## 3. Computation Layer

This is where Lorraine's opinions live. The computation layer takes raw events from the data layer and produces meaningful trust state. It does five things:

### 3.1 Derivation

Trust state is derived from the event log. Implementations can materialize derived trust state for performance, but the event log remains the source of truth and trust can always be recomputed.

For a given person and concept, derivation looks at:
- All verification events, ordered by time
- The most recent result and modality
- How many distinct modalities have produced signals
- Whether there are contradictions (demonstrated in one modality, failed in another)
- Time since last verification

From this, it produces a level and a confidence:

- **Verified**: at least one demonstrated result, no unresolved contradictions
- **Contested**: both demonstrated and failed results exist
- **Inferred**: no direct events, but propagation from neighboring concepts (see below)
- **Untested**: no events, no inference

Confidence (0.0–1.0) is derived from the strength of the evidence: more modalities, more recent events, and transfer-level verification all increase confidence.

### 3.2 Propagation

When a verification event is recorded, its implications ripple across the graph.

**A concrete example:**

A person demonstrates understanding of TCP acknowledgments through a grill transfer question. The event is recorded. Now the computation layer walks the edges:

```
tcp-acknowledgments is verified at 0.85 confidence.

Edge: tcp-acknowledgments → tcp-retransmission
  type: component_of, strength: 0.7
  Retransmission is inferred at 0.85 × 0.7 = 0.595

Edge: tcp-acknowledgments → tcp-flow-control
  type: prerequisite, strength: 0.5
  Flow control is inferred at 0.85 × 0.5 = 0.425

Edge: tcp-sequence-numbers → tcp-acknowledgments
  type: prerequisite, strength: 0.7
  Sequence numbers is inferred at 0.85 × 0.7 = 0.595
  (reverse direction — if you understand acks, you probably
   understand what's being acknowledged)
```

Second-hop attenuation:

```
tcp-retransmission (inferred at 0.595) → tcp-congestion-control
  type: related_to, strength: 0.4
  Congestion control is inferred at 0.595 × 0.4 = 0.238
  (two hops from the verified event — barely signal)
```

Three hops out and propagation effectively dies. One verification event does not light up the entire graph.

**Five hardcoded rules:**

1. **Verification never propagates as verification.** Only as inference. No matter how strong the edge, propagation never produces a verified state. Only direct demonstration does that.

2. **Inference attenuates with distance.** Each hop multiplies by the edge's inference strength. Signal weakens quickly. This prevents a single strong event from creating confident inferences across distant concepts.

3. **Failure propagates aggressively.** If a person fails on concept B, and concepts C, D, E depend on B, then trust in C, D, E drops, even if they were previously inferred. Failure at a foundation shakes everything above it. The asymmetry is deliberate: success whispers, failure shouts.

4. **Cross-modality verification compounds.** If a concept is verified through grill:transfer AND sandbox:execution, the propagation signal is stronger than either alone. Multiple angles of evidence make the foundation more trustworthy, which strengthens inference to neighbors.

5. **Time decay applies to propagated trust.** Inferred trust decays just as direct trust does. Old inferences fade.

**Why these rules are hardcoded:**

They are epistemic integrity constraints. If rule 1 were configurable, someone could set propagation to produce verified states, inflating trust across their graph from a single event. If rule 3 were tunable, someone could suppress failure propagation, hiding gaps. The hardcoding is the integrity guarantee. These rules cannot be configured wrong because they cannot be configured at all.

### 3.3 Decay

Time erodes confidence. The computation layer applies exponential decay with two modifiers:

**Base decay:** Ebbinghaus curve. Confidence drops over time since last verification. A concept verified yesterday has higher confidence than one verified six months ago.

**Modifier 1, verification depth:** Cross-modality verified concepts decay slower. If you proved understanding through conversation AND code AND written explanation, that evidence is more durable than a single recall-level answer. The number and strength of modalities tested adjusts the half-life.

**Modifier 2, structural importance:** Foundational concepts (those with many downstream dependents in the graph) decay slower. The graph's topology tells the computation layer what's load-bearing. A concept that five other concepts depend on is more structurally important than a leaf node.

Decay is applied at query time, not on a schedule. When you ask for trust state, the computation layer computes the decay from time of last verification to now. This means trust state is always current. You never see stale confidence from a batch job that hasn't run yet.

### 3.4 Calibration

The computation layer watches itself. It tracks:

**Prediction accuracy.** Before a new verification event, the person has a trust state (the system's prediction of their understanding). After the event, there's an outcome (demonstrated or failed). Did the prediction match the outcome? Over time, this measures how accurate the model is.

**Overconfidence bias.** Does the system consistently overestimate? If trust state says 0.8 confidence but the person keeps failing, the model is overconfident.

**Underconfidence bias.** Does the system consistently underestimate? If trust state says 0.3 confidence but the person keeps demonstrating, the model is underconfident.

**Surprise rate.** How often does performance differ from prediction? High surprise rate means the model needs more evidence.

**Claim calibration.** How well do the person's self-reported claims match their evidence-based trust state? This measures the person's self-awareness, not the model's accuracy. A person whose claims converge with evidence over time is developing epistemic self-awareness. They're getting better at knowing what they know.

### 3.5 Contestation

When the event log contains conflicting evidence (demonstrated in one context, failed in another), the computation layer does not average them, does not pick the most recent, does not resolve the tension. It marks the concept as **contested**.

Contested is a first-class state. It means the exact boundary of understanding has been found. The person's mental model works in some contexts and breaks in others. This is the most informationally rich state in the system.

A concept might be contested because:
- Demonstrated through recall but failed through transfer (can recite the fact but can't apply it)
- Demonstrated in conversation but failed in code (can talk about it but can't build it)
- Demonstrated a week ago but failed today (understanding was fragile and decayed)

The computation layer preserves the tension. It's up to the application to decide what to do with it: surface it, target it for further verification, or simply display it on the trust map.

---

## 4. Query Layer

The query layer is how applications ask questions about trust data. Every query runs through the computation layer. Implementations can read materialized derived state and compute time-sensitive values like decay at read time.

**`getTrustState(personId, conceptId)`**: what does this person know about this concept?

Returns the full derived trust state: level, confidence, verification history, claim history, modalities tested, decay-adjusted confidence, inference chain if inferred, calibration gap between claims and evidence. This is the atomic read. Applications call it constantly.

**`getBulkTrustState(personId, conceptIds?)`**: same, across many concepts.

Applications need this for rendering maps, computing aggregate ownership of a territory, evaluating readiness against a set of requirements. Performance API. Same data as getTrustState, batched.

**`getGraph(conceptIds?, personId?, depth?)`**: show me the knowledge structure.

Returns concepts and edges, optionally filtered to a subset, optionally overlaid with a person's trust state. This is what map renderers consume. The graph is the structure. The trust overlay is the state. Together they produce the visual: "here's everything there is to know, and here's where this person stands."

**`explainDecision(decisionType, decisionContext)`**: why does the system believe this?

Takes any trust claim and traces it backward through the computation layer to the evidence that produced it. "TCP retransmission is inferred at 0.595" → "because tcp-acknowledgments was verified at 0.85 through grill:transfer, and the component_of edge has inference strength 0.7." Every number has a reason. Every reason traces to an event. Every event has context. The chain is always complete.

**`calibrate(personId)`**: how accurate is the model? how calibrated is the person?

Returns the computation layer's self-assessment: prediction accuracy, bias direction, surprise rate, stale percentage, claim calibration. This is the engine watching itself. Applications surface this to help people understand how much to trust the trust model, and how much to trust their own self-assessments.

---

## The Full Loop

Putting it all together. A person engages with a concept:

```
1. An event occurs
   (they answer a question, write code, use a concept in conversation,
    or an external system observes them performing a real-world action)

2. Schema layer: the event is structured
   conceptId, personId, modality, result, context, timestamp

3. Data layer: the event is persisted
   Appended to the event log. Never modified. Never deleted.

4. Computation layer: implications are computed
   - Direct trust state is re-derived for the concept
   - Propagation ripples inference across connected concepts
   - Failure propagation shakes downstream dependents
   - Decay is applied based on time
   - Calibration updates (was this outcome predicted?)

5. Query layer: applications ask questions
   - getTrustState: what does this person know now?
   - getGraph: what does the map look like?
   - explainDecision: why this specific trust level?
   - calibrate: how accurate is the model?

6. The trust map updates.
   A node changes color. An inference spreads. A contested state appears.
   The person sees their understanding reflected honestly.
```

That's Lorraine. Events in, honest trust out.
