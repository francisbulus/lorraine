# Lorraine: Foundational Spec

**Version:** 0.5 (Draft)<br>
**Last Updated:** February 23, 2026<br>
**Governs:** This document defines the conceptual foundation. All other specs derive from it. Where they conflict, this document governs.

---

## 0. The One-Sentence Version

Lorraine is an opinionated trust framework: it tracks what someone actually knows, with evidence, provenance, and honest decay, and makes that model transparent and challengeable.

The framework is domain-agnostic. It serves any context where the gap between "claims to know" and "actually knows" has consequences: learning, hiring, onboarding, certification, organizational competency, AI evaluation.

You define what "knows X" means in your context. Lorraine guarantees the evidence behind it is honest.

---

## 1. The Core Problem

The problem is not assessment, credentialing, or knowledge management. The problem is:

**How does anyone (the person themselves, or any system working with them) actually know that understanding has been achieved?**

This is the verification problem. It is unsolved everywhere:

- Courses assume completion equals comprehension.
- Flashcard apps assume recall equals understanding.
- Coding exercises assume passing tests equals knowing why.
- Documentation assumes reading equals learning.
- Interviews assume performance under pressure equals competence.
- Credentials assume passing once equals knowing permanently.
- Onboarding assumes time spent equals readiness.

Every one of these is a proxy. None establish best available evidence. Without evidence, everything built on top (adaptive difficulty, personalized pacing, knowledge tracking, hiring decisions, team competency assessments) is unreliable.

Lorraine exists to solve the verification problem. The framework provides the trust primitives. Applications built on the framework use those primitives for their specific context.

---

## 2. Governing Principles

These principles govern Lorraine's design. They are organized into two tiers.

### Tier 1: Framework Invariants

These must hold in every application context. They are epistemic integrity constraints. Violating them means the trust model is dishonest.

**Invariant 1: Trust is the foundational primitive.**
The entire system is built on trust: tracked with evidence, provenance, and honest decay. Every feature, every interaction, every design choice must be evaluated against: "does this increase the accuracy and depth of trust?"

**Invariant 2: The system never inflates trust.**
Verification never propagates as verification. Only as inference. Inference attenuates with distance. Failure propagates more aggressively than success. The system should underestimate what someone knows rather than overestimate. This is a safety property, not a tunable parameter.

**Invariant 3: The system's reasoning is transparent and challengeable.**
Every trust claim traces back to evidence. The person being modeled can always ask "why does the system believe this?" and get a traceable answer. The person can challenge the model: "test me on this" or "I know more than this says." Hiding the model from the person it describes is a violation.

**Invariant 4: Failure is the most informative event.**
When someone fails, the system ensures the failure is visible (what happened and why), the evidence is recorded (it becomes part of the trust model), and the cost is appropriate to the context. Failure reveals the exact boundary of understanding. The system never hides or minimizes failure data.

**Invariant 5: The system never manipulates verification to inflate trust.**
No leading questions chosen to boost scores. No artificially easy prompts. No selective verification that avoids weak areas. If a verification event occurs, it is recorded honestly regardless of the result. The framework guarantees that trust scores reflect genuine evidence, not optimistic assessment.

**Invariant 6: Trust state is a derived view, not a primary store.**
Trust state is always recomputable from verification events + claim events + decay function + propagation rules. There are no direct edits to trust state. The event log is the source of truth. Trust state is a materialized view over that log. This keeps the model auditable.

Corrections are event-sourced, not state edits. If an event needs to be corrected (fraudulent event, duplication, identity mixup, consent/erasure request), it is retracted via `retractEvent(eventId, reason)`, which is itself a logged event. The original event is marked as retracted, the reason is recorded, and trust state is recomputed without it. Nothing is ever deleted from the log. The audit trail is always complete.

### Tier 2: Human Experience Defaults

These are strongly recommended for any application involving humans. They represent best practices for how people should experience being modeled. Applications may adapt them to their context, but departing from them should be a conscious, justified decision.

**Default 7: Self-trust through independent arrival.**
The person should feel that they arrived at understanding on their own. Not that they were led there. Not that it was made easy. If the system is too present in the moment of understanding, it dilutes the self-trust. Applications may override this in contexts where guided verification is appropriate (e.g., structured certification), but should understand what they're trading away.

**Default 8: The system prompts self-reflection, not judgment.**
The system surfaces data and asks: "what do you think?" rather than declaring "you're ready" or "you're not ready." The person's self-assessment is itself valuable data (see: claim events). Applications with external authority (hiring, certification) may add judgment on top, but the self-reflection layer should still exist where possible.

**Default 9: The system collapses the cost of action.**
Self-trust requires action, but action requires self-trust. The system breaks this paradox by making the cost of trying as low as possible. Failure is cheap. You can always return to solid ground. When trying costs almost nothing, people try. Applications with high-stakes consequences (certification exams, hiring decisions) cannot always collapse cost, but should minimize unnecessary friction.

**Default 10: The system is approach-agnostic.**
Different people approach understanding differently. The system does not privilege one approach over another. Each approach should feel like progress. Applications may constrain approaches for practical reasons (a hiring process may require specific modalities), but the framework itself makes no assumptions about how understanding should be reached.

**Default 11: Foundational capability over topical coverage.**
Deep understanding of core principles transfers to novel problems. The system prioritizes depth on foundations over breadth across topics. Growth is not knowing more things. It's trusting your ability to engage with hard new things.

Application-specific policies live in their respective application specs, not here. See `apps/maintainer-os/SPEC.md` for an example.

---

## 3. The Trust Primitive

### 3.1 What Trust Is

Trust is not a confidence score. It is a richer object that answers:

- **What was verified?** The specific concept.
- **How was it verified?** Through what modality: answering a question, writing code, drawing a diagram, explaining in prose, using it naturally in reasoning, performing a real-world action observed by an external system.
- **When was it verified?** Recency matters. Knowledge decays.
- **From how many angles?** Single-modality verification is weaker than cross-modality verification. Someone who can answer a question AND write the code AND explain it in their own words has stronger trust than someone who can only do one of those.
- **What was inferred vs. demonstrated?** The system may believe you know X because you demonstrated Y. That inference is useful but it is not the same as demonstration. The system must always know the difference.
- **What was claimed vs. evidenced?** A person saying "I know TCP" is a signal, but it is not evidence. Claims and evidence are tracked separately because the gap between them is itself diagnostic.

### 3.2 Trust Levels

Each concept exists in one of four trust states per person:

**Verified**: The person has directly demonstrated understanding, ideally through multiple modalities. This is the strongest state. It still decays with time.

**Inferred**: The system believes the person probably understands this based on demonstrated understanding of related concepts. Useful for efficiency, but the system must never treat inference as fact.

**Untested**: The system has no evidence. The person may or may not understand this. Intellectual honesty requires distinguishing "untested" from "doesn't know."

**Contested**: The person has demonstrated understanding in one context but failed in another. This is the most informationally rich state. It reveals the exact boundary of understanding: where the person's model works and where it breaks. Contested concepts are the highest-priority targets for further verification.

### 3.3 What the Framework Stores

The framework's data model is five things:

**Concepts**: nodes in a graph. Each concept is something a person could know or not know. Concepts have a canonical id, a name, and a description. The framework doesn't know what domain they belong to. It just stores nodes.

**Edges**: connections between concepts. Each edge has a type (prerequisite, component_of, related_to) and an inference strength (how strongly does trust in one imply trust in the other). Edges are what make the graph a graph and what enable trust propagation.

**Verification events**: the atomic evidence. Each event records what was tested, how (modality), when, the result (demonstrated/failed/partial), and the full context (what question was asked, what code was written, what response was given). This is the provenance layer. Every trust claim traces back to verification events.

**Claim events**: a person's self-reported belief about their own understanding. Each claim records the concept, the person, their self-reported confidence, and the context. Claims are not evidence. They are tracked separately because:
- The gap between claims and verified trust measures self-calibration
- Systematic overclaiming on untested concepts signals overconfidence
- Systematic underclaiming on verified concepts signals imposter syndrome
- Growth in calibration (claims converging with evidence over time) is itself a meaningful signal
- In hiring/certification, the candidate's claims are the starting point that verification tests against

**Trust state**: a derived view, not a primary store. Trust state is computed from verification events + claim events + decay function + propagation rules. It can always be recomputed from the event log. There are no manual overrides. This keeps the model auditable. If the trust state says "verified," you can trace back through events to see exactly why. Trust state includes: level (verified/inferred/untested/contested), confidence, verification history, modalities tested, time since last verification, what inferences led to the current state, and the gap between self-reported claims and evidence.

### 3.4 The Three-Layer Mental Model

It's useful to think about the data in three layers, even though the framework stores them as primitives:

**Structure**: concepts and edges. The shape of knowledge in a domain. What exists, how it connects. Independent of any person.

**Evidence**: verification events and claim events. The history of what was observed and what was claimed. Every trust assessment traces backward through this layer.

**State**: trust per concept per person. The current picture. Derived from evidence, decayed by time, propagated across edges. A materialized view, not a source of truth.

The power comes from cross-layer queries: "Does this person understand TCP handshakes?" requires checking the structure (what does understanding require?), the evidence (what has been observed, and what has the person claimed?), and the state (what's the current derived trust level?).

### 3.5 Trust Propagation Rules

Trust propagation must be conservative. The system should underestimate what someone knows rather than overestimate.

1. **Verification never propagates as verification.** Demonstrating A may create inference about B, but never verified trust in B. Only direct demonstration produces verification.

2. **Inference attenuates with distance.** If A connects to B connects to C, the inference weakens at each step. Trust does not propagate indefinitely.

3. **Failure propagates aggressively.** If you fail to demonstrate B, and B is a foundation for C, D, and E, then trust in C, D, and E drops, even if they were previously inferred. Failure at a foundation shakes everything above it.

4. **Cross-modality verification compounds.** Demonstrating understanding through multiple modalities is stronger than any single modality alone. The system tracks which modalities have been used and seeks verification through unused modalities for important concepts.

5. **Time decays trust.** A concept verified six months ago is not as trustworthy as one verified yesterday. Decay rate varies by concept type and by the depth of original verification.

These rules are hardcoded in the computation layer. They are epistemic integrity constraints (Invariant 2). If they were configurable, a bad configuration could inflate trust scores across the graph.

---

## 4. The Verification Loop

### 4.1 Two-Way Verification

Most systems verify in one direction: the system tests the person. Lorraine verifies in both directions:

**The system verifies the person**: through questions, experiments, prompts, and observation of real-world actions.

**The person verifies themselves via the system**: the person can challenge the system's model at any time. "Test me on this." "I don't think I really know this despite what your model says." "I've demonstrated this outside the system. Let me prove it."

Two-way verification keeps the model calibrated from both sides. The person often has private information the system doesn't: a gut feeling that their understanding is shaky, or knowledge gained outside the system.

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

Not all modalities are available in all application contexts. A learning app has access to conversation, code, sketching. A hiring process may constrain to specific modalities. An onboarding system may receive external observation events from CI/CD pipelines. The framework handles all modalities the same way. It records the event and updates the derived trust state.

### 4.3 The Contested State

When a concept is contested, demonstrated in one context but failed in another, the system does not rush to resolve it. Instead it investigates:

- Was the failure a genuine gap, or a framing issue?
- Is the success genuine, or was it pattern-matched without understanding?
- What is the exact boundary: where does understanding work and where does it break?

Contested concepts reveal the frontier between understanding and not-understanding. This is the most productive area for attention in any application context: whether that's a learner working through confusion, a candidate revealing the limits of their knowledge, or an employee whose understanding is uneven.

### 4.4 Claims vs. Evidence

When a person says "I know this," that is a claim event, not a verification event. The framework records both but never conflates them.

The gap between claims and evidence is diagnostic:

- **Overclaiming**: person claims high confidence, evidence shows gaps. In a learning context, this is a calibration opportunity. In hiring, this is critical signal.
- **Underclaiming**: person claims low confidence, evidence shows verified understanding. This is imposter syndrome signal. The system can surface the evidence: "you've demonstrated this from three angles. The data says you own this ground."
- **Calibration growth**: over time, do claims converge with evidence? Growing self-calibration is itself a form of epistemic development. This connects directly to Lorraine Code's thesis: knowing well includes knowing what you don't know.
- **Claim as planning input**: a person's claims about what they know (or don't) help the system prioritize what to verify next. Claims are the starting hypothesis that verification tests.

---

## 5. Architecture: Four Layers

The framework is four layers. Everything else is built on top.

### 5.1 Schema

The shape of trust data. Six primitives:

- **Concept**: a node in the graph
- **Edge**: a typed, weighted connection between concepts
- **Verification event**: an observation of understanding, with provenance
- **Claim event**: a self-reported belief about understanding
- **Trust state**: per concept, per person, derived from events
- **Retraction event**: a correction to a previous event, preserving audit integrity

The schema is the standard. Any implementation in any language that follows this schema produces compatible trust data.

### 5.2 Data

Where trust data lives. An append-only event log. Events are never deleted; only retracted.

The data layer is defined by a store interface, not a specific database. Any database that implements the interface works: SQLite for local/embedded use, Postgres for production, DynamoDB for serverless. The framework doesn't care. The computation layer operates on whatever events the data layer provides.

### 5.3 Computation

What trust data means. This is where Lorraine's opinions live.

**Derivation**: trust state is derived from the event log. Implementations can materialize derived trust state for performance. The event log remains the source of truth, and trust can always be recomputed from events.

**Propagation**: a verification event on one concept ripples across the graph. Five hardcoded rules govern how: verification never propagates as verification (only as inference), inference attenuates with distance, failure propagates aggressively, cross-modality compounds, and time decays trust. These rules cannot be configured. They are integrity constraints.

**Decay**: time erodes confidence. Exponential decay with two modifiers: cross-modality verified concepts decay slower, and structurally important concepts (those with many dependents) decay slower.

**Calibration**: the framework watches itself. It compares predictions to outcomes, tracks its own overconfidence and underconfidence bias, and measures how well a person's claims match their evidence.

**Contestation**: when events contain conflicting evidence, the computation layer doesn't average or resolve. It marks the concept as contested, a first-class state that preserves the tension and reveals the boundary of understanding.

See `docs/how-it-works.md` for concrete examples of each operation.

### 5.4 Query

How you ask questions about trust data. Every query runs through the computation layer. Implementations can read materialized derived state and compute time-sensitive values like decay at read time.

- `getTrustState`: what does this person know about this concept?
- `getBulkTrustState`: what do they know across many concepts?
- `getGraph`: show me the knowledge structure, optionally with trust overlay
- `explainDecision`: why does the system believe this specific thing?
- `calibrate`: how accurate is the model? how calibrated is the person?

---

## 6. What You Build on Top

The four layers are self-sufficient. You can use Lorraine without an LLM, without a UI, without an application. Pipe in structured events and query trust state from a script. For richer interaction, build on top.

### 6.1 Services (Optional)

LLM-powered adapters that generate and interpret the human-facing interactions that produce verification events.

- **generateVerification**: uses trust state + LLM to produce a verification prompt
- **interpretResponse**: translates a person's response into structured trust updates
- **extractImplicitSignals**: mines natural interaction for trust signals

Services vary by application context. A learning service generates Socratic questions. A hiring service generates interview prompts. A certification service generates standardized assessments. They all write to the same framework.

Services are optional. An application that only receives external verification events (CI/CD pipeline, code review tool) doesn't need an LLM at all.

### 6.2 Domains

Portable knowledge graphs that describe what there is to know about a subject. Concepts, edges, and optionally territories and thresholds. The same domain works across any application context. The networking domain used in a learning app is the same networking domain used in a hiring assessment.

See `docs/domain-schema.md` for the content model.

### 6.3 Applications

The context layer. Applications:
- Load domain packages (concepts and edges)
- Read trust state from the query layer
- Group concepts into meaningful clusters (territories, skill areas, milestones)
- Define readiness criteria (thresholds, requirements, gates)
- Manage interaction (conversation, dashboard, assessment flow)
- Present the trust model to people in context-appropriate ways

### 6.4 Making the Trust Model Visible

The framework stores the graph and derived trust state. Applications make it visible. How depends on context:

- A learning app shows a map with trust-colored nodes, verified territory, and thresholds
- A hiring dashboard shows trust state against required competencies
- An onboarding tracker shows progress against milestones
- A team competency view shows aggregate trust across an organization

The invariant (Invariant 3): the person whose understanding is being modeled should be able to see what the system believes about them, why, and challenge it. Applications that hide the trust model from the person violate the framework's integrity constraints.

### 6.5 Thresholds and Readiness

Applications group concepts into meaningful clusters and define boundaries between them. The framework provides trust state. The application interprets that state against its own requirements.

In a learning app, thresholds are invitations: "do you feel like you own this ground?"

In a hiring process, thresholds are requirements: "the organization requires verified trust on these concepts."

In onboarding, thresholds are milestones: "by day 30, these concepts should be verified."

The framework doesn't know about any of this. It provides derived trust state per concept per person. The application provides the meaning.

---

## 7. The Sekiro Principle

This section addresses the relationship between difficulty, growth, and foundational capability. It applies across all application contexts.

### 7.1 The Analogy

In Sekiro, the player doesn't level up to overpower enemies. What changes is the player: their timing, pattern recognition, and composure under pressure. The game doesn't get easier. The player gets more capable. And the proof of capability isn't a stat screen. It's the felt experience of deflecting an attack that would have destroyed you ten hours ago.

Critically: Sekiro doesn't prevent you from walking into a fight you're not ready for. You enter, you get destroyed, and you learn from the destruction. The cost is low. You respawn and try again. The game trusts you to calibrate yourself through experience.

### 7.2 Foundational Capability

Every domain has foundational principles that carry across its concepts. In networking, it's the idea of reliable communication over unreliable channels. In databases, it's the tension between consistency and performance. In security, it's the attacker-defender asymmetry. In management, it's the tradeoff between autonomy and alignment.

These foundational principles are like Sekiro's deflect mechanic. Early concepts teach you the rhythm. Later concepts use the same rhythm with more complex patterns. You're never starting from zero in new territory. You have the foundation.

This is why Lorraine prioritizes depth on foundational concepts over breadth across topics (Default 11). A person who deeply understands acknowledgment-based reliability in TCP can engage with write-ahead logging in databases. Not because they're the same concept, but because the underlying principle transfers.

### 7.3 What Growth Looks Like

Growth is not knowing more things. Growth is the accumulation of trust in your own ability to engage with hard new things. Each concept you verify reinforces foundational principles. Each challenge you face, even the ones where you struggle, adds to the evidence that you can handle difficulty.

Over time, a person doesn't become all-knowing. They become someone who trusts their ability to navigate unfamiliar territory because they've done it before. That proof lives in them, and in the trust model.

### 7.4 New Difficulty is Not Failure

When someone moves into new territory and struggles, this is not a failure of the system. It is the system working correctly. If the foundational principles were genuinely understood, the person has what they need to engage. They might need to retreat. They might need to revisit previous concepts more deeply. But they have the foundation. The evidence shows it. They can always go back.

---

## 8. What It Looks Like in Practice

The same framework, the same trust math, the same invariants, applied across different contexts. The framework doesn't change. The application context determines what you do with the trust model.

### 8.1 Learning: Self-Directed Exploration

Ade opens a learning app built on Lorraine. The networking domain is loaded. He sees the full concept graph: 19 concepts, all untested. He clicks TCP Basics.

The conversation opens. He says "I already know TCP." The framework records this as a claim event. The agent doesn't argue. It asks: "What's your picture of it?"

Ade explains: "It's a layer above IP that helps convey packets unordered, unguaranteed." The framework catches the inversion. TCP provides ordering and guarantees, not the opposite. A fail-side implicit signal is recorded. The trust state remains untested, but now there's evidence of a misconception.

The agent reflects the error back without correcting directly: "You've got the layering right. But there's something inverted in how you're describing what TCP does with those packets."

Ade pauses. Thinks. Corrects himself. The self-correction is recorded as a signal. Over the next twenty minutes, he works through TCP reliability from first principles. The conversation becomes a sandbox, he experiments with code, the agent asks a transfer question ("if you were designing this from scratch, what's the minimum mechanism you'd need?"). By the end, tcp-basics and tcp-acknowledgments are verified. The map updates. He can see the territory he owns.

The claim-evidence gap: he claimed to know TCP, the evidence showed a misconception, and then he demonstrated real understanding. The calibration data is already forming.

### 8.2 Hiring: Technical Interview

A company loads the same networking domain with requirements: "senior backend engineer requires verified trust on tcp-basics, tcp-retransmission, http-request-response, and dns-resolution at transfer-level difficulty minimum."

A candidate sits down. The framework already has some trust data from their learning sessions (the same Lorraine trust map, portable across contexts). TCP basics is already verified from self-directed learning. The interviewer doesn't need to re-test that. The evidence exists.

The interview focuses on the gaps: http-request-response is inferred but not verified. The service layer generates a transfer-level question: "You're debugging a 503 that only happens under load. Walk me through every layer from the browser to the backend where this could originate."

The candidate answers well on the HTTP layer but struggles with connection pooling and TCP backpressure. The framework records: http-request-response demonstrated, tcp-flow-control failed, a contested state forms on tcp-congestion-control (they know the concept but can't apply it under pressure).

The hiring panel doesn't get "strong hire" or "weak hire." They get a trust map: here's what was demonstrated, here's what was claimed but not demonstrated, here's where understanding breaks, here's the evidence for each claim. The candidate sees the same map (Invariant 3).

### 8.3 Onboarding: First 90 Days

A new hire starts. The company loads a domain specific to their internal systems: deployment pipeline, monitoring stack, incident response procedures, codebase architecture. Some concepts overlap with the networking domain. The trust data carries over.

Day 1: most concepts are untested. The onboarding tracker shows milestones: "by day 30, deployment pipeline concepts should be verified."

The new hire doesn't take tests. They do their job. The CI/CD pipeline submits external verification events: first successful deploy (verification on deployment-basics, modality: external:observed), first rollback (verification on rollback-procedure, strong signal because it's a failure-recovery action), first on-call shift (untested; no incident occurred, so no verification event. Honest.)

Day 45: an incident. The new hire leads the response. They identify the root cause correctly (verification on monitoring-fundamentals, modality: external:observed, strong), communicate clearly in the incident channel (implicit signal on incident-communication), but miss a step in the post-mortem (fail-side signal on postmortem-procedure).

The trust map updates. The manager sees the same map the employee sees. The conversation about readiness is grounded in evidence, not impressions: "The deployment and monitoring territory is solid. Incident response is contested: strong on identification and communication, gap in post-mortem process. What do you think?" (Default 8: self-reflection, not judgment.)

### 8.4 What's the Same Across All Three

The framework doesn't know it's being used for learning, hiring, or onboarding. It sees:

- Concepts and edges loaded (the domain)
- Verification events recorded (with modality, result, context, provenance)
- Claim events recorded (self-reported confidence)
- Trust state derived (from events, through computation rules)
- Queries answered (what does this person know, and why?)

The invariants hold in all three contexts. Trust is never inflated. Failure propagates honestly. Every claim traces to evidence. The person can always see the model and challenge it. The application determines what to do with the trust data. The framework guarantees it's honest.

---

## 9. Primitives

These are the irreducible building blocks. Everything composes from these six.

| Primitive | What it is | Why it's irreducible |
|-----------|-----------|---------------------|
| **Concept** | A node in the graph — something a person could know or not know | Without concepts, there's nothing to track trust against |
| **Edge** | A typed, weighted connection between concepts | Without edges, trust stays isolated and can't propagate |
| **Verification event** | A single observation of understanding — what, how, when, result, context | Without events, trust has no evidence |
| **Claim event** | A person's self-reported belief about their own understanding | Without claims, the gap between self-perception and evidence is invisible |
| **Trust state** | Per concept, per person — derived from events + decay + propagation | Without trust state, there's no queryable model (note: derived, not stored) |
| **Retraction event** | A logged correction to a previous event — marks it retracted with reason | Without retractions, the system has no error correction that preserves audit integrity |

Everything else is built by applications on top of these six primitives:

| Application concept | Built from | Example |
|-------------------|-----------|---------|
| Territory / skill area / milestone | A named group of concepts | Learning app groups concepts into "TCP Reliability" |
| Map / dashboard / tracker | Graph + trust state, rendered | Any visual representation of the trust model |
| Threshold / readiness gate / requirement | Trust state compared against criteria | Hiring app requires verified trust on specific concepts |
| Goal / destination / target | A concept or group of concepts to reach | Learning app lets the person declare a goal |
| Path / curriculum / onboarding plan | A suggested route through the graph | Onboarding app sequences concepts by milestone |
| Session / interview / assessment | A bounded interaction producing events | All applications |
| Self-calibration score | Gap between claim events and verification events over time | Measures growth in epistemic self-awareness |

The framework provides the primitives. Applications provide the meaning.

---

## 10. Open Questions

### 10.1 Trust Map Visualization
How do you make a concept graph legible and useful? Graphs are notoriously hard to visualize. This is an application-level design problem but has implications for how the framework exposes graph data.

### 10.2 Concept Granularity
Who decides that "TCP handshake" is one concept versus three ("SYN," "SYN-ACK," "ACK")? Granularity determines how useful the trust model is. Too coarse and you can't diagnose gaps. Too fine and it's noise.

### 10.3 Cold Start
A new person has an empty trust graph. The first interactions must bootstrap the model. A learning app might start with conversation and build organically. A hiring process might start with explicit claims followed by targeted verification. The framework supports both.

### 10.4 The LLM-to-Graph Write Problem
The LLM processes unstructured interaction. The trust graph is structured data. The translation layer between them, extracting trust signals from natural language and writing them accurately to the graph, is where most implementation difficulty will live. The LLM will misclassify signals. Guardrails are needed.

### 10.5 Domain Graph Bootstrapping
Who builds the initial domain knowledge graphs? Options: expert curation (high quality, slow), LLM generation from documentation (fast, variable quality), community contribution (scalable, needs review), organization-specific creation (for internal systems and processes). Likely a combination.

### 10.6 The Encryption Tension
The computation layer can run fully encrypted client-side (Invariant 6: trust state is derived from events, no manual overrides needed). But LLM-powered services need plaintext. The four-layer split makes this manageable. The computation layer has stronger security guarantees than the services layer.

### 10.7 Cross-Domain Principles
Abstract ideas that manifest as different concepts in different domains. Not yet built. When it is, it will enable the strongest form of cross-domain trust inference: recognizing that someone who understands acknowledgment-based reliability in TCP has a foundation for understanding write-ahead logging in databases.

### 10.8 External Verification Quality
When external systems submit verification events, how does the framework assess quality? A successful deploy is weak evidence. A successful incident response is strong evidence. The framework may need to weight external events differently based on source reliability.

### 10.9 Claim Gaming
In adversarial contexts (hiring), people may strategically underclaim or overclaim. The system should treat claims as hypothesis, not confession. The gap between claims and evidence is diagnostic regardless of sincerity. Insincere claims are themselves a signal.

### 10.10 Trust Portability
When a person's trust map moves across contexts (from learning to hiring, from one company to another), how is provenance maintained? Who controls the trust data? What consent model applies? Portability is the framework's strongest value proposition and its hardest governance problem.
