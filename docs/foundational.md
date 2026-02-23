# Lorraine — Foundational Spec

**Version:** 0.4 (Draft)<br>
**Last Updated:** February 22, 2026<br>
**Governs:** This document defines the conceptual foundation. All other specs derive from it. Where they conflict, this document governs.

---

## 0. The One-Sentence Version

Lorraine is a verifiable epistemic trust engine — it tracks what someone actually knows, with evidence, provenance, and honest decay, and makes that model transparent and challengeable.

The engine is application-agnostic. It serves any context where the gap between "claims to know" and "actually knows" has consequences: learning, hiring, onboarding, certification, organizational competency, AI evaluation.

The reference application built on Lorraine is [Terrain](../apps/terrain/SPEC.md): a learning OS with a conversational agent that builds a map of what you know, collapses the cost of trying, and gets out of your way so you can discover — not be told — that you understand.

---

## 1. The Core Problem

The problem is not "how do people access learning content." The problem is:

**How does anyone — the person themselves, or any system working with them — actually know that understanding has been achieved?**

This is the verification problem. It is unsolved everywhere:

- Courses assume completion equals comprehension.
- Flashcard apps assume recall equals understanding.
- Coding exercises assume passing tests equals knowing why.
- Documentation assumes reading equals learning.
- Interviews assume performance under pressure equals competence.
- Credentials assume passing once equals knowing permanently.
- Onboarding assumes time spent equals readiness.

Every one of these is a proxy. None establish best available evidence. Without evidence, everything built on top — adaptive difficulty, personalized pacing, knowledge tracking, hiring decisions, team competency assessments — is unreliable.

Lorraine exists to solve the verification problem. The engine provides the trust primitives. Applications built on the engine use those primitives for their specific context.

---

## 2. Governing Principles

These principles govern Lorraine's design. They are organized into three tiers:

### Tier 1: Engine Invariants

These must hold in every application context. They are epistemic integrity constraints. Violating them means the trust model is dishonest.

**Invariant 1: Trust is the foundational primitive.**
The entire system is built on trust — tracked with evidence, provenance, and honest decay. Every feature, every interaction, every design choice must be evaluated against: "does this increase the accuracy and depth of trust?"

**Invariant 2: The system never inflates trust.**
Verification never propagates as verification — only as inference. Inference attenuates with distance. Failure propagates more aggressively than success. The system should underestimate what someone knows rather than overestimate. This is a safety property, not a tunable parameter.

**Invariant 3: The system's reasoning is transparent and challengeable.**
Every trust claim traces back to evidence. The person being modeled can always ask "why does the system believe this?" and get a traceable answer. The person can challenge the model — "test me on this" or "I know more than this says." Hiding the model from the person it describes is a violation.

**Invariant 4: Failure is the most informative event.**
When someone fails, the system ensures the failure is visible (what happened and why), the evidence is recorded (it becomes part of the trust model), and the cost is appropriate to the context. Failure reveals the exact boundary of understanding. The system never hides or minimizes failure data.

**Invariant 5: The system never manipulates verification to inflate trust.**
No leading questions chosen to boost scores. No artificially easy prompts. No selective verification that avoids weak areas. If a verification event occurs, it is recorded honestly regardless of the result. The engine guarantees that trust scores reflect genuine evidence, not optimistic assessment. Difficulty preservation in the actual experience (prompt design, modality constraints, terrain presentation) is a services and application responsibility — but the engine ensures that whatever verification occurs is recorded and propagated honestly.

**Invariant 6: Trust state is a derived view, not a primary store.**
Trust state is always recomputable from verification events + claim events + decay function + propagation rules. There are no direct edits to trust state. The event log is the source of truth. Trust state is a materialized view over that log. This keeps the model auditable.

Corrections are event-sourced, not state edits. If an event needs to be corrected (fraudulent event, duplication, identity mixup, consent/erasure request), it is retracted via `retractEvent(eventId, reason)` — which is itself a logged event. The original event is marked as retracted, the reason is recorded, and trust state is recomputed without it. Nothing is ever deleted from the log. The audit trail is always complete.

### Tier 2: Human Experience Defaults

These are strongly recommended for any application involving humans. They represent best practices for how people should experience being modeled. Applications may adapt them to their context, but departing from them should be a conscious, justified decision.

**Default 7: Self-trust through independent arrival.**
The person should feel that they arrived at understanding on their own. Not that they were led there. Not that it was made easy. If the system is too present in the moment of understanding, it dilutes the self-trust. Applications may override this in contexts where guided verification is appropriate (e.g., structured certification), but should understand what they're trading away.

**Default 8: The system prompts self-reflection, not judgment.**
The system surfaces data and asks: "what do you think?" rather than declaring "you're ready" or "you're not ready." The person's self-assessment is itself valuable data (see: claim events). Applications with external authority (hiring, certification) may add judgment on top, but the self-reflection layer should still exist where possible.

**Default 9: The system collapses the cost of action.**
Self-trust requires action, but action requires self-trust. The system breaks this paradox by making the cost of trying as low as possible. Failure is cheap. You can always return to solid ground. When trying costs almost nothing, people try. Applications with high-stakes consequences (certification exams, hiring decisions) cannot always collapse cost, but should minimize unnecessary friction.

**Default 10: The system is approach-agnostic.**
Different people approach terrain differently. The system does not privilege one approach over another. Each approach should feel like progress. Applications may constrain approaches for practical reasons (a hiring process may require specific modalities), but the engine itself makes no assumptions about how understanding should be reached.

**Default 11: Foundational capability over topical coverage.**
Deep understanding of core principles transfers to novel problems. The system prioritizes depth on foundations over breadth across topics. Growth is not knowing more things — it's trusting your ability to engage with hard new things.

### Tier 3: Learning OS Policy

These are specific to the learning OS application. They are strict within that context but do not apply to other applications.

**Policy A: The agent is a mapmaker, not a guide.**
The agent makes terrain visible. It does not prescribe paths. It shows the map and lets the learner navigate. A map empowers without creating dependency.

**Policy B: Learning is terrain ownership, not path completion.**
Knowing a subject is being able to navigate from any starting point and arrive at correctness. The system helps learners own terrain, not complete paths.

**Policy C: The gate is a threshold, not a test.**
Boundaries between knowledge areas are decisions to make, not tests to pass. The learner always decides whether to move forward. The decision is safe because they can always return.

**Policy D: No gamification.**
No streaks. No points. No badges. No leaderboards. The map is the progress indicator. Trust state is the score. Verified terrain is the reward.

**Policy E: No praise.**
The agent reflects what the person did — "you just described acknowledgment-based reliability from first principles" — without evaluating it. The person feels the accomplishment. The agent doesn't label it.

**Policy F: No urgency.**
The agent never says "you're falling behind." If trust has decayed, the agent mentions it neutrally and lets the person decide what to do.

See learning-os.md for full specification of these policies in practice.

---

## 3. The Trust Primitive

### 3.1 What Trust Is

Trust is not a confidence score. It is a richer object that answers:

- **What was verified?** The specific concept.
- **How was it verified?** Through what modality — answering a question, writing code, drawing a diagram, explaining in prose, using it naturally in reasoning, performing a real-world action observed by an external system.
- **When was it verified?** Recency matters. Knowledge decays.
- **From how many angles?** Single-modality verification is weaker than cross-modality verification. Someone who can answer a question AND write the code AND explain it in their own words has stronger trust than someone who can only do one of those.
- **What was inferred vs. demonstrated?** The system may believe you know X because you demonstrated Y. That inference is useful but it is not the same as demonstration. The system must always know the difference.
- **What was claimed vs. evidenced?** A person saying "I know TCP" is a signal, but it is not evidence. Claims and evidence are tracked separately because the gap between them is itself diagnostic.

### 3.2 Trust Levels

Each concept exists in one of four trust states per person:

**Verified** — The person has directly demonstrated understanding, ideally through multiple modalities. This is the strongest state. It still decays with time.

**Inferred** — The system believes the person probably understands this based on demonstrated understanding of related concepts. Useful for efficiency, but the system must never treat inference as fact.

**Untested** — The system has no evidence. The person may or may not understand this. Intellectual honesty requires distinguishing "untested" from "doesn't know."

**Contested** — The person has demonstrated understanding in one context but failed in another. This is the most informationally rich state. It reveals the exact boundary of understanding — where the person's model works and where it breaks. Contested concepts are the highest-priority targets for further verification.

### 3.3 What the Engine Stores

The engine's data model is five things:

**Concepts** — nodes in a graph. Each concept is something a person could know or not know. Concepts have a canonical id, a name, and a description. The engine doesn't know what domain they belong to — it just stores nodes.

**Edges** — connections between concepts. Each edge has a type (prerequisite, component_of, related_to) and an inference strength (how strongly does trust in one imply trust in the other). Edges are what make the graph a graph and what enable trust propagation.

**Verification events** — the atomic evidence. Each event records what was tested, how (modality), when, the result (demonstrated/failed/partial), and the full context (what question was asked, what code was written, what response was given). This is the provenance layer. Every trust claim traces back to verification events.

**Claim events** — a person's self-reported belief about their own understanding. Each claim records the concept, the person, their self-reported confidence, and the context. Claims are not evidence. They are tracked separately because:
- The gap between claims and verified trust measures self-calibration
- Systematic overclaiming on untested concepts signals overconfidence
- Systematic underclaiming on verified concepts signals imposter syndrome
- Growth in calibration (claims converging with evidence over time) is itself a meaningful signal
- In hiring/certification, the candidate's claims are the starting point that verification tests against

**Trust state** — a derived view, not a primary store. Trust state is computed from verification events + claim events + decay function + propagation rules. It can always be recomputed from the event log. There are no manual overrides. This keeps the model auditable — if the trust state says "verified," you can trace back through events to see exactly why. Trust state includes: level (verified/inferred/untested/contested), confidence, verification history, modalities tested, time since last verification, what inferences led to the current state, and the gap between self-reported claims and evidence.

### 3.4 The Three-Layer Mental Model

It's useful to think about the data in three layers, even though the engine stores them as primitives:

**Structure** — concepts and edges. The shape of knowledge in a domain. What exists, how it connects. Independent of any person.

**Evidence** — verification events and claim events. The history of what was observed and what was claimed. Every trust assessment traces backward through this layer.

**State** — trust per concept per person. The current picture. Derived from evidence, decayed by time, propagated across edges. A materialized view, not a source of truth.

The power comes from cross-layer queries: "Does this person understand TCP handshakes?" requires checking the structure (what does understanding require?), the evidence (what has been observed, and what has the person claimed?), and the state (what's the current derived trust level?).

### 3.5 Trust Propagation Rules

Trust propagation must be conservative. The system should underestimate what someone knows rather than overestimate.

1. **Verification never propagates as verification.** Demonstrating A may create inference about B, but never verified trust in B. Only direct demonstration produces verification.

2. **Inference attenuates with distance.** If A connects to B connects to C, the inference weakens at each step. Trust does not propagate indefinitely.

3. **Failure propagates aggressively.** If you fail to demonstrate B, and B is a foundation for C, D, and E — then trust in C, D, and E drops, even if they were previously inferred. Failure at a foundation shakes everything above it.

4. **Cross-modality verification compounds.** Demonstrating understanding through multiple modalities is stronger than any single modality alone. The system tracks which modalities have been used and seeks verification through unused modalities for important concepts.

5. **Time decays trust.** A concept verified six months ago is not as trustworthy as one verified yesterday. Decay rate varies by concept type and by the depth of original verification.

These rules are hardcoded in the engine core. They are epistemic integrity constraints (Invariant 2). If they were configurable, a bad configuration could inflate trust scores across the graph.

---

## 4. The Verification Loop

### 4.1 Two-Way Verification

Most systems verify in one direction: the system tests the person. Lorraine verifies in both directions:

**The system verifies the person** — through questions, experiments, prompts, and observation of real-world actions.

**The person verifies themselves via the system** — the person can challenge the system's model at any time. "Test me on this." "I don't think I really know this despite what your model says." "I've demonstrated this outside the system — let me prove it."

Two-way verification keeps the model calibrated from both sides. The person often has private information the system doesn't — a gut feeling that their understanding is shaky, or knowledge gained outside the system.

### 4.2 Verification Modalities

Different modalities verify different kinds of understanding, at different trust strengths:

| Modality | What it verifies | Trust strength |
|----------|-----------------|----------------|
| Recall-level questioning | Can retrieve the fact | Weakest |
| Inference questioning | Can reason about relationships | Medium |
| Transfer questioning | Can apply in novel context | Strong |
| Discrimination questioning | Can distinguish similar concepts | Medium-Strong |
| Code execution | Can apply in practice | Strong |
| Debugging | Can diagnose when things go wrong | Very Strong |
| Written explanation | Can linearize and articulate | Strong |
| Teaching explanation | Can explain to a different audience | Very Strong |
| Diagram/sketch | Can represent structure visually | Medium-Strong |
| Integrated use | Uses concept naturally in reasoning without scaffolding | Strongest |
| External observation | Demonstrated through real-world action observed by outside system | Varies by context |

The system should seek verification through higher-trust modalities for important concepts. A concept verified only through recall is not well-trusted even if the confidence is high.

Not all modalities are available in all application contexts. A learning OS has access to conversation, code, sketching. A hiring process may constrain to specific modalities. An onboarding system may receive external observation events from CI/CD pipelines. The engine handles all modalities the same way — it records the event and updates the derived trust state.

### 4.3 The Contested State

When a concept is contested — demonstrated in one context but failed in another — the system does not rush to resolve it. Instead it investigates:

- Was the failure a genuine gap, or a framing issue?
- Is the success genuine, or was it pattern-matched without understanding?
- What is the exact boundary — where does understanding work and where does it break?

Contested concepts reveal the frontier between understanding and not-understanding. This is the most productive area for the system's attention in any application context — whether that's a learner working through confusion, a candidate revealing the limits of their knowledge, or an employee whose understanding is uneven.

### 4.4 Claims vs. Evidence

When a person says "I know this," that is a claim event, not a verification event. The engine records both but never conflates them.

The gap between claims and evidence is diagnostic:

- **Overclaiming** — person claims high confidence, evidence shows gaps. In a learning context, this is a calibration opportunity. In hiring, this is critical signal.
- **Underclaiming** — person claims low confidence, evidence shows verified understanding. This is imposter syndrome signal. The system can surface the evidence: "you've demonstrated this from three angles — the data says you own this ground."
- **Calibration growth** — over time, do claims converge with evidence? Growing self-calibration is itself a form of epistemic development. This connects directly to Lorraine Code's thesis: knowing well includes knowing what you don't know.
- **Claim as planning input** — a person's claims about what they know (or don't) help the system prioritize what to verify next. Claims are the starting hypothesis that verification tests.

---

## 5. Architecture: Engine Core and Engine Services

The engine is split into two layers:

### 5.1 Engine Core

Pure trust machine. Deterministic. No LLM dependency. Can run fully encrypted client-side.

The core:
- Accepts verification events and claim events
- Stores concepts and edges
- Computes and serves derived trust state
- Runs propagation across the graph
- Runs time-based decay
- Self-calibrates (compares predictions to outcomes)
- Explains its reasoning (provenance for any trust claim)

The core's API: recordVerification, recordClaim, getTrustState, getBulkTrustState, propagateTrust, decayTrust, calibrate, explainDecision, loadConcepts, getGraph.

The core never generates natural language. It never interprets natural language. It operates on structured data only.

### 5.2 Engine Services

LLM-powered adapters that sit between the core and applications. These generate and interpret the unstructured human-facing interactions that produce verification events.

The services:
- **generateVerification** — uses trust state from the core + LLM to produce a verification prompt (question, code challenge, writing prompt, etc.)
- **interpretResponse** — uses LLM to translate a person's natural language response into structured trust updates that get written to the core
- **extractImplicitSignals** — uses LLM to mine natural interaction for trust signals

Services vary by application. A learning OS service generates conversational Socratic questions. A hiring service might generate technical interview prompts. A certification service might generate standardized assessments. They all write to the same core.

Services are where plaintext meets the LLM. This separation means:
- The core can be encrypted end-to-end
- The core can run without any LLM (useful for external event ingestion)
- Services can be swapped, updated, or specialized per application without touching the core
- Compliance requirements that vary by context (healthcare, finance) are handled in the services layer

### 5.3 Applications

Applications sit on top of core + services. They:
- Load domain packages into the core (concepts and edges)
- Read trust state from the core
- Group concepts into meaningful clusters (territories, skill areas, milestones)
- Define readiness criteria (thresholds, requirements, gates)
- Manage interaction (conversation, dashboard, assessment flow)
- Present the trust model to people in context-appropriate ways

See learning-os.md for the first application. See domain-schema.md for the content model.

---

## 6. Application-Level Principles

The engine provides concepts, edges, trust state, verification events, and claim events. Applications add meaning. This section describes principles that apply across applications, even though their implementation varies.

### 6.1 Making the Terrain Visible

The engine stores the graph and derived trust state. Applications make it visible. How depends on context:

- A learning OS shows a map with fog of war, verified territory, and thresholds
- A hiring dashboard shows trust state against required competencies
- An onboarding tracker shows progress against milestones with the manager's view alongside the employee's
- A team competency view shows aggregate trust across an organization

The invariant (Invariant 3): the person whose understanding is being modeled should be able to see what the system believes about them, why, and challenge it. Applications that hide the trust model from the person violate the engine's integrity constraints.

### 6.2 Thresholds and Readiness

Applications group concepts into meaningful clusters and define boundaries between them. When someone reaches a boundary, the application surfaces it. The engine provides the data: trust state across the relevant concepts. The application provides the experience.

In a learning OS, thresholds are invitations — "do you feel like you own this ground?" The person always decides.

In a hiring process, thresholds may be requirements — "the organization requires verified trust on these concepts."

In onboarding, thresholds may be milestones — "by day 30, these concepts should be verified."

The engine doesn't know about any of this. It provides derived trust state per concept per person. The application interprets that state against its own requirements.

### 6.3 Implicit Verification

The richest trust signals come from natural interaction, not explicit testing:

- Someone uses a concept correctly in passing → strong implicit verification.
- Someone asks a question that reveals a missing prerequisite → implicit gap signal.
- Someone self-corrects mid-sentence → active model-building in progress.
- Someone's reasoning becomes more sophisticated → implicit signal of deepening understanding.
- Someone handles a real-world situation that demonstrates understanding → external verification.

The engine services layer provides `extractImplicitSignals`. Applications that support conversation or real-time interaction should mine every interaction for signal, not wait for explicit testing moments. Applications that receive external events (CI/CD, HR systems) are also providing implicit verification — the person didn't take a test, they did their job, and the system observed it.

---

## 7. The Sekiro Principle

This section addresses the relationship between difficulty, growth, and foundational capability. It applies across all applications, not just learning.

### 7.1 The Analogy

In Sekiro, the player doesn't level up to overpower enemies. The enemies scale with the player. What changes is the player — their timing, pattern recognition, and composure under pressure. The game doesn't get easier. The player gets more capable. And the proof of capability isn't a stat screen — it's the felt experience of deflecting an attack that would have destroyed you ten hours ago.

Critically: Sekiro doesn't prevent you from walking into a fight you're not ready for. You enter, you get destroyed, and you learn from the destruction. The cost is low — you respawn and try again. The game trusts you to calibrate yourself through experience.

### 7.2 Foundational Capability

Every domain has foundational principles that carry across its concepts. In networking, it's the idea of reliable communication over unreliable channels. In databases, it's the tension between consistency and performance. In security, it's the attacker-defender asymmetry. In management, it's the tradeoff between autonomy and alignment.

These foundational principles are like Sekiro's deflect mechanic. Early concepts teach you the rhythm. Later concepts use the same rhythm with more complex patterns. You're never starting from zero in new territory — you have the foundation. The new terrain is novel, but the way you engage with it is the same way you've been engaging all along, just at a higher level.

This is why Lorraine prioritizes depth on foundational concepts over breadth across topics (Default 11). A person who deeply understands acknowledgment-based reliability in TCP can engage with write-ahead logging in databases — not because they're the same concept, but because the underlying principle transfers.

### 7.3 What Growth Looks Like

Growth is not knowing more things. Growth is the accumulation of trust in your own ability to engage with hard new things. Each concept you verify reinforces foundational principles. Each challenge you face — even the ones where you struggle — adds to the evidence that you can handle difficulty.

Over time, a person doesn't become all-knowing. They become someone who trusts their ability to navigate unfamiliar terrain because they've done it before. The next challenge is harder, but they've faced hard things and come through. That proof lives in them — and in the trust model.

### 7.4 New Difficulty is Not Failure

When someone moves into new territory and struggles, this is not a failure of the system. It is the system working correctly. New difficulty is the next boss. If the foundational principles were genuinely understood (not memorized, not hand-held through), then the person has what they need to engage. They might need to retreat. They might need to explore previous concepts more deeply. But they have the foundation. The evidence shows it. They can always go back.

---

## 8. What a Session Feels Like

This section tests whether the principles translate into a coherent experience. These narratives demonstrate the learning OS — the first application built on the engine. Other applications would produce different sessions but follow the same engine invariants.

### 8.1 First Session — A New Learner

Ade wants to learn how computer networking works. Not for an exam. He's a backend developer who's been treating the network as a black box and wants to understand what's underneath.

He opens Lorraine. The agent doesn't start with a tutorial or an onboarding flow. It starts with a conversation.

**Agent:** "What do you want to learn?"

**Ade:** "I want to understand networking. Like, when I make an API call, what actually happens."

**Agent:** "That's a big terrain. Let me show you the map."

The agent shows a high-level view of networking concepts — the territory. Not a curriculum. A landscape. Ade can see clusters: how data travels, how machines find each other, how reliability works, how the web is built on top of all of it. Some areas are labeled, some are foggy. None are locked. He can go anywhere.

**Agent:** "You said you make API calls. So you've been working in this area" — a region lights up — "without knowing what's underneath it. Most people start by understanding what happens when you type a URL and hit enter. But it's your call. Where are you drawn?"

Ade picks the URL question. The conversation becomes an explanation — not a lecture. The agent breaks it down at the intuition level first. DNS is like a phone book. TCP is like a phone call. HTTP is like a language you speak on the call. Simple, but not condescending. Ade is a developer. He doesn't need to be treated like a child. He needs to be treated like a smart person who happens not to know this specific thing.

Ade asks: "Wait, what happens if a packet gets lost?"

The agent recognizes this as curiosity pulling toward reliability — a different territory than the one they were in. It doesn't block him. It updates the map: Ade has touched DNS and HTTP at the intuition level (inferred, not verified), and is now asking about TCP reliability.

**Agent:** "That's the reliability question. TCP has a whole system for this. Want me to explain it, or do you want to see it happen?"

**Ade:** "Show me."

The conversation becomes a sandbox. A small piece of code that opens a TCP connection. The agent annotates what's happening underneath — the SYN, the SYN-ACK, the ACK. Not because Ade needs to memorize these, but because he asked to see what's underneath.

Ade modifies the code. Sends some data. The agent annotates the sequence numbers, the acknowledgments. Ade asks: "What if I kill the connection halfway through a send?"

He tries it. The agent shows the retransmission attempts. The timeouts. The eventual failure. Ade is experimenting now. The agent steps back. It annotates when asked. It doesn't narrate every moment. Ade is in the terrain, navigating.

After twenty minutes, Ade has a feel for TCP's reliability mechanism. He hasn't memorized anything. He's *felt* it — watched packets fail and recover, broken things and seen what happened.

The agent gently surfaces a threshold:

**Agent:** "You've been exploring TCP reliability — retransmissions, acknowledgments, timeouts. You've seen it from the code side. This connects to flow control and congestion control, which are the next territory. But before that — you came in through one door. Want to check if you could come in through another?"

This is not a test. It's an invitation to verify terrain ownership. Ade can say no.

**Ade:** "Sure, try me."

The conversation becomes a grill — but it doesn't feel like a quiz. The agent asks: "If you were designing a protocol from scratch and you needed to guarantee every byte arrived, what's the minimum mechanism you'd need?"

This is a transfer question. Ade has to reason from principles, not recall TCP specifics. He thinks. He says: "You'd need... the receiver to tell the sender what it got. And the sender to re-send anything that wasn't acknowledged. And some way to know when to give up."

**Agent:** "That's the core of it. You just described acknowledgment-based reliability from first principles. The specific details of how TCP does it — sequence numbers, cumulative ACKs, retransmission timers — are implementations of exactly what you just said."

Ade feels something. Not because the agent praised him. Because he derived the answer himself. He didn't recall TCP's mechanism — he *reconstructed the reasoning that led to TCP's mechanism.* That's terrain ownership. He could approach this from a different angle and arrive at the same place.

**Agent:** "The map has updated. TCP reliability is yours — you've approached it from code and from first principles. Flow control is next door. It builds on what you just described. Or you can stay here and go deeper. Your call."

Ade looks at the map. TCP reliability is solid. DNS and HTTP are faintly marked — he's touched them but not verified. Flow control is visible but unexplored. He can see the terrain. He knows where he is. He decides to move forward.

He doesn't feel ready because the system told him he's ready. He feels ready because he just proved to himself that he can derive the principles independently. The self-trust is his.

### 8.2 Returning Session — Three Days Later

Ade comes back. The agent doesn't start with "welcome back!" or a streak counter. It starts with the map.

**Agent:** "Last time you explored TCP reliability and moved into flow control. You got partway through. Also — it's been a few days since you worked with TCP reliability directly. The foundation is probably still solid, but it's your call whether to check."

This is the spaced repetition moment, but it doesn't feel like a flashcard review. The agent is saying: the terrain behind you might have shifted slightly with time. Want to walk it briefly before going forward?

Ade decides to check. The agent asks one question — not a recall question, but a reasoning question. Something that requires the foundation to be intact. Ade answers well. The trust model updates: TCP reliability re-verified, decay reset.

Ade continues into flow control. He struggles. The concepts are harder. He gets confused about the difference between flow control and congestion control — a classic confusion point. He tries to explain it and contradicts himself.

The agent doesn't correct him immediately. It lets him sit with the contradiction for a moment. Then:

**Agent:** "You said flow control is about not overwhelming the network. But earlier you said it's about not overwhelming the receiver. Those are two different problems. Which one is flow control?"

Ade pauses. Thinks. "The receiver. Congestion control is the network."

**Agent:** "Yes. And they use completely different mechanisms, even though they feel similar. Want to see them side by side in code?"

The conversation becomes a sandbox where Ade can see both mechanisms operating on the same connection. The agent doesn't explain the difference. The code makes the difference visible. Ade sees it.

The contested state in the trust model — Ade had a confused understanding of flow control — resolves. Not because the agent explained it, but because Ade saw the difference himself and articulated it.

### 8.3 The Difficult Session — Two Weeks In

Ade has been learning for two weeks. He owns significant territory: TCP reliability, flow control, basic congestion control, DNS resolution, HTTP request/response cycles. His map is filling in. Verified nodes spreading outward.

He decides to explore TLS and encryption. This is new terrain and it's hard. The math is harder. The concepts are more abstract. He's used to seeing things in packet captures and code. Cryptographic primitives don't visualize as easily.

He struggles. He reads the agent's explanation of public key cryptography and it doesn't click. He tries the sandbox but the code is just calling library functions — he can't see the math underneath the way he could see packets underneath TCP.

He feels stuck. The system doesn't panic. It doesn't simplify. It doesn't offer an easier topic.

**Agent:** "This is hard terrain. Most of it is math that doesn't show itself in code the way TCP does. Different territory, different texture. You can approach it through the math, through the code, or through the problem it's solving. Where do you want to start?"

Ade picks the problem. "Why can't two computers just agree on a password?"

The agent explains the key exchange problem at the intuition level. Two people in a room full of eavesdroppers need to agree on a secret. Ade's eyes light up — this is a reliability problem, like TCP, but for secrecy instead of delivery. The foundational principle — solving a hard problem over an unreliable/hostile channel — transfers. He's not starting from zero. He has the deflect mechanic.

He doesn't understand RSA by the end of the session. But he understands why RSA needs to exist, and he understands the problem it solves. The trust model marks TLS at the intuition level. The terrain is entered. Not owned, but entered. The map shows it.

Ade will come back. Not because of a streak counter. Because he felt the foundation hold under new weight. He felt TCP's principles rhyme with TLS's principles. He felt himself getting more capable, not just more informed.

---

## 9. Engine Primitives

These are the irreducible building blocks of the engine core. Everything composes from these.

| Primitive | What it is | Why it's irreducible |
|-----------|-----------|---------------------|
| **Concept** | A node in the graph — something a person could know or not know | Without concepts, there's nothing to track trust against |
| **Edge** | A typed, weighted connection between concepts | Without edges, trust stays isolated and can't propagate |
| **Verification event** | A single observation of understanding — what, how, when, result, context | Without events, trust has no evidence |
| **Claim event** | A person's self-reported belief about their own understanding | Without claims, the gap between self-perception and evidence is invisible |
| **Trust state** | Per concept, per person — derived from events + decay + propagation | Without trust state, there's no queryable model (note: derived, not stored) |
| **Retraction event** | A logged correction to a previous event — marks it retracted with reason | Without retractions, the system has no error correction that preserves audit integrity |

Everything else is built by applications on top of these five primitives:

| Application concept | Built from | Example |
|-------------------|-----------|---------|
| Territory / skill area / milestone | A named group of concepts | Learning OS groups concepts into "TCP Reliability" |
| Map / dashboard / tracker | Graph + trust state, rendered | Learning OS shows fog-of-war map |
| Threshold / readiness gate / requirement | Trust state compared against criteria | Hiring app requires verified trust on specific concepts |
| Goal / destination / target | A concept or group of concepts the person wants to reach | Learning OS lets the learner declare a goal |
| Path / curriculum / onboarding plan | A suggested route through the graph | Onboarding app sequences concepts by milestone |
| Session / interview / assessment | A bounded interaction that produces verification and claim events | All applications |
| Self-calibration score | Gap between claim events and verification events over time | Measures growth in epistemic self-awareness |

The engine provides the primitives. Applications provide the meaning.

---

## 10. Open Questions

### 10.1 Map Visualization
How do you make a concept graph legible and useful to a non-technical person? Graphs are notoriously hard to visualize. The terrain/topographic metaphor may work better than node-and-edge graphs. This is an application-level design problem but has implications for how the engine exposes graph data.

### 10.2 Concept Granularity
Who decides that "TCP handshake" is one concept versus three ("SYN," "SYN-ACK," "ACK")? Granularity determines how useful the trust model is. Too coarse and you can't diagnose gaps. Too fine and it's noise. The system may need to dynamically adjust granularity — split concepts when more diagnostic precision is needed, merge when the person clearly owns the territory.

### 10.3 Cold Start
A new person has an empty trust graph. The first interactions must bootstrap the model without feeling like an intake exam. The learning OS proposes starting with conversation and building the model organically. Other applications may take different approaches — a hiring process might start with explicit claims ("rate your confidence on these concepts") followed by targeted verification. The engine supports both.

### 10.4 The LLM-to-Graph Write Problem
The LLM processes unstructured interaction. The trust graph is structured data. The translation layer between them — extracting trust signals from natural language and writing them accurately to the graph — is where most implementation difficulty will live. The LLM will misclassify signals. Guardrails are needed. This is the engine services layer's hardest problem.

### 10.5 Domain Graph Bootstrapping
Who builds the initial domain knowledge graphs? Options: expert curation (high quality, slow), LLM generation from documentation (fast, variable quality), community contribution (scalable, needs review), organization-specific creation (for internal systems and processes), emergence from interaction data (organic, cold start problem). Likely a combination, starting with LLM generation refined by expert review.

### 10.6 The Encryption Tension
The engine core can run fully encrypted client-side (Invariant 6 — trust state is derived from events, no manual overrides needed). But the engine services layer needs plaintext to generate and interpret via LLM. Options: client-side LLM calls, trusted execution environments, or accepting that the services layer has a weaker security guarantee than the core. The core/services split makes this manageable.

### 10.7 Cross-Domain Principles
The principles layer (see domain-schema.md) — abstract ideas that manifest as different concepts in different domains — is not yet built. When it is, it will enable the strongest form of cross-domain trust inference: recognizing that someone who understands acknowledgment-based reliability in TCP has a foundation for understanding write-ahead logging in databases, even though they're different concepts in different domains.

### 10.8 External Verification Quality
When external systems submit verification events (CI/CD pipelines, HR systems, code review tools), how does the engine assess the quality of that verification? A successful PR deployment is weak evidence of understanding — the code might have been copied. A successful incident response is strong evidence. The engine may need a way to weight external events differently based on the source's reliability.

### 10.9 Claim Gaming
In adversarial contexts (hiring), people may strategically underclaim to appear humble or overclaim to appear confident. The system should treat claims as hypothesis, not confession. The gap between claims and evidence is diagnostic regardless of whether the claims are sincere — insincere claims are themselves a signal. But the system should not penalize strategic claiming.
