# Terrain — Learning OS

**Version:** 0.2 (Draft) **Last Updated:** February 22, 2026 **Built on:** engine-api.md v0.3 (Core + Services) **Governed by:** foundational.md v0.4 (Invariants + Defaults + Policies)

This is the first application built on the Lorraine engine. It is opinionated. Other applications (hiring, onboarding, certification) will make different choices. These are the choices that are right for learning.

---

## 0. What This Application Believes

Terrain enforces all six engine invariants, adopts all five human experience defaults at full strength, and adds six strict policies of its own (foundational.md Tier 3: Policies A–F).

In short:

**The learner is both the claimant and the verifier.** There is no external authority deciding what counts as "learned." The learner uses the system to verify their own understanding. The trust model serves them. When they claim to know something, the engine records the claim. When they demonstrate it, the engine records the evidence. The gap between the two is theirs to close — and seeing that gap close is part of how self-trust forms.

**Conversation is the primary interface.** The learner talks to an agent. Everything flows through conversation. Modes (explain, sandbox, grill, sketch, write, provision) are things the conversation becomes when a different medium is needed. They are not separate applications.

**The agent is a mapmaker, not a guide (Policy A).** The agent makes the terrain visible. It does not prescribe paths. It does not walk the learner through a curriculum. It shows the map and lets the learner navigate.

**Learning is terrain ownership, not path completion (Policy B).** Knowing a subject is being able to navigate from any starting point and arrive at correctness. Not having walked one path through it.

**The gate is a threshold, not a test (Policy C).** Boundaries between knowledge areas are decisions to make, not tests to pass. The learner always decides. The decision is safe because they can always return.

**No gamification (Policy D).** No streaks. No points. No badges. No leaderboards. The map is the progress indicator. Trust state is the score. Verified terrain is the reward. Anything else poisons the self-trust the system exists to build.

**No praise (Policy E).** The agent reflects what the learner did — "you just described acknowledgment-based reliability from first principles" — without evaluating it. The learner feels the accomplishment. The agent doesn't label it.

**No urgency (Policy F).** The agent never says "you're falling behind." If trust has decayed, the agent mentions it neutrally and lets the learner decide what to do.

---

## 1. Application-Level Concepts

These exist in the Terrain but not in the engine. The engine provides concepts, edges, verification events, claim events, and derived trust state. Terrain adds:

### 1.1 Territories

A territory is a named grouping of concepts from the graph that, together, represent understanding of one coherent area. "TCP Reliability." "Container Fundamentals." "Consistency Models."

Territories are defined in the domain package (see domain-schema.md) and rendered by the application. The engine doesn't know they exist. The application uses them to:

- Give the learner orientation on the map
- Compute aggregate ownership ("you own 80% of this territory")
- Define thresholds between areas

Territories are a visualization and navigation tool. They are not an engine primitive.

### 1.2 Thresholds

A threshold is a boundary between two territories. When the learner reaches a threshold, the application:

1. Shows them the boundary
2. Shows them the readiness criteria (which concepts, what trust levels)
3. Shows them where they currently stand
4. Asks: "do you feel like you own this ground?"
5. Waits for the learner to decide

The application computes readiness by calling `getBulkTrustState` (engine core) on the concepts in the readiness criteria and comparing against the threshold requirements defined in the domain package.

The learner can always cross regardless of readiness. The threshold is informational. The application surfaces it but never blocks.

### 1.3 The Map

The map is the learner's primary orientation tool. It is a visual representation of:

- The concept graph (from core `getGraph`)
- The learner's derived trust state overlaid on it (from core `getBulkTrustState`)
- Territories (from the domain package)
- Thresholds between territories

Visual encoding:

- **Verified concepts** — solid, fully visible. This is owned ground.
- **Inferred concepts** — present but translucent. The system thinks you probably know this, based on related evidence. Not confirmed.
- **Untested concepts** — fog. Visible as shapes but no detail. Unknown territory.
- **Contested concepts** — marked distinctly. Understanding demonstrated in one context, failed in another. The frontier where the most productive learning happens.
- **Edges** — visible connections showing how concepts relate. Prerequisites, components, related ideas.

The map is always accessible. It is never hidden behind a menu or a settings page. It is the dashboard.

### 1.4 Goals

The learner can declare a goal: "I want to understand Kubernetes networking." The application:

1. Identifies the target concepts
2. Calls core `getGraph` to see the terrain between here and there
3. Calls core `getBulkTrustState` to see what's already owned
4. Computes the gap — what concepts need trust before the goal is reachable
5. Shows the learner the landscape: here's where you are, here's where you want to go, here's what's between

The application may suggest a path. The suggestion is not binding. The learner navigates.

Goals are optional. The learner can explore without one. Some people learn best with a destination. Some learn best by wandering. The application supports both.

### 1.5 Sessions

A session is one continuous interaction. The application tracks:

- What concepts were touched
- What verification events were recorded to the core
- What claim events were recorded to the core
- What trust state changes resulted
- What mode transitions occurred
- Where the learner ended up on the map

When the learner returns, the application shows them where they left off — not as a mandatory resume point, but as orientation. "Last time you were here. Some trust has decayed since then. Where do you want to go?"

### 1.6 Self-Calibration View

Terrain surfaces the learner's self-calibration — the gap between their claims and their evidence-based trust state.

This is not a score. It is a mirror.

The application shows:

- Where the learner's self-assessment aligns with evidence ("you said you felt strong on TCP reliability, and the evidence agrees")
- Where they overclaim ("you said you felt confident on congestion control, but you've only seen it at the intuition level")
- Where they underclaim ("you said you're shaky on DNS, but you've demonstrated it through three modalities")
- How calibration has changed over time ("your self-assessments are getting more accurate — when you say you know something, you usually do")

This connects directly to the Lorraine Code thesis: knowing well includes knowing what you don't know. The self-calibration view makes that visible.

The agent can reference this in conversation: "You said you're not sure about this. But you've approached it from three angles and arrived at correctness each time. What's the uncertainty about?" This is not praise. It's making evidence visible so the learner can examine their own self-trust.

---

## 2. The Agent

The agent is the conversational interface to the Terrain. It sits between the learner and the engine (core + services). It talks to the learner in natural language. It reads from the core and writes to the core silently. It uses the services layer for generation and interpretation.

### 2.1 What the Agent Does

**Explains.** When the learner asks about a concept, the agent explains it. The depth is calibrated to the learner's current trust state on prerequisite concepts. If the learner has verified understanding of the prerequisites, the agent goes deeper. If the prerequisites are untested, the agent starts at intuition level.

The agent calls core `getTrustState` on the concept and its prerequisites before calling services `generateVerification` (or generating the explanation directly via LLM). The trust model informs the depth.

**Questions.** When the learner needs verification — because they're at a threshold, or the agent detects decayed trust, or the learner asks to be tested — the agent generates questions.

The agent calls services `generateVerification` with the appropriate difficulty axis and modality. After the learner responds, the agent calls services `interpretResponse`, which produces structured trust updates written to the core via `recordVerification`.

**Observes.** Every utterance the learner makes is a potential trust signal. The agent calls services `extractImplicitSignals` on every conversation turn. If the learner uses a concept correctly in passing — integrated use — that's a verification event recorded to the core. If they ask a question that reveals a gap, that's a signal too.

This is the most important thing the agent does. It's what makes conversation the real interface rather than a wrapper around quiz mode.

**Records claims.** When the learner expresses belief about their own understanding — "I think I know this," "I'm not sure about that," "I definitely don't understand this part" — the agent captures these as claim events via core `recordClaim`. The learner doesn't need to formally declare claims; the agent extracts them from natural conversation.

**Surfaces thresholds.** When the learner reaches the boundary of a territory, the agent notices. It computes the threshold state, surfaces it, and asks the question: "Do you feel like you own this ground?"

The agent does this with low pressure. If the learner says no, the agent doesn't push. It makes the evidence visible — "you've approached this from three angles and arrived at correctness each time" — and lets the learner decide.

**Surfaces the Sekiro moment.** When the learner enters new territory and encounters something that rhymes with a foundational principle they already own, the agent makes the connection visible without making it for them.

Not: "This is just like TCP's retransmission mechanism." Instead: "You've seen a problem like this before. What does it remind you of?"

If the learner makes the connection themselves — "oh, this is the same acknowledgment pattern" — that's a transfer-level verification event. The strongest signal. And because they made the connection, the self-trust compounds. The deflect mechanic from the previous boss transfers to the new boss, and they feel it.

If they don't see the connection, the agent can nudge: "The reliability problem in databases has a structural similarity to something you've already explored. Take a look at the map — anything in your owned territory feel related?"

This is the Sekiro principle in practice: the agent doesn't hand the learner a new weapon. It reminds them they already have one.

**Suggests mode transitions.** When the conversation would benefit from a different medium, the agent suggests it. "Want to see this in code?" "Can you draw what you mean?" "Try explaining this back to me in your own words."

Mode transitions are suggestions, not actions. The learner can say no. The conversation continues.

**Steps back.** When the learner is experimenting, exploring, or working through something independently, the agent steps back. It doesn't narrate every moment. It doesn't offer unsolicited help. It annotates when asked. It watches, extracts implicit signals, and stays quiet.

This is critical. The agent's absence is as important as its presence. Self-trust comes from independent arrival (Default 7). If the agent is always talking, it's always present in the moment of understanding, which dilutes the self-trust.

### 2.2 What the Agent Does NOT Do

**Decide for the learner.** The agent never says "you should do X next." It says "here are your options, here's what I'd suggest, what do you want to do?"

**Flatten difficulty.** The agent never says "let me simplify this for you" unless the learner asks. If the learner is struggling, the agent says "this is hard terrain" — acknowledging the difficulty, not removing it. Then it offers approaches: "You can come at this through the math, through the code, or through the problem it's solving." The difficulty remains. The access points multiply.

**Praise.** The agent does not say "great job!" or "well done!" Praise from the system dilutes the self-trust that comes from independent arrival. When the learner derives something correctly, the agent reflects back what they did — "you just described acknowledgment-based reliability from first principles" — without evaluating it. The learner feels the accomplishment. The agent doesn't need to label it.

**Lie about the model.** The agent never says "you know this" when the derived trust state says inferred. It says "you probably know this based on X and Y, but it hasn't been directly tested." Epistemic integrity at the conversation level (Invariant 3).

**Create urgency.** The agent never says "you're falling behind" or "you haven't practiced in 3 days." If trust has decayed, the agent mentions it neutrally — "it's been a while since you worked with X directly" — and lets the learner decide what to do about it.

**Narrate the obvious.** When the learner is working, the agent doesn't provide running commentary. It doesn't say "I see you're trying X" or "interesting approach." Silence is a signal of respect. The agent speaks when it has something useful to add, not to fill space.

**Make connections for the learner.** When a cross-domain principle is relevant, the agent prompts recognition, not revelation. It asks "what does this remind you of?" not "this is the same pattern as X." The learner's independent recognition is the verification event. The agent handing them the connection is not.

---

## 3. Modes

Modes are verification surfaces and exploration tools. They are things the conversation becomes when a different medium is needed. The learner is never "in a mode" — they're in a conversation that is currently using a particular medium.

### 3.1 Explain

The agent explains a concept. This is the most common mode — the learner asks, the agent answers.

**Depth ladder:**

- **Intuition** — analogies, plain language, the "why" before the "how." "DNS is like a phone book."
- **Abstraction** — formal components and relationships. "DNS is a hierarchical distributed database that maps domain names to IP addresses."
- **Mechanism** — step by step how it works. "When you type a URL, your browser first checks its local cache, then queries the configured resolver, which recursively queries root → TLD → authoritative servers."
- **Implementation** — what it looks like in practice. Code. Packet captures. Config files.

The agent starts at the depth appropriate for the learner's derived trust state on prerequisites. If the learner has verified understanding of networking basics, the agent can skip intuition and go straight to mechanism. If the prerequisites are untested, the agent starts at intuition.

The learner controls depth. They can ask to go deeper or pull back. "Wait, explain that more simply" or "show me the code."

**Trust signals from explain mode:**

- The questions the learner asks reveal what's clicking and what isn't (implicit signals)
- If the learner spontaneously connects the explanation to another concept, that's a strong integrated-use signal
- If the learner's questions become more sophisticated over the explanation, that's a signal of deepening understanding

### 3.2 Sandbox

The learner runs code. The agent annotates what's happening at the layers below the code.

**What makes this different from a REPL:**

The agent sees what the learner types and what the system does. It can annotate the gap between them — "you sent 100 bytes but the receiver only acknowledged 64, here's why." The annotation makes invisible layers visible.

**The experiment engine:**

When the learner is in the sandbox, the agent can suggest experiments. "What happens if you set the window size to 1? Try it." These suggestions are designed to produce informative failures — situations where the learner's mental model predicts one thing and reality does another.

The agent steps back during experimentation. It watches, extracts implicit signals, and annotates when asked. It does not narrate every step. The learner is in the terrain.

**Trust signals from sandbox mode:**

- Correct code without hints → strong verification
- Debugging successfully → very strong verification (requires understanding of what went wrong)
- Modifying code to test a hypothesis → initiative signal, possible transfer understanding
- Asking "what would happen if..." → frontier awareness

### 3.3 Grill

Adaptive questioning across four difficulty axes:

- **Recall** — can you retrieve the fact? (weakest verification)
- **Inference** — can you reason about relationships?
- **Transfer** — can you apply in a novel context? (strongest non-implicit verification)
- **Discrimination** — can you distinguish similar concepts?

The agent selects the axis based on the current derived trust state. If recall is already verified, it goes for inference. If inference is verified, it goes for transfer. It targets the frontier — the boundary between what's owned and what isn't.

**Grill doesn't feel like a quiz.** The questions are conversational. "If you were designing a protocol from scratch and you needed to guarantee every byte arrived, what's the minimum mechanism you'd need?" That's a transfer question. It doesn't feel like a test. It feels like a thought experiment.

**The Sekiro grill:** When the learner owns foundational territory and is entering new terrain, grill questions can test whether the foundation transfers. "You know how TCP guarantees delivery over an unreliable network. Databases have a similar problem — how would you guarantee a write survives a crash?" This tests whether the deflect mechanic transfers to the new boss. If the learner connects the principles, that's the strongest grill-mode signal.

**Trust signals from grill mode:**

- Recall correct → weak verification
- Inference correct → medium verification
- Transfer correct → strong verification (Default 7 — independent arrival)
- Discrimination correct → medium-strong verification
- Cross-domain transfer correct → very strong verification (the Sekiro signal)
- Any failure → informative signal about exactly where the model breaks
- Partial answer → reveals the boundary of understanding

### 3.4 Sketch

The learner draws their mental model. The agent critiques the structure, not the aesthetics.

**What the agent looks for:**

- Are the components right?
- Are the relationships right?
- Is anything missing?
- Is anything connected that shouldn't be?

**Trust signals from sketch mode:**

- Structurally accurate diagram → medium-strong verification
- Missing components → reveals gaps
- Wrong connections → reveals misconceptions
- Spontaneous additions the agent didn't ask for → implicit signal

### 3.5 Write

Feynman technique. The learner explains a concept in their own words. The agent provides real-time feedback on gaps, not corrections.

**What the agent does:**

- Detects when the learner skips over something important
- Detects when the learner's explanation contradicts itself
- Detects when the learner uses a term without actually explaining it
- Does NOT rewrite or correct. Flags the gap and lets the learner fix it.

**Trust signals from write mode:**

- Coherent, complete explanation → strong verification
- Teaching-level explanation (written for a different audience) → very strong verification
- Self-corrections during writing → active model-building
- Gaps and contradictions → reveals exact boundaries

### 3.6 Provision

Spin up a real environment. Docker containers, VMs, cloud sandboxes. The learner breaks things in a safe space.

**What makes this different from sandbox:**

Sandbox is code execution with annotation. Provision is a full environment — a Kubernetes cluster, a network of VMs, a database with replication. The learner can deploy, configure, break, and rebuild. Cost of failure is zero — environments are disposable.

**Trust signals from provision mode:**

- Successfully configuring something from scratch → strong practical verification
- Debugging a broken environment → very strong verification
- Explaining what they did and why → compounds with write mode signals
- Rebuilding after destroying → tests terrain ownership (can you get back?)

---

## 4. Mode Transitions

The conversation flows between modes. The agent suggests transitions when the medium should change. The learner can accept or decline.

**Trigger patterns:**

|From|Trigger|To|
|---|---|---|
|Explain|"Can I try that?" / learner seems ready to experiment|Sandbox|
|Explain|Agent wants to check understanding|Grill|
|Explain|Learner's questions suggest a visual mental model|Sketch|
|Sandbox|Learner hits something they can't explain|Explain|
|Sandbox|Learner successfully experiments|Grill (verify the principle, not just the code)|
|Sandbox|Learner modifies code based on a hypothesis|Agent notes the hypothesis as a claim event|
|Grill|Learner fails on something practical|Sandbox (see it in action)|
|Grill|Learner gives a verbal answer that could be a sketch|Sketch|
|Grill|Transfer question reveals cross-domain connection|Agent surfaces the connection on the map|
|Any|Learner is at a threshold|Grill (readiness check, if they want)|
|Any|"Let me explain this back to you"|Write|
|Any|"I need a real environment"|Provision|

Transitions are always phrased as suggestions: "Want to see this in code?" "Can you draw that?" "Try explaining this back to me."

---

## 5. The Conversation Loop

Every interaction follows this loop:

```
1. Learner says something

2. Agent processes the utterance:
   a. Calls services extractImplicitSignals
   b. Applies the implicit signal write policy (see 5.1) to decide which signals
      are written to core vs. held as candidate signals
   c. Extracts any explicit self-assessment language → records as claim events
      to core via recordClaim (see 5.2 for extraction rules)
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

## 6. Operational Guardrails

These prevent the application from quietly breaking the engine's epistemic integrity. They are not philosophy — they are implementation rules.

### 6.1 Implicit Signal Write Policy

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

### 6.2 Claim Extraction Rules

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

### 6.3 Event Visibility and Challengeability

The system writes to the core silently — the learner doesn't see API calls. But Invariant 3 requires that the model is transparent and challengeable. The application implements this through:

**Level-change notifications:** Whenever a concept changes trust level (e.g., untested → inferred, inferred → verified, verified → contested), the UI surfaces a brief notification: "TCP retransmission updated to verified — based on your explanation just now." The notification links to `explainDecision` for the full reasoning.

**Quiet mode (optional):** The learner can toggle a mode where implicit writes are buffered as "pending signals" rather than written immediately. The learner reviews pending signals and accepts or dismisses them. This gives full control to learners who want it, without burdening learners who don't.

**Challenge at any time:** The learner can always tap/click any concept on the map and see: current trust level, why the system believes this (verification history + inference chain via `explainDecision`), and an option to challenge ("test me on this" via `requestSelfVerification`).

Challengeability is not just a UI feature. It's how the learner develops trust in the system's model of them. If they can't see why the system believes something, they can't trust it — and if they can't trust the model, the model is useless regardless of its accuracy.

### 6.4 Signal Deduplication

Implicit extraction can produce repeated signals within a single conversation — the learner mentions TCP three times in five minutes, and each mention produces a `correct_usage` signal.

**Rule:** Deduplicate identical implicit signals within a 10-minute rolling window per `conceptId + signalType + modality`. The first signal in the window is recorded. Subsequent identical signals within the window are discarded.

Explicit verification events (grill, sandbox, write, sketch) are never deduplicated — each is a distinct assessment.

This prevents spammy event logs and keeps the verification history meaningful.

---

## 7. How the Application Uses the Engine

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

## 8. The Sekiro Principle in Practice

The Sekiro principle is not just a metaphor. It is an operational guide for how the agent behaves across sessions.

### 8.1 Early Sessions: Learning the Deflect

In the first sessions, the learner encounters foundational concepts. TCP reliability. DNS resolution. HTTP request/response. These are the basic patterns — the deflect mechanic. The agent helps the learner see not just how these work, but _why_ they work. The principle underneath the mechanism.

When the agent grills on these foundations, it targets transfer questions: "If you were designing this from scratch, what's the minimum you'd need?" This forces the learner to reconstruct the principle, not recall the implementation. If they can do that, they own the deflect mechanic, not just the specific boss fight.

### 8.2 Mid Sessions: The Mechanic Transfers

When the learner enters new territory — TLS, database replication, load balancing — the agent watches for moments where the foundational principle applies. It doesn't hand the learner the connection. It prompts recognition.

"You've seen a problem structured like this before." "What in your owned territory feels similar?" "The principle here is one you've already derived."

If the learner makes the connection, the trust signal is very strong — transfer-level verification across domains. If they don't, the agent can be more specific without giving the answer: "Look at how TCP solves reliability. Now look at how this database solves durability. What's the same?"

The learner's recognition of cross-domain principles is the strongest evidence that they own the foundation, not just the specific territory.

### 8.3 Late Sessions: New Bosses

Two weeks, a month in. The learner has a substantial map. They enter genuinely hard terrain — distributed consensus, cryptographic proofs, complex concurrency. The difficulty is real. They struggle.

The system doesn't panic. It doesn't simplify. It reminds them — through the map, through the agent's prompts — that they've been here before. Not in this specific territory, but in the experience of facing something hard with a foundation underneath them.

"This is harder than anything you've seen so far. But your understanding of reliability, consistency, and failure modes gives you the tools to engage with it. You might not own this territory today. That's fine. The map shows where you are and how to get back."

Growth is not knowing this new thing. Growth is trusting that you can engage with it — because you've engaged with hard things before and come through.

### 8.4 The Respawn

When the learner fails — and they will — the system ensures the Sekiro respawn:

- **Cost is zero.** You can try again immediately. Nothing is lost.
- **The map persists.** You can see exactly where you were and what happened.
- **The path back is clear.** Solid ground is always visible. You're never lost.
- **The failure is informative.** The trust model updated. The contested state is visible. The boundary of understanding is now clearer than it was before you failed.
- **The foundation holds.** Failing on a new boss doesn't erase what you've mastered. Your owned territory is still solid. The deflect mechanic still works. You just need more practice on the new pattern.

---

## 9. What a Session Feels Like

See foundational.md Section 8 for full session narratives. Summary:

**First session:** The learner declares what they want to learn. The agent shows the map. The learner picks a starting point. Conversation unfolds — explain, experiment, verify. The trust model builds from zero. Claim events are captured naturally from the learner's self-assessments. By the end, some territory is owned. The learner can see it on the map.

**Returning session:** The agent shows the map with decay applied. Some trust may have faded. The agent mentions it neutrally. The learner decides whether to re-verify before moving on. The session picks up where they are, not where they left off. The self-calibration view shows how their claims aligned with evidence last time.

**Difficult session:** The learner hits hard terrain. The agent acknowledges the difficulty without removing it. It offers different approaches — through the math, through the code, through the problem. The learner picks. They may not own the territory by the end. That's fine. The map shows what they entered and where they got to. They can come back.

**The Sekiro session:** Two weeks in, the learner encounters new terrain that rhymes with territory they already own. The agent prompts recognition, not revelation. The learner makes the connection themselves. The foundational principles transfer. They feel themselves getting more capable, not just more informed. The deflect mechanic holds under new weight. Growth is trust accumulating over time — evidenced in the model, felt in the person.

---

## 10. Implementation Phases

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
