# Terrain — Tech Spec

**Version:** 0.2 (Draft)
**Last Updated:** February 22, 2026
**Source:** SPEC.md v0.2

This document covers how Terrain works technically: the conversation loop, operational guardrails, engine API mapping, and implementation phases. For product philosophy, agent behavior, modes, and user experience, see product.md.

---

## 1. The Conversation Loop

Every interaction follows this loop:

```
1. Learner says something

2. Agent processes the utterance:
   a. Calls services extractImplicitSignals
   b. Applies the implicit signal write policy (see 2.1) to decide which signals
      are written to core vs. held as candidate signals
   c. Extracts any explicit self-assessment language → records as claim events
      to core via recordClaim (see 2.2 for extraction rules)
   d. Reads current derived trust state from core via getTrustState

3. Agent determines what the learner needs:
   - An explanation? → Explain mode
   - A question? → Grill mode (via services generateVerification)
   - A code environment? → Sandbox mode
   - A threshold check? → Surface the threshold
   - A Sekiro moment? → Prompt cross-domain recognition
   - Nothing — they're exploring? → Step back, stay quiet

4. Agent generates response:
   - Uses LLM (via services layer), informed by current derived trust state
   - Calibrates depth, difficulty, and framing to the learner's state
   - If the learner's self-calibration gap is relevant, surfaces it naturally

5. Agent checks if a mode transition would help
   - If yes, suggests it. Does not force it.

6. Response is delivered

7. Loop repeats
```

The critical part is step 2. Every turn, before the agent even decides what to say, it extracts implicit signals and claims. This is what makes the trust model continuous rather than episodic. The learner is always being observed — not tested, observed. The model updates constantly from the richest signal source: natural conversation.

---

## 2. Operational Guardrails

These prevent the application from quietly breaking the engine's epistemic integrity. They are not philosophy — they are implementation rules.

### 2.1 Implicit Signal Write Policy

The services layer's `extractImplicitSignals` produces candidate signals from every utterance. Not all of them should be written to the core as verification events. Writing too freely inflates trust (violates Invariant 2).

**Auto-write allowed for fail-side signals:**

- `incorrect_usage` — always write. Failure is the most informative event (Invariant 4).
- `question_revealing_gap` — always write. Gaps are diagnostic.
- `confusion_signal` — always write. Confusion is honest signal.

**Auto-write allowed for success-side signals only when ALL of:**

- `correct_usage` or `natural_connection_made` or `sophistication_increase`
- The concept is already `verified` or `inferred` (not `untested` — you can't verify something to `verified` from an implicit signal alone if there's no prior evidence)
- Extractor confidence ≥ 0.85
- Evidence includes a reasoning trace, not just keyword presence ("used the word TCP" is not evidence; "correctly explained why retransmission needs acknowledgments" is evidence)

**Otherwise:** store as app-local candidate signals. These are visible in the application's internal log but do not write to the engine core. They can be upgraded to verification events through explicit verification (grill, write, sandbox) that confirms the signal was real.

**`self_correction` signals:** always write. A person catching and correcting their own error is strong evidence of active model-building regardless of the concept's current trust state.

### 2.2 Claim Extraction Rules

The agent captures claims from natural conversation, but only when the learner explicitly expresses self-assessment. The agent does not infer claims from tone, hedging, or indirect phrasing.

**Record a claim event when the learner says:**

- "I know this" / "I understand this" / "I've got this"
- "I don't know this" / "I'm lost" / "I don't understand"
- "I think I understand" / "I'm not sure" / "I'm pretty confident"
- "I already know X" / "I've never seen X before"
- Any explicit self-assessment of their own understanding

**Do NOT record a claim when:**

- The learner's tone sounds uncertain but they haven't said so
- The learner pauses or hesitates (behavioral signals, not claims)
- The learner asks a question (questions reveal gaps — that's an implicit signal, not a claim)
- The phrasing is ambiguous

**If ambiguous:** the agent can ask one neutral clarifying question before deciding whether to write a claim: "Are you saying you feel solid on this, or that you're still working through it?" The answer is the claim. The question is not a test.

This prevents noisy calibration data. The claim-evidence gap is only meaningful if claims are genuine self-assessments, not artifacts of extraction noise.

### 2.3 Event Visibility and Challengeability

The system writes to the core silently — the learner doesn't see API calls. But Invariant 3 requires that the model is transparent and challengeable. The application implements this through:

**Level-change notifications:** Whenever a concept changes trust level (e.g., untested → inferred, inferred → verified, verified → contested), the UI surfaces a brief notification: "TCP retransmission updated to verified — based on your explanation just now." The notification links to `explainDecision` for the full reasoning.

**Quiet mode (optional):** The learner can toggle a mode where implicit writes are buffered as "pending signals" rather than written immediately. The learner reviews pending signals and accepts or dismisses them. This gives full control to learners who want it, without burdening learners who don't.

**Challenge at any time:** The learner can always tap/click any concept on the map and see: current trust level, why the system believes this (verification history + inference chain via `explainDecision`), and an option to challenge ("test me on this" via `requestSelfVerification`).

Challengeability is not just a UI feature. It's how the learner develops trust in the system's model of them. If they can't see why the system believes something, they can't trust it — and if they can't trust the model, the model is useless regardless of its accuracy.

### 2.4 Signal Deduplication

Implicit extraction can produce repeated signals within a single conversation — the learner mentions TCP three times in five minutes, and each mention produces a `correct_usage` signal.

**Rule:** Deduplicate identical implicit signals within a 10-minute rolling window per `conceptId + signalType + modality`. The first signal in the window is recorded. Subsequent identical signals within the window are discarded.

Explicit verification events (grill, sandbox, write, sketch) are never deduplicated — each is a distinct assessment.

This prevents spammy event logs and keeps the verification history meaningful.

---

## 3. How the Application Uses the Engine

Concrete mapping from application behavior to engine API calls. Terrain interacts with both the core and services layers.

### Core API usage:

|Application behavior|Core API calls|
|---|---|
|Show the map|`getGraph(personId)` → render with trust overlay|
|Check if learner owns a territory|`getBulkTrustState(personId, conceptIds)`|
|Surface a threshold|`getBulkTrustState` on readiness criteria → compare to requirements|
|Learner asks a question|`getTrustState` on relevant concepts → calibrate explanation depth|
|Record a verification|`recordVerification` with event details|
|Record a claim|`recordClaim` with self-reported confidence|
|Learner returns after time away|`decayTrust` → show updated map|
|Learner asks "why do you think I know this?"|`explainDecision`|
|Agent checks its own accuracy|`calibrate` (includes claim calibration)|
|Show self-calibration view|`calibrate` + `getBulkTrustState` + claim history|
|Load a new domain|`loadConcepts` with concepts and edges from domain package|
|Correct a bad event|`retractEvent` with reason|

### Services API usage:

|Application behavior|Services API calls|
|---|---|
|Agent grills the learner|`generateVerification` → deliver → `interpretResponse` → core `recordVerification`|
|Learner says something (implicit signals)|`extractImplicitSignals` → core `recordVerification` for signals found|
|Learner challenges the model|`requestSelfVerification` → `generateVerification`|

The application orchestrates. The core computes trust. The services generate and interpret language. Clean three-layer separation.

---

## 4. Implementation Phases

### Phase 1: Conversation + Grill + Claims + MVP Map

Minimum viable learning experience:

- Engine core: trust APIs, graph APIs (already building)
- Engine services: generateVerification, interpretResponse, extractImplicitSignals (single LLM provider — Anthropic)
- Application: conversation loop with implicit signal extraction (with write policy), claim capture (with extraction rules), and deduplication
- Application: grill mode for explicit verification
- Application: event visibility (level-change notifications)
- One domain loaded (networking)

**MVP map — the minimum viable terrain view:**

The full visual map (fog of war, node-edge rendering, territory visualization) is Phase 2. Phase 1 ships a territory list view:

```
TCP Reliability
  ████████░░  80% verified  |  10% inferred  |  10% untested
  Contested: (none)

DNS Resolution
  ██░░░░░░░░  20% verified  |  30% inferred  |  50% untested
  Contested: dns-caching (demonstrated recall, failed inference)

HTTP Fundamentals
  ░░░░░░░░░░  0% verified  |  40% inferred  |  60% untested
  Contested: (none)

→ Next threshold: TCP Reliability → Flow Control
  Readiness: 2/3 concepts verified (missing: tcp-retransmission-timers)
```

Per territory: % verified, % inferred, % contested, % untested. Top contested concepts called out. Next threshold readiness checklist if applicable.

This is not the map. It's the dashboard that proves the trust model is producing useful signal before investing in visualization.

This validates: does the trust model update meaningfully from conversation? Do grill questions feel right? Does the learner experience self-trust through independent arrival? Do claim events capture naturally? Does the MVP map help the learner orient?

### Phase 2: Explain + Sandbox + Map + Self-Calibration

Add depth:

- Application: explain mode with depth ladder calibrated to derived trust state
- Application: sandbox mode with annotation engine
- Application: visual map of the concept graph with trust overlay
- Application: self-calibration view (claim vs. evidence gap)
- Application: mode transitions between explain, sandbox, and grill

This validates: do mode transitions feel natural? Does the map help the learner orient? Does the sandbox annotation add value over a plain REPL? Does the self-calibration view help the learner develop epistemic self-awareness?

### Phase 3: Full Modes + Cross-Domain + Sekiro

Complete the experience:

- Application: sketch, write, and provision modes
- Multiple domains with cross-domain trust (shared concept ids)
- Threshold surfacing with readiness criteria
- Agent self-calibration visible to the learner (core `calibrate`)
- Sekiro prompts: cross-domain principle recognition
- Goal setting and path suggestions
- The principles layer (future — see domain-schema.md)

This validates: does the full experience cohere? Do all six modes serve distinct verification purposes? Does cross-domain trust feel right? Do Sekiro moments produce the strongest trust signals?
