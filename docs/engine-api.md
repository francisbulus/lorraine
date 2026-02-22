# Lorraine — Engine API

**Version:** 0.2 (Draft)
**Last Updated:** February 22, 2026
**Implements:** foundational.md — every API traces to at least one governing principle.

---

## 0. Design Rule

If an API doesn't serve at least one of the eleven principles, it doesn't belong in the engine. If a principle isn't served by at least one API, the engine is incomplete.

The engine's vocabulary is four things:

- **Concept** — a node in the graph
- **Edge** — a connection between nodes
- **TrustState** — per concept, per person
- **VerificationEvent** — a moment where understanding was observed

Everything else — territories, maps, thresholds, goals, modes, conversation — is application-level. The engine doesn't know about any of it.

---

## 1. Trust APIs

These are the core of the engine. Everything else reads from or writes to trust state.

### 1.1 recordVerification

```
recordVerification({
  conceptId,
  personId,
  modality,        // grill:recall | grill:inference | grill:transfer |
                   // grill:discrimination | sandbox:execution |
                   // sandbox:debugging | write:explanation |
                   // write:teaching | sketch:diagram | sketch:process |
                   // conversation:unprompted | external:observed
  result,          // demonstrated | failed | partial
  context,         // what specifically was tested — the question, the code,
                   //   the prompt, the real-world action.
                   //   This is the provenance.
  source,          // internal | external
                   //   internal: the verification happened inside Lorraine
                   //   external: submitted via SDK from an outside system
                   //     (CI/CD pipeline, code review tool, HR system, etc.)
  timestamp
}) → updatedTrustState
```

**What it does:**
Records a single verification event — one moment where a person's understanding was observed. This is the atomic write operation to the trust graph. Every question answered, every experiment run, every concept used naturally in conversation, every real-world action observed by an external system — each one produces a call to this API.

**Why it exists:**
Without verification events, trust has no evidence (Principle 1). The context field ensures every trust claim has provenance — you can always trace backward and ask "why does the system believe this person knows this?" (Principle 11 — failure is visible). The modality field enables cross-modality analysis — has understanding been demonstrated from multiple angles? (Trust Propagation Rule 4).

**What it does NOT do:**
It does not decide what to verify next. It does not interpret the result. It just records what happened. Interpretation is the application's job.

---

### 1.2 getTrustState

```
getTrustState({
  conceptId,
  personId
}) → {
  level,              // verified | inferred | untested | contested
  confidence,         // 0.0 – 1.0
  verificationHistory,// ordered list of all recordVerification calls
  modalitiesTested,   // which modalities have produced signals
  lastVerified,       // timestamp of most recent verification event
  inferredFrom,       // if level is inferred: which verified nodes
                      //   led to this inference
  decayedConfidence   // confidence adjusted for time since last verification
}
```

**What it does:**
Reads the full trust state for a single concept for a single person. This is the atomic read operation. Applications call this constantly — before deciding what to do next, before evaluating readiness, before choosing a question, before deciding how deep to explain something.

**Why it exists:**
Any system built on the engine needs to know what a person knows (Principle 1). The person needs to be able to see what the system thinks they know (Principle 6 — transparency). The distinction between `level` and `confidence` matters: a concept can be `inferred` at 0.8 confidence, which means "we're fairly sure, but it's never been directly demonstrated." The `decayedConfidence` field implements trust decay — a concept verified six months ago is worth less than one verified yesterday.

**Critical design decision:**
`inferredFrom` is exposed, not hidden. Anyone can always ask: "you say this person probably knows X — why?" And the answer is traceable: "because they demonstrated Y and Z, and X is related to both." This is epistemic integrity.

---

### 1.3 propagateTrust

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
When a verification event occurs on one concept, this computes the ripple effects across the graph. If you verify understanding of TCP handshakes, what does that imply about understanding of sequence numbers? Of reliable delivery? Each affected concept gets an updated state, and the reason for the update is recorded.

**Why it exists:**
Without propagation, trust stays isolated per concept and never compounds. This is what makes the graph a graph and not a list.

**The propagation rules (hardcoded, not configurable):**

1. Verification never propagates as verification. Only as inference.
2. Inference attenuates with distance.
3. Failure propagates more aggressively than success.
4. Cross-modality verification strengthens the propagation signal.
5. Time decay applies to propagated trust just as it does to direct trust.

**Why these rules are hardcoded:**
They're epistemic integrity constraints. If they were configurable, a bad configuration could inflate trust scores across the graph. The system's honesty depends on conservative propagation. This is not a tunable parameter — it's a safety property.

---

### 1.4 decayTrust

```
decayTrust({
  personId,
  asOfTimestamp
}) → [
  { conceptId, previousConfidence, decayedConfidence, daysSinceVerified }
]
```

**What it does:**
Runs the decay function across all concepts for a person. Returns every concept whose effective confidence has dropped since the last check. This is a background process, not user-triggered — it runs whenever a session starts, and the results inform the application's decisions.

**Why it exists:**
Knowledge fades. A concept verified three months ago is not as reliable as one verified yesterday. Without decay, the trust model goes stale and decisions get made on foundations that shouldn't be trusted.

**Decay model:**
Exponential decay (Ebbinghaus curve), with two modifiers:
- **Depth of original verification:** Cross-modality verified concepts decay slower. A concept demonstrated through multiple modalities has deeper encoding than one verified through a single modality.
- **Structural importance:** Foundational concepts (those with many downstream dependents in the graph) decay slower. This is a pragmatic choice — foundational concepts tend to be reinforced by use even when not explicitly re-verified.

---

### 1.5 getBulkTrustState

```
getBulkTrustState({
  personId,
  conceptIds       // optional: if omitted, returns all concepts
                   //   with any trust state for this person
}) → [
  TrustState[]     // array of getTrustState results
]
```

**What it does:**
Reads trust state across many concepts at once. Applications need this for rendering maps, evaluating readiness across a group of concepts, computing aggregate understanding of an area, or comparing a person's state against requirements.

**Why it exists:**
`getTrustState` is per-concept. Applications frequently need the full picture — "show me everything this person has demonstrated across these fifty concepts." Without a bulk read, applications would make fifty individual calls. This is a performance API, not a new primitive — it returns the same data as `getTrustState`, just in batch.

---

## 2. Verification APIs

These orchestrate the verification loop — generating prompts, interpreting responses, and extracting implicit signals.

### 2.1 generateVerification

```
generateVerification({
  personId,
  conceptId,          // optional: verify a specific concept
  targetModality,     // optional: request a specific modality
  difficultyAxis,     // optional: recall | inference | transfer | discrimination
  reason              // why this verification is happening:
                      //   scheduled | person_requested |
                      //   contested_resolution | probing | external_requirement
}) → {
  type,               // grill_question | sandbox_prompt | write_prompt |
                      //   sketch_prompt | conversational_probe
  content,            // the actual question, prompt, or probe
  expectedSignals,    // what will be learned from the response,
                      //   regardless of correctness
  conceptsTested      // may test multiple related concepts at once
}
```

**What it does:**
Generates a verification interaction. The engine decides *what* to verify and *why* (based on trust state, decay, contested concepts). The LLM layer generates *how* — the actual question or prompt, in natural language, calibrated to the person.

**Why it exists:**
Verification is how trust is built (Principle 1). Different modalities verify different things at different trust strengths. The `reason` field matters — a scheduled check feels different from a person asking to be tested feels different from an external requirement. The application should frame each differently.

**Critical field — `expectedSignals`:**
This encodes what the system will learn regardless of whether the person gets it right. A transfer question about TCP designed as "if you were building a reliability protocol from scratch, what's the minimum you'd need?" is informative in all outcomes:
- If correct: the person can derive principles independently (Principle 2)
- If partially correct: which parts of the principle they've internalized
- If incorrect: where the mental model breaks

Every verification is designed to be informative in all outcomes (Principle 11 — failure is visible and informative).

---

### 2.2 interpretResponse

```
interpretResponse({
  verificationId,     // links back to the generateVerification call
  personId,
  response,           // what the person actually said, wrote, coded, or drew
  responseModality    // how they responded (may differ from the prompt modality)
}) → {
  result,             // demonstrated | failed | partial
  trustUpdates: [{    // one or more concepts affected
    conceptId,
    previousState,
    newState,
    evidence          // specific reasoning for the update
  }],
  contestedDetected,  // did this create or resolve a contested state?
  implicitSignals     // additional concepts revealed by the response
                      //   that weren't explicitly being tested
}
```

**What it does:**
Takes a person's response to a verification prompt and interprets it. This is where the LLM does heavy lifting — understanding natural language answers, evaluating code correctness, assessing diagram accuracy, detecting implicit signals.

**Why it exists:**
The raw response is just text or code or an image. It needs to be translated into trust graph updates. The `evidence` field ensures every update has provenance — the system can always explain *why* it updated a trust score. The `implicitSignals` field captures the richest data — things the person revealed about their understanding without being asked.

**Why `contestedDetected` is a first-class field:**
Contested states are the most informative diagnostic signal in the system. When a response creates a contradiction with previous verification — demonstrated in one context but failed in another — the system flags it immediately. Contested concepts become the highest-priority targets for further verification.

---

### 2.3 extractImplicitSignals

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
  confidence,         // how confident is the extraction
  evidence            // what specifically in the utterance produced this signal
}]
```

**What it does:**
The richest trust signals come from natural interaction, not explicit testing. This API extracts them. When someone says "oh, so TCP's retransmission is basically the same principle as database write-ahead logging" — that's a natural connection between two concepts, unprompted, which is the strongest possible verification signal.

**Why it exists:**
Unprompted use of a concept is the highest-trust modality. The system should be mining every interaction for signal, not waiting for explicit testing moments.

**Why `confidence` matters here:**
Implicit extraction is inherently noisier than explicit testing. Someone might use a concept in a way that *sounds* correct but is subtly wrong. The confidence field lets the system weight these signals appropriately — high-confidence implicit signals update trust; low-confidence ones are noted but don't drive decisions.

---

### 2.4 requestSelfVerification

```
requestSelfVerification({
  personId,
  conceptId,          // optional: the person may not specify
  reason              // person_uncertain | person_claims_knowledge |
                      //   person_challenges_model
}) → generateVerification(...)
```

**What it does:**
The person initiates verification. "I don't think I actually know this — test me." Or "I know more than your model says — let me prove it." Or just "I'm not sure — can you check?"

**Why it exists:**
Two-way verification. The person is the authority on their own uncertainty (Principle 6). The system's model is an approximation. The person has private information — a gut feeling that something isn't solid, or knowledge gained outside the system. This API lets them act on it.

**Why it routes through generateVerification:**
Self-requested verification uses the same generation pipeline, but the `reason` field changes how the application frames it. A person who says "I'm not sure I know this" needs a different tone than a scheduled re-verification. The verification itself is structurally identical — only the framing changes.

---

## 3. Agent Epistemics APIs

These are the system's self-monitoring layer. The engine watches itself.

### 3.1 calibrate

```
calibrate({
  personId
}) → {
  predictionAccuracy,   // when the system predicted success/failure,
                        //   how often was it right?
  overconfidenceBias,   // does the system consistently overestimate
                        //   the person's knowledge?
  underconfidenceBias,  // does it consistently underestimate?
  stalePercentage,      // what % of the model is based on old
                        //   inferences vs. recent verification?
  surpriseRate,         // how often does the person's performance
                        //   differ significantly from prediction?
  recommendation        // what the system should do to improve its model
}
```

**What it does:**
The engine audits its own model quality. This is meta-trust — the engine's trust in its own trust model.

**Why it exists:**
If calibration is poor (predictions don't match reality), the engine's model is unreliable. The `recommendation` field might say: "Model is 40% stale — prioritize re-verification of foundational concepts" or "Overconfidence bias detected — lower trust propagation strength."

**Why this matters practically:**
Without self-calibration, the engine degrades silently. It keeps producing trust states based on a model that's drifting from reality. Applications experience this as bad recommendations and inaccurate trust scores. Calibration catches this drift.

---

### 3.2 explainDecision

```
explainDecision({
  decisionType,       // verification_choice | trust_update | propagation_result |
                      //   decay_result | contested_detection
  decisionContext     // the specific decision to explain
}) → {
  reasoning,          // why the engine made this decision
  trustInputs,        // which trust states informed it
  alternatives,       // what else the engine considered
  confidence          // how confident the engine is in this decision
}
```

**What it does:**
Makes the engine's reasoning transparent. When the engine updates a trust score, propagates inference, or flags a contested state, anyone can ask "why?" and get a traceable answer.

**Why it exists:**
Epistemic integrity. The engine must be honest about its reasoning. This also serves the person being modeled — they need to understand why the system believes what it believes about them in order to challenge it if it's wrong.

---

## 4. Graph APIs

These manage the concept graph itself — the structure of knowledge independent of any person's trust state.

### 4.1 loadConcepts

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
  loaded,              // number of concepts loaded
  edgesCreated,        // number of edges created
  errors               // any validation failures
}
```

**What it does:**
Loads concepts and edges into the graph. This is how domain packages get ingested — the application reads a domain file and feeds its concepts and edges to the engine. The engine validates and stores them.

**Why it exists:**
The engine needs to know what concepts exist and how they connect in order to run propagation and compute trust states. But the engine is domain-agnostic — it doesn't know what "Kubernetes" or "TCP" is. It just knows there are nodes and edges.

**Why concepts and edges are loaded together:**
Edges reference concepts. Loading them separately creates ordering dependencies and potential dangling references. Loading them together lets the engine validate the entire graph in one pass.

---

### 4.2 getGraph

```
getGraph({
  conceptIds?,        // optional: subset of concepts to return
  personId?,          // optional: include trust state overlay
  depth?              // optional: how many hops from the specified concepts
}) → {
  concepts: [{
    id, name, description,
    trustState?        // included only if personId was provided
  }],
  edges: [{
    from, to, type, inferenceStrength
  }]
}
```

**What it does:**
Returns the concept graph, optionally filtered and optionally overlaid with a person's trust state. This is what applications use to build maps, visualizations, groupings, readiness checks — whatever the application needs.

**Why it exists:**
Applications need to read the graph to render it. The engine stores it; applications consume it. The optional `personId` overlay is a convenience — rather than calling `getGraph` and then `getBulkTrustState` separately, applications can get both in one call.

---

## 5. Principle Coverage Matrix

Every API must serve at least one principle. Every principle must be served by at least one API.

| Principle | Served by |
|-----------|-----------|
| 1. Trust is foundational | recordVerification, getTrustState, propagateTrust, getBulkTrustState |
| 2. Self-trust through independent arrival | generateVerification (transfer questions), interpretResponse |
| 3. Agent is a mapmaker | getGraph (provides the data applications use to build maps) |
| 4. Terrain ownership, not path completion | getBulkTrustState (full picture, not single path), getGraph |
| 5. Gate is a threshold, not a test | getTrustState (provides the data; application implements thresholds) |
| 6. Self-reflection, not judgment | requestSelfVerification, explainDecision, getTrustState (transparent) |
| 7. Collapse cost of action | decayTrust (honest about what's faded — no false confidence) |
| 8. Approach-agnostic | generateVerification (any modality, any difficulty axis) |
| 9. Difficulty is sacred | generateVerification (no difficulty ceiling), interpretResponse (failure is signal) |
| 10. Foundational capability over topical coverage | propagateTrust (structural importance in decay), getGraph (edges reveal foundations) |
| 11. Failure is cheap, visible, navigable | recordVerification (context/provenance), interpretResponse (evidence), explainDecision |

No orphaned principles. No orphaned APIs.

Some principles (3, 4, 5, 7) are partially served by the engine and fully realized in the application layer. The engine provides the data and primitives. The application provides the experience. This is correct — the engine is not the product. It's the foundation the product is built on.

---

## 6. What's Not in the Engine

The engine provides primitives. These things are intentionally excluded:

- **Groupings, maps, and navigation** — the engine stores concepts and edges. How they're grouped, visualized, and navigated is the application's concern. A learning OS groups them into territories. A hiring app groups them into skill areas. An onboarding app groups them into milestones. The engine doesn't know or care.
- **Thresholds and gates** — the engine can tell you a person's trust state for any set of concepts. Whether that constitutes "readiness" to move forward is the application's judgment. The engine provides data. The application provides decisions (or surfaces them to the person).
- **Goals and paths** — the engine doesn't know where someone wants to go. It knows where they are (trust state) and what the terrain looks like (graph). Applications use this to compute paths and surface goals.
- **Conversation and modes** — the engine doesn't do conversation. Applications talk to people and feed the resulting signals to the engine. The engine processes trust. The application manages interaction.
- **UI rendering** — the engine produces data, not pixels.
- **LLM prompt engineering** — the engine defines what the LLM needs to produce. How the LLM is prompted is an implementation detail that changes as models improve.
- **Domain graph content** — the engine provides APIs to load and query concept graphs. The actual content is data, not engine logic.
- **Gamification** — deliberately absent. No streak APIs. No point APIs. No badge APIs. This is a design constraint, not an oversight.
- **Role-specific logic** — the engine doesn't know if the person is a learner, a candidate, an employee, or a patient. It knows there is a person and concepts and trust. The application assigns meaning.
