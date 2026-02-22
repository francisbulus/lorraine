# Lorraine — Engine API

**Version:** 0.1 (Draft)
**Last Updated:** February 22, 2026
**Implements:** foundational.md — every API traces to at least one governing principle.

---

## 0. Design Rule

If an API doesn't serve at least one of the eleven principles, it doesn't belong in the engine. If a principle isn't served by at least one API, the engine is incomplete.

---

## 1. Trust APIs

These are the filesystem of the OS. Everything else reads from or writes to trust state.

### 1.1 recordVerification

```
recordVerification({
  conceptId,
  modality,        // grill:recall | grill:inference | grill:transfer |
                   // grill:discrimination | sandbox:execution |
                   // sandbox:debugging | write:explanation |
                   // write:teaching | sketch:diagram | sketch:process |
                   // conversation:unprompted
  result,          // demonstrated | failed | partial
  context,         // what specifically was tested — the question, the code,
                   //   the prompt. This is the provenance.
  timestamp
}) → updatedTrustState
```

**What it does:**
Records a single verification event — one moment where the learner's understanding was observed. This is the atomic write operation to the trust graph. Every grill question answered, every sandbox experiment run, every sketch drawn, every time the learner uses a concept naturally in conversation — each one produces a call to this API.

**Why it exists:**
Without verification events, trust has no evidence (Principle 1). The context field ensures every trust claim has provenance — you can always trace backward and ask "why does the system believe I know this?" (Principle 11 — failure is visible). The modality field enables cross-modality analysis — has understanding been demonstrated from multiple angles? (Trust Propagation Rule 4).

**What it does NOT do:**
It does not decide what to verify next. It does not interpret the result. It just records what happened. Interpretation is the Pedagogical Engine's job.

---

### 1.2 getTrustState

```
getTrustState({
  conceptId,
  learnerId
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
Reads the full trust state for a single concept for a single learner. This is the atomic read operation. The agent calls this constantly — before deciding what to do next, before surfacing a threshold, before choosing a question, before deciding how deep to explain something.

**Why it exists:**
The agent needs to know what the learner knows (Principle 1). The learner needs to be able to see what the system thinks they know (Principle 6 — radical transparency). The distinction between `level` and `confidence` matters: a concept can be `inferred` at 0.8 confidence, which means "we're fairly sure, but it's never been directly demonstrated." The `decayedConfidence` field implements Principle 7 (trust decays) — a concept verified six months ago is worth less than one verified yesterday.

**Critical design decision:**
`inferredFrom` is exposed, not hidden. The learner (or the agent) can always ask: "you say I probably know X — why?" And the answer is traceable: "because you demonstrated Y and Z, and X is related to both." This is epistemic integrity.

---

### 1.3 propagateTrust

```
propagateTrust({
  sourceConceptId,
  verificationEvent
}) → [
  { conceptId, previousState, newState, inferenceStrength, reason }
]
```

**What it does:**
When a verification event occurs on one concept, this computes the ripple effects across the graph. If you verify understanding of TCP handshakes, what does that imply about your understanding of sequence numbers? Of reliable delivery? Each affected concept gets an updated state, and the reason for the update is recorded.

**Why it exists:**
Without propagation, trust stays isolated per concept and never compounds (Trust Graph, Section 3.1 of foundational spec). This is what makes the graph a graph and not a list.

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
  learnerId,
  asOfTimestamp
}) → [
  { conceptId, previousConfidence, decayedConfidence, daysSinceVerified }
]
```

**What it does:**
Runs the decay function across all concepts for a learner. Returns every concept whose effective confidence has dropped since the last check. This is a background process, not user-triggered — it runs whenever the learner starts a session, and the results inform the agent's decisions.

**Why it exists:**
Knowledge fades (Principle 7 — trust decays). A concept verified three months ago is not as reliable as one verified yesterday. Without decay, the trust model goes stale and the agent builds on foundations it shouldn't trust.

**Decay model:**
Exponential decay (Ebbinghaus curve), with two modifiers:
- **Depth of original verification:** Cross-modality verified concepts decay slower. A concept you've demonstrated through grill AND sandbox AND writing has deeper encoding than one you only answered a quiz question about.
- **Structural importance:** Foundational concepts (those with many downstream dependents) decay slower. This is a pragmatic choice — foundational concepts tend to be reinforced by use even when not explicitly re-verified.

---

## 2. Map APIs

These are the display server. They make the terrain visible and navigable.

### 2.1 getMap

```
getMap({
  learnerId,
  domain,           // optional: filter to a specific domain
  centerConceptId,  // optional: center the view on a specific concept
  depth             // how many hops from center to include
}) → {
  nodes: [{
    conceptId,
    name,
    trustState,     // the full getTrustState output
    position,       // coordinates for visualization
    territory       // which territory this belongs to
  }],
  edges: [{
    from, to,
    type,           // prerequisite | component_of | related_to | analogous_to
    inferenceStrength
  }],
  territories: [{
    id, name,
    ownershipLevel  // aggregate trust across all concepts in this territory
  }],
  thresholds: [{
    from: territoryId,
    to: territoryId,
    readinessCriteria  // what "owning" the source territory means
  }]
}
```

**What it does:**
Returns the full map — domain structure, learner state, territories, and thresholds — for rendering. This is what the learner sees when they look at their map. Verified concepts are solid ground. Inferred concepts are sketched in. Untested concepts are fog. Contested concepts are marked.

**Why it exists:**
The agent is a mapmaker (Principle 3). The map is how the learner orients themselves (Principle 4 — terrain ownership). Without the map, the learner has no way to see where they are, where they've been, or where they could go. The map IS the progress indicator — no streaks, no points, no artificial metrics. Just terrain.

**Why territories exist:**
Raw concept graphs are hard to navigate. Territories are human-meaningful clusters — "TCP reliability," "DNS resolution," "HTTP fundamentals." They give the learner a sense of *areas* of understanding rather than individual facts. The threshold between territories is the gate from Principle 5.

---

### 2.2 getThreshold

```
getThreshold({
  learnerId,
  fromTerritoryId,
  toTerritoryId
}) → {
  readinessCriteria: [{
    conceptId,
    requiredTrustLevel,   // what level is needed
    currentTrustLevel,    // what level the learner has
    gap                   // the delta, if any
  }],
  ownershipAssessment,    // aggregate: how much of the source territory
                          //   is verified vs. inferred vs. untested
  agentRecommendation,    // what the agent would say if asked
  learnerDecisionRequired // always true — the agent never decides for the learner
}
```

**What it does:**
Evaluates readiness at a threshold between two territories. Shows the learner (and the agent) exactly what the criteria are, where the learner stands relative to them, and what the gaps are.

**Why it exists:**
The gate is a threshold, not a test (Principle 5). The agent prompts self-reflection, not judgment (Principle 6). This API provides the information the agent needs to say: "Here's the threshold. Here's what readiness looks like. Here's where you are. What do you want to do?" The `learnerDecisionRequired` field is always true — this is a structural enforcement of Principle 6. The system literally cannot make this decision.

**Why `agentRecommendation` exists despite learner agency:**
The best teachers know what the next case should be (from the earlier discussion). The agent has an opinion. It shares it. But it's flagged as a recommendation, not a decision. The learner sees both the raw criteria and the agent's read. They decide.

---

## 3. Verification APIs

These are the process manager. They orchestrate the verification loop.

### 3.1 generateVerification

```
generateVerification({
  learnerId,
  conceptId,          // optional: verify a specific concept
  targetModality,     // optional: request a specific modality
  difficultyAxis,     // optional: recall | inference | transfer | discrimination
  reason              // why this verification is happening:
                      //   threshold_check | spaced_repetition |
                      //   learner_requested | contested_resolution |
                      //   agent_probing | implicit_extraction
}) → {
  type,               // grill_question | sandbox_prompt | write_prompt |
                      //   sketch_prompt | conversational_probe
  content,            // the actual question, prompt, or probe
  expectedSignals,    // what the agent will learn from the response,
                      //   regardless of correctness
  conceptsTested      // may test multiple related concepts at once
}
```

**What it does:**
Generates a verification interaction. This is where the Pedagogical Engine and the LLM collaborate. The engine decides *what* to verify and *why* (based on trust state, decay, frontier analysis, contested concepts). The LLM generates *how* — the actual question or prompt, in natural language, calibrated to the learner.

**Why it exists:**
Verification is how trust is built (Principle 1). Different modalities verify different things at different trust strengths (Section 4.2 of foundational spec). The `reason` field matters — a spaced repetition check feels different from a threshold assessment feels different from the learner asking to be tested. The agent should frame each differently.

**Critical field — `expectedSignals`:**
This encodes what the agent will learn regardless of whether the learner gets it right. A transfer question about TCP designed as "if you were building a reliability protocol from scratch, what's the minimum you'd need?" teaches the agent:
- If correct: the learner can derive principles independently (Principle 2)
- If partially correct: which parts of the principle the learner has internalized
- If incorrect: where the mental model breaks

Every verification is designed to be informative in all outcomes. This is the Socratic principle — good questions teach even when the learner fails (Principle 11 — failure is visible and informative).

---

### 3.2 interpretResponse

```
interpretResponse({
  verificationId,     // links back to the generateVerification call
  learnerResponse,    // what the learner actually said, wrote, coded, or drew
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
Takes the learner's response to a verification prompt and interprets it. This is where the LLM does heavy lifting — understanding natural language answers, evaluating code correctness, assessing sketch accuracy, detecting implicit signals.

**Why it exists:**
The raw response is just text or code or an image. It needs to be translated into trust graph updates. The `evidence` field ensures every update has provenance — the system can always explain *why* it updated a trust score. The `implicitSignals` field captures the richest data — things the learner revealed about their understanding without being asked (Section 5.6 of foundational spec — implicit verification).

**Why `contestedDetected` is a first-class field:**
Contested states are the most informative diagnostic signal in the system. When a response creates a contradiction with previous verification — demonstrated here but failed there — the system needs to flag it immediately, not discover it later. Contested concepts become the highest-priority targets.

---

### 3.3 requestSelfVerification

```
requestSelfVerification({
  learnerId,
  conceptId,          // optional: the learner may not specify
  reason              // learner_uncertain | learner_claims_knowledge |
                      //   learner_challenges_model
}) → generateVerification(...)
```

**What it does:**
The learner initiates verification. "I don't think I actually know this — test me." Or "I know more than your model says — let me prove it." Or just "I'm not sure — can you check?"

**Why it exists:**
Two-way verification (Section 4.1 of foundational spec). The learner is the authority on their own uncertainty (Principle 6 — the learner decides). The system's model is an approximation. The learner has private information — a gut feeling that something isn't solid, or knowledge gained outside the system. This API lets them act on it.

**Why it routes through generateVerification:**
Self-requested verification uses the same generation pipeline, but the `reason` field changes how the agent frames it. A learner who says "I'm not sure I know this" needs a different tone than a learner being probed by spaced repetition. The verification itself is structurally identical — only the framing changes.

---

## 4. Navigation APIs

These power learner movement through the terrain.

### 4.1 setGoal

```
setGoal({
  learnerId,
  goalType,          // concept | territory | capability
  targetId,          // what they want to reach
  approach,          // depth_first | breadth_first | learner_directed
  urgency            // exploratory | deliberate | deadline (with date)
}) → {
  currentPosition,   // where the learner is now relative to the goal
  suggestedPath,     // the agent's recommended route (not binding)
  requiredFoundations, // concepts that need trust before the goal is reachable
  foundationGaps     // which of those foundations are untested or low-trust
}
```

**What it does:**
The learner declares where they want to go. The system computes the landscape between here and there — what foundations are needed, which are solid, which have gaps.

**Why it exists:**
Without goals, the agent can't show relevant terrain or compute paths (Primitives Summary — learner goal). The `approach` field respects Principle 8 (approach-agnostic) — the system adapts to depth-first, breadth-first, or fully learner-directed navigation. The `urgency` field matters because "I'm curious about cryptography" and "I need to pass a security cert in 30 days" demand different strategies.

**Why `suggestedPath` is not binding:**
Principle 6. The agent has an opinion. It shares it. The learner decides. The suggested path is a recommendation on the map, not a locked route.

---

### 4.2 crossThreshold

```
crossThreshold({
  learnerId,
  fromTerritoryId,
  toTerritoryId,
  learnerConfirmed   // the learner explicitly decided to cross
}) → {
  entered,           // true if crossed
  newTerritory,      // map data for the new territory
  returnPath,        // explicit: here's how to get back
  foundationSnapshot // snapshot of trust state at crossing time,
                     //   so the system can detect if foundations
                     //   erode while the learner is in new territory
}
```

**What it does:**
The learner crosses a threshold into new territory. The system records the crossing, provides the new map, and — critically — preserves a clear return path and snapshots the foundation.

**Why it exists:**
The gate is a threshold, not a test (Principle 5). Crossing requires learner confirmation — `learnerConfirmed` must be true. The `returnPath` is explicit because the learner needs to know they can always come back (Principle 7 — collapsing cost of action). The `foundationSnapshot` enables the agent to later say: "When you entered this territory, your understanding of X was strong. It's been a while — want to re-check before building further?"

**Why `learnerConfirmed` is required:**
Structural enforcement of agency. The system cannot cross a threshold on the learner's behalf. This is not a UX nicety — it's an engine-level constraint.

---

## 5. Agent Epistemics APIs

These are the agent's self-monitoring system. The agent watches itself.

### 5.1 calibrate

```
calibrate({
  learnerId
}) → {
  predictionAccuracy,   // when the agent predicted success/failure,
                        //   how often was it right?
  overconfidenceBias,   // does the agent consistently overestimate
                        //   the learner's knowledge?
  underconfidenceBias,  // does it consistently underestimate?
  stalePercentage,      // what % of the model is based on old
                        //   inferences vs. recent verification?
  surpriseRate,         // how often does the learner's performance
                        //   differ significantly from prediction?
  recommendation        // what the agent should do to improve its model
}
```

**What it does:**
The agent audits its own model quality. This is meta-trust — the agent's trust in its own trust model.

**Why it exists:**
Section 5.3 of the foundational spec — the agent must trust its own model. If calibration is poor (predictions don't match reality), the agent's decisions are unreliable. The `recommendation` field might say: "Model is 40% stale — prioritize re-verification of foundational concepts" or "Overconfidence bias detected — lower trust propagation strength."

**Why this matters practically:**
Without self-calibration, the agent degrades silently. It keeps making decisions based on a model that's drifting from reality. The learner experiences this as "the system keeps suggesting things that are too easy" or "it thinks I know things I don't." Calibration catches this drift.

---

### 5.2 explainDecision

```
explainDecision({
  decisionType,       // threshold_suggestion | verification_choice |
                      //   mode_transition | path_recommendation
  decisionContext     // the specific decision to explain
}) → {
  reasoning,          // why the agent made this decision
  trustInputs,        // which trust states informed it
  alternatives,       // what else the agent considered
  confidence          // how confident the agent is in this decision
}
```

**What it does:**
Makes the agent's reasoning transparent. When the agent suggests a threshold check or recommends a path, the learner (or a developer debugging the system) can ask "why?" and get a traceable answer.

**Why it exists:**
Epistemic integrity. The agent must be honest about its reasoning (Section 5.2 of foundational spec). This also serves Principle 6 — the learner needs to understand the agent's recommendation to make an informed decision about whether to follow it.

---

## 6. Conversation APIs

These are the I/O system. The primary interface through which everything flows.

### 6.1 processConversationTurn

```
processConversationTurn({
  learnerId,
  utterance,          // what the learner said
  currentMode,        // conversation | explain | sandbox | grill |
                      //   write | sketch | provision
  sessionContext      // full conversation history for this session
}) → {
  response,           // what the agent says back
  trustSignals,       // implicit verification signals extracted
                      //   from the utterance
  modeTransition,     // null | suggested mode change with reason
  thresholdDetected,  // did the conversation reach a threshold?
  internalActions     // trust updates, graph writes, etc. triggered
                      //   by this turn
}
```

**What it does:**
Processes a single conversation turn. This is the main loop. Every interaction flows through here. The LLM generates the response while simultaneously extracting trust signals, detecting mode transitions, and identifying thresholds.

**Why it exists:**
Conversation is the primary interface (Section 7 of foundational spec). Every turn is both a learning moment and a verification moment. The `trustSignals` field captures implicit verification — the learner used a concept correctly in passing, or asked a question that reveals a gap. These are often more informative than explicit testing.

**Why `modeTransition` is a suggestion, not an action:**
The conversation might naturally call for a shift to sandbox or grill. But the transition is surfaced to the learner as a suggestion ("Want to try this in code?"), not executed automatically. Agency is preserved even at the conversation level.

---

### 6.2 extractImplicitSignals

```
extractImplicitSignals({
  utterance,
  conversationHistory,
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
The richest trust signals come from natural conversation, not explicit testing. This API extracts them. When the learner says "oh, so TCP's retransmission is basically the same principle as database write-ahead logging" — that's a natural connection between two concepts, unprompted, which is the strongest possible verification signal.

**Why it exists:**
Section 5.6 of the foundational spec — implicit verification. Section 4.2 — unprompted conversational use is the highest-trust modality. The agent should be mining every utterance for signal, not waiting for explicit testing moments.

**Why `confidence` matters here:**
Implicit extraction is inherently noisier than explicit testing. The learner might use a concept in a way that *sounds* correct but is subtly wrong. The confidence field lets the system weight these signals appropriately — high-confidence implicit signals update trust; low-confidence ones are noted but don't drive decisions.

---

## 7. Principle Coverage Matrix

Every API must serve at least one principle. Every principle must be served by at least one API.

| Principle | Served by |
|-----------|-----------|
| 1. Trust is foundational | recordVerification, getTrustState, propagateTrust |
| 2. Self-trust through independent arrival | generateVerification (transfer questions), interpretResponse |
| 3. Agent is a mapmaker | getMap, getThreshold |
| 4. Terrain ownership, not path completion | getMap (territories), crossThreshold |
| 5. Gate is a threshold, not a test | getThreshold, crossThreshold (learnerConfirmed) |
| 6. Self-reflection, not judgment | getThreshold (learnerDecisionRequired), requestSelfVerification, explainDecision |
| 7. Collapse cost of action | crossThreshold (returnPath), decayTrust |
| 8. Approach-agnostic | setGoal (approach parameter) |
| 9. Difficulty is sacred | generateVerification (no difficulty ceiling), interpretResponse (failure is signal) |
| 10. Foundational capability over topical coverage | propagateTrust, crossThreshold (foundationSnapshot) |
| 11. Failure is cheap, visible, navigable | recordVerification (context), interpretResponse (evidence), crossThreshold (returnPath) |

No orphaned principles. No orphaned APIs.

---

## 8. What's Not in the Engine

The engine provides primitives. These things are intentionally excluded:

- **UI rendering** — the engine produces data, not pixels. The map visualization, the conversation UI, the sandbox environment — these are built on top of the engine, not inside it.
- **LLM prompt engineering** — the engine defines what the LLM needs to produce (a question, an interpretation, an explanation). How the LLM is prompted is an implementation detail that changes as models improve.
- **Domain graph content** — the engine provides APIs to read and write concept graphs. The actual content (what are the concepts in networking? how do they relate?) is data, not engine logic.
- **Gamification** — deliberately absent. No streak APIs. No point APIs. No badge APIs. The map is the progress indicator. Trust is the score. This is a design constraint, not an oversight.
- **Specific modality implementations** — the engine knows about modalities (grill, sandbox, write, sketch, provision). It does not implement them. The sandbox runtime, the sketch canvas, the text editor — these are applications running on the OS. The engine provides the trust and verification layer they all write to.
