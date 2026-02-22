# Lorraine — Foundational Spec

**Version:** 0.2 (Draft)
**Last Updated:** February 22, 2026
**Governs:** This document defines the conceptual foundation. The main spec defines the implementation. Where they conflict, this document governs.

---

## 0. The One-Sentence Version

Lorraine is a verifiable epistemic trust engine — it tracks what someone actually knows, with evidence, provenance, and honest decay, and makes that model transparent and challengeable.

The first application built on Lorraine is a learning OS: a conversational agent that builds a map of what you know, collapses the cost of trying, and gets out of your way so you can discover — not be told — that you understand.

---

## 1. The Core Problem

The problem is not "how do people access learning content." The problem is:

**How does anyone — the learner or any system helping them — actually know that learning happened?**

This is the verification problem. It is unsolved by every major learning tool:

- Courses assume completion equals comprehension.
- Flashcard apps assume recall equals understanding.
- Coding exercises assume passing tests equals knowing why.
- Documentation assumes reading equals learning.

Every one of these is a proxy. None establish ground truth. Without ground truth, everything built on top — adaptive difficulty, personalized pacing, knowledge tracking — is unreliable.

Lorraine exists to solve the verification problem — first as a trust engine, then as the foundation for applications that need honest knowledge assessment. The learning OS is the first such application.

---

## 2. Governing Principles

These eleven principles govern every design decision. They emerged from first-principles reasoning about how humans actually learn, build self-trust, and experience genuine progress. They are not features. They are constraints the system must never violate.

### Principle 1: Trust is the foundational primitive.

The entire system is built on trust — the learner's trust in their own understanding, the agent's trust in its model of the learner, and the mutual calibration between them. Without trust, nothing else works. Every feature, every interaction, every design choice must be evaluated against: "does this increase the accuracy and depth of trust?"

### Principle 2: Self-trust through independent arrival is the core experience.

The learner must feel that they arrived at understanding on their own. Not that they were led there. Not that it was made easy. The feeling of "I learned this" comes from reaching correctness independently, through your own reasoning, in a context different from the one you learned it in. If the system is too present in the moment of understanding, it poisons the self-trust.

### Principle 3: The agent is a mapmaker, not a guide.

The agent's job is to make the terrain of knowledge visible — what's there, how it connects, where you are, where you're headed. It does not walk you through the terrain. It does not tell you which path to take. It shows you the map and lets you navigate. A map empowers without creating dependency.

### Principle 4: Learning is terrain ownership, not path completion.

Knowing a subject is not having walked one path through it. It is being able to navigate the terrain from any starting point and arrive at correctness. A learner who has completed a course has walked a path. A learner who owns the terrain can enter from any direction and still find their way. The system must help learners own terrain, not complete paths.

### Principle 5: The gate is a threshold between territories, not a test.

When the learner reaches the boundary between one area of knowledge and the next, they face a choice: move into new terrain, or turn back and explore more deeply. This threshold is not a test to pass. It is a decision to make. The decision is safe because the learner can always return to known ground.

### Principle 6: The agent prompts self-reflection, not judgment.

The agent never says "you're ready" or "you're not ready." It surfaces the threshold, makes the criteria for readiness visible, and asks: "do you feel like you own this ground?" The act of asking yourself that question is itself a learning moment. The learner decides. The agent informs the decision but does not make it.

### Principle 7: The system collapses the cost of action until self-trust emerges naturally.

Self-trust requires action, but action requires self-trust. The system breaks this paradox by making the cost of trying as low as possible. Failure is cheap. You can always return to solid ground. The map persists. Nothing is lost by attempting. When trying costs almost nothing, even a learner without self-trust will try. And through accumulated experience of useful action — even failed action — self-trust emerges as a byproduct.

### Principle 8: The system is approach-agnostic.

Different learners approach terrain differently. Some seek the high ground first and descend into details. Some start in the valley with concrete specifics and work upward. Some mix approaches fluidly. The system does not privilege one approach over another. It does not become opinionated in the learner's face. Each approach should feel like there is progress. The system's only opinion is that understanding must happen — how the learner gets there is their own.

### Principle 9: Difficulty is sacred.

Learning is not supposed to be easy. The system never artificially flattens the terrain to make it comfortable. Difficulty is what makes self-trust possible — without resistance, there is no relief of independent arrival. Without struggle, the learner can never be sure whether they understood it or whether it was just made easy enough that anyone would have gotten it. The system preserves natural difficulty, never creates artificial difficulty, and never frames difficulty as a problem to be solved.

### Principle 10: The system builds foundational capability, not topical coverage.

Deep understanding of core principles transfers to novel problems. A learner who deeply understands TCP's approach to reliability can engage with any reliability problem, even one they've never seen. The system prioritizes depth on foundational principles over breadth across topics. New difficulty is not a failure of preparation — it is the next challenge, and the learner's foundation is what lets them engage with it. Growth is not knowing more things. Growth is trusting your ability to engage with hard new things.

### Principle 11: Failure is cheap, visible, and navigable.

When the learner fails — and they will, because difficulty is preserved — the system ensures three things: the cost is low (you can try again immediately), the failure is visible (you can see what happened and why), and the path back is clear (the map shows you where you are relative to solid ground). Failure is the most informative event in the system. It reveals the exact boundary of understanding.

---

## 3. The Trust Primitive

### 3.1 What Trust Is

Trust is not a confidence score. It is a richer object that answers:

- **What was verified?** The specific concept or relationship.
- **How was it verified?** Through what modality — answering a question, writing code, drawing a diagram, explaining in prose, using it naturally in conversation.
- **When was it verified?** Recency matters. Knowledge decays.
- **From how many angles?** Single-modality verification is weaker than cross-modality verification. The learner who can answer a question AND write the code AND explain it in their own words owns the terrain more than one who can only do one of those.
- **What was inferred vs. demonstrated?** The system may believe you know X because you demonstrated Y. That inference is useful but it is not the same as demonstration. The system must always know the difference.

### 3.2 Trust Levels

Each concept the learner has encountered exists in one of four trust states:

**Verified** — The learner has directly demonstrated understanding, ideally through multiple modalities. This is the strongest state. It still decays with time.

**Inferred** — The system believes the learner probably understands this based on demonstrated understanding of related concepts. Useful for efficiency, but the system must never treat inference as fact.

**Untested** — The system has no data. The learner may or may not understand this. Intellectual honesty requires distinguishing "untested" from "doesn't know."

**Contested** — The learner has demonstrated understanding in one context but failed in another. This is the most informationally rich state. It reveals the exact boundary of understanding — where the learner's model works and where it breaks. Contested concepts are the highest-priority targets for the system's attention.

### 3.3 The Trust Graph

Knowledge is not a list. It is a graph of concepts connected by relationships — prerequisites, components, analogies, related ideas. The trust graph has three layers:

**The Knowledge Layer** — The structure of the domain itself. Concepts and their relationships. This exists independently of any learner.

**The Verification Layer** — The history of how trust was built. Every grill question, sandbox experiment, written explanation, sketch, and conversational moment that produced a trust signal. This is the audit trail. Every trust claim has a provenance you can trace backward through this layer.

**The Trust Layer** — The learner's personal state overlaid on the domain structure. Each concept carries its trust level, and edges between concepts carry inference strength — how strongly does verified trust in A imply likely trust in B?

The same concept exists in all three layers simultaneously. The power comes from cross-layer queries: "Does this person understand TCP handshakes?" requires checking the domain structure (what does understanding require?), the verification history (what evidence exists?), and the trust state (what's the current level, and is it demonstrated or inferred?).

### 3.4 Trust Propagation Rules

Trust propagation must be conservative. The system should underestimate what the learner knows rather than overestimate.

1. **Verification never propagates as verification.** Demonstrating A may create inference about B, but never verified trust in B. Only direct demonstration produces verification.

2. **Inference attenuates with distance.** If A connects to B connects to C, the inference weakens at each step. Trust does not propagate indefinitely.

3. **Failure propagates aggressively.** If you fail to demonstrate B, and B is a foundation for C, D, and E — then trust in C, D, and E drops, even if they were previously inferred. Failure at a foundation shakes everything above it.

4. **Cross-modality verification compounds.** Demonstrating understanding through grill AND sandbox is stronger than either alone. The system tracks which modalities have been used and seeks verification through unused modalities for important concepts.

5. **Time decays trust.** A concept verified six months ago is not as trustworthy as one verified yesterday. Decay rate varies by concept type and by the depth of original verification.

---

## 4. The Verification Loop

### 4.1 Two-Way Verification

Most learning systems verify in one direction: the system tests the learner. Lorraine verifies in both directions:

**The system verifies the learner** — through grill questions, sandbox experiments, writing prompts, sketch analysis, and conversational probes.

**The learner verifies themselves via the system** — the learner can challenge the system's model at any time. "Test me on this." "I don't think I really know this despite what your model says." "I've learned this outside the system — let me prove it."

Two-way verification keeps the model calibrated from both sides. The learner often has private information the system doesn't — a gut feeling that their understanding is shaky, or knowledge gained outside the system.

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
| Unprompted conversational use | Uses concept naturally without being asked | Strongest |

The system should seek verification through higher-trust modalities for important concepts. A concept verified only through recall is not well-trusted even if the score is high.

### 4.3 The Contested State

When a concept is contested — demonstrated in one context but failed in another — the system does not rush to fix it. Instead it investigates:

- Was the failure a genuine gap, or a framing issue?
- Is the success genuine, or was it pattern-matched without understanding?
- What is the exact boundary — where does understanding work and where does it break?

Contested concepts reveal the frontier between understanding and not-understanding, which is where the most productive learning happens.

---

## 5. The Agent's Role

### 5.1 The Mapmaker

The agent builds and maintains the map. It shows the learner: here is the terrain of this domain. Here is where you are. Here is where you said you want to go. Here are the thresholds between territories. Here is what your trust model looks like — what's verified, what's inferred, what's untested, what's contested.

The agent does not walk the learner through the terrain. It does not prescribe a path. It illuminates the landscape and lets the learner navigate.

### 5.2 The Threshold Prompter

When the learner reaches a threshold between territories, the agent surfaces it. It provides:

1. **Awareness** — "There's a threshold here between A and B."
2. **Criteria** — "Owning territory A means being able to approach it from multiple angles and arrive at correctness."
3. **The question** — "Do you feel like you own it?"
4. **Tools for the unsure** — "Want to test yourself before deciding?"

The agent never makes the readiness judgment. The learner makes the call.

### 5.3 Low-Pressure Support

When the learner has demonstrated understanding but doesn't trust themselves, the agent does not push. It does not say "the data shows you're ready." Instead it makes the evidence visible without making the conclusion:

"You've navigated this from three different directions and arrived at correctness each time. That's yours. But it's your call. Either way, you can always come back."

The key phrase: **you can always come back.** This is the safety net that makes self-trust possible. Moving forward is not irreversible. The map persists. The territory is always there.

### 5.4 The Agent's Epistemics

The agent maintains epistemic honesty at all times:

- Never claims the learner knows something that's only inferred.
- Never hides its own uncertainty.
- Never optimizes for the learner's feelings over accuracy.
- Distinguishes its suggestions from certainty.
- Tracks its own calibration — when it predicts the learner will succeed, does that actually happen at the predicted rate?

When the agent's self-trust is low (too many surprises, poor calibration, stale data), it proactively seeks re-verification: "I haven't tested your understanding of X in a while, and a lot of what I think you know depends on it. Want to do a quick check?"

### 5.5 Conversation as Primary Interface

The primary interface is conversation. The learner talks to the agent. Through conversation:

- The agent builds and updates the trust model.
- The learner expresses goals, asks questions, demonstrates understanding, admits confusion.
- The agent explains, questions, suggests, surfaces thresholds.

The six modalities (explain, sandbox, sketch, grill, write, provision) are not separate applications. They are things the conversation becomes when plain language isn't sufficient:

- "Let me break this down" → explain
- "Want to try it?" → sandbox
- "Can you draw what you mean?" → sketch
- "Let me check something" → grill
- "Explain this back to me in your words" → write
- "Here's a real environment to work in" → provision

These transitions should feel like natural extensions of the conversation, not context switches.

### 5.6 Implicit Verification

The richest trust signals come from natural conversation, not explicit testing:

- The learner uses a concept correctly in passing → strong implicit verification.
- The learner asks a question that reveals a missing prerequisite → implicit gap signal.
- The learner self-corrects mid-sentence → active model-building in progress.
- The learner's questions become more sophisticated → implicit signal of deepening understanding.

The agent extracts trust signals continuously, not only during designated verification moments. Every interaction is both a learning moment and a verification moment.

---

## 6. The Sekiro Principle

This section addresses the relationship between difficulty, growth, and foundational capability.

### 6.1 The Analogy

In Sekiro, the player doesn't level up to overpower enemies. The enemies scale with the player. What changes is the player — their timing, pattern recognition, and composure under pressure. The game doesn't get easier. The player gets more capable. And the proof of capability isn't a stat screen — it's the felt experience of deflecting an attack that would have destroyed you ten hours ago.

Critically: Sekiro doesn't prevent you from walking into a fight you're not ready for. You enter, you get destroyed, and you learn from the destruction. The cost is low — you respawn and try again. The game trusts you to calibrate yourself through experience.

### 6.2 Foundational Capability

Every domain has foundational principles that carry across all its territories. In networking, it's the idea of reliable communication over unreliable channels. In databases, it's the tension between consistency and performance. In security, it's the attacker-defender asymmetry.

These foundational principles are like Sekiro's deflect mechanic. Early concepts teach you the rhythm. Later concepts use the same rhythm with more complex patterns. You're never starting from zero in new territory — you have the foundation. The new terrain is novel, but the way you engage with it is the same way you've been engaging all along, just at a higher level.

### 6.3 What Growth Looks Like

Growth is not knowing more things. Growth is the accumulation of trust in your own ability to engage with hard new things. Each territory you own reinforces the foundational principles. Each threshold you cross — even the ones where you struggled — adds to the evidence that you can handle difficulty.

Over time, the learner doesn't become all-knowing. They become someone who trusts their ability to navigate unfamiliar terrain because they've done it before. The next challenge is scarier, but they've faced scary things and come through. That proof lives in them.

### 6.4 New Difficulty is Not Failure

When a learner moves into new territory and struggles, this is not a failure of the system. It is the system working correctly. New difficulty is the next boss. If the foundational principles were genuinely learned (not memorized, not hand-held through), then the learner has what they need to engage. They might need to retreat. They might need to explore previous terrain more deeply. But they have the foundation. The map persists. They can always come back.

---

## 7. What a Session Feels Like

This section tests whether the principles translate into a coherent product experience. It is a narrative, not a wireframe.

### 7.1 First Session — A New Learner

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

### 7.2 Returning Session — Three Days Later

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

### 7.3 The Difficult Session — Two Weeks In

Ade has been learning for two weeks. He owns significant territory: TCP reliability, flow control, basic congestion control, DNS resolution, HTTP request/response cycles. His map is filling in. Green nodes spreading outward.

He decides to explore TLS and encryption. This is new terrain and it's hard. The math is harder. The concepts are more abstract. He's used to seeing things in packet captures and code. Cryptographic primitives don't visualize as easily.

He struggles. He reads the agent's explanation of public key cryptography and it doesn't click. He tries the sandbox but the code is just calling library functions — he can't see the math underneath the way he could see packets underneath TCP.

He feels stuck. The system doesn't panic. It doesn't simplify. It doesn't offer an easier topic.

**Agent:** "This is hard terrain. Most of it is math that doesn't show itself in code the way TCP does. Different territory, different texture. You can approach it through the math, through the code, or through the problem it's solving. Where do you want to start?"

Ade picks the problem. "Why can't two computers just agree on a password?"

The agent explains the key exchange problem at the intuition level. Two people in a room full of eavesdroppers need to agree on a secret. Ade's eyes light up — this is a reliability problem, like TCP, but for secrecy instead of delivery. The foundational principle — solving a hard problem over an unreliable/hostile channel — transfers. He's not starting from zero. He has the deflect mechanic.

He doesn't understand RSA by the end of the session. But he understands why RSA needs to exist, and he understands the problem it solves. The trust model marks TLS at the intuition level. The terrain is entered. Not owned, but entered. The map shows it.

Ade will come back. Not because of a streak counter. Because he felt the foundation hold under new weight. He felt TCP's principles rhyme with TLS's principles. He felt himself getting more capable, not just more informed.

---

## 8. Primitives Summary

These are the irreducible building blocks. Everything else composes from these.

| Primitive | What it is | Why it's irreducible |
|-----------|-----------|---------------------|
| **Trust object** | A record of verified or inferred understanding, including modality, recency, and strength | Without this, the system has no ground truth |
| **Concept node** | A single unit of knowledge the learner could demonstrate or fail to demonstrate | Without granularity, verification is too coarse |
| **Relationship edge** | A typed, weighted connection between concepts | Without relationships, trust stays isolated |
| **Verification event** | A single interaction where understanding was observed | Without events, trust has no evidence |
| **Decay function** | Time-based degradation of trust | Without decay, the model goes stale |
| **Learner goal** | A declared destination on the map | Without goals, the agent can't show relevant terrain |
| **Conversation turn** | A single exchange between learner and agent | The atomic unit from which everything emerges |
| **Threshold** | A boundary between territories that the learner decides to cross or not | Without thresholds, there's no structure to progress |
| **The map** | The visible, navigable representation of domain structure and learner state | Without the map, the learner has no orientation |

---

## 9. What This Means for the Main Spec

The main spec should be re-evaluated through this foundation:

**Architecture changes:**
- The Trust Engine is the central component, not the Mode Orchestrator.
- The Mode Orchestrator is downstream — it decides which modality to surface based on what the Trust Engine needs.
- The conversation is the primary interface. Modes emerge from conversation.

**Mode reframing:**
- Each mode is a verification surface and a terrain exploration tool. Not a "learning mode."
- The agent transitions between modes because the trust model needs a different kind of signal or the learner's exploration calls for a different medium. Not because of behavioral heuristics.

**UX changes:**
- The map is always accessible. It is the learner's primary orientation tool.
- No gamification. No streaks. No artificial progress metrics. The map IS the progress indicator — territory owned is visible as verified trust. Territory explored but unverified is visible as inferred. Unknown territory is visible as fog.
- The onboarding is a conversation, not a tutorial.
- Thresholds are surfaced by the agent but decided by the learner.

**What stays:**
- The six modalities are the right set of verification surfaces.
- Cross-modality verification compounds trust (Principle 4 of trust propagation).
- Spaced repetition exists but is framed as "the terrain behind you may have shifted — want to check?" not as mandatory review.
- Security requirements are unchanged and potentially strengthened.

**Newly required:**
- A trust dashboard the learner can inspect and challenge.
- Agent self-calibration tracking.
- The contested state as a first-class visible concept.
- Threshold moments explicitly designed into the UX.
- The map as a primary navigation and progress element.

---

## 10. Open Questions

### 10.1 Map Visualization
How do you make a concept graph legible and useful to a non-technical learner? Graphs are notoriously hard to visualize. The map metaphor is powerful but the implementation is an unsolved design problem. Terrain/topographic metaphors may work better than node-and-edge graphs.

### 10.2 Concept Granularity
Who decides that "TCP handshake" is one node versus three ("SYN," "SYN-ACK," "ACK")? Granularity determines how useful the trust model is. Too coarse and you can't diagnose gaps. Too fine and it's noise. The system may need to dynamically adjust granularity — split nodes when more diagnostic precision is needed, merge when the learner clearly owns the territory.

### 10.3 Cold Start
A new learner has an empty trust graph. The first interactions must bootstrap the model without feeling like an intake exam. The session narrative (Section 7.1) proposes starting with conversation and building the model organically. This may be too slow for some learners. The system should offer optional diagnostic assessment for learners who want a faster start.

### 10.4 The LLM-to-Graph Write Problem
The LLM processes unstructured conversation. The trust graph is structured data. The translation layer between them — extracting trust signals from natural language and writing them accurately to the graph — is where most implementation difficulty will live. The LLM will misclassify signals. Guardrails are needed.

### 10.5 Domain Graph Bootstrapping
Who builds the initial domain knowledge graphs? Options: expert curation (high quality, slow), LLM generation from documentation (fast, variable quality), community contribution (scalable, needs review), emergence from learner behavior (organic, cold start problem). Likely a combination, starting with LLM generation refined by expert review.

### 10.6 The Encryption Tension
In cloud deployment, the LLM needs plaintext to generate responses. This conflicts with E2E encryption of the trust model. Options: client-side LLM calls, trusted execution environments, or accepting that the cloud model has a weaker security guarantee. This is unresolved.

### 10.7 Collaborative Learning
Should the system support learning with others? Study groups, pair debugging, shared maps? This is a scope expansion but aligns with how many people actually learn. Deferred to a future version.

### 10.8 Assessment and Proof
Should the system produce verifiable proof of learning? This changes the learner's relationship to the tool. Deferred, with a note that the trust graph itself is a form of proof — it's just not externally verifiable in the current design.
