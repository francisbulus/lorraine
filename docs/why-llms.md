# Lorraine — Why LLMs

**Version:** 0.1
**Last Updated:** February 22, 2026

---

## The Core Loop

The trust engine's fundamental operation is:

**Observe natural human behavior → Extract structured meaning → Generate natural human interaction**

This is what LLMs do. No other technology makes this loop possible at the quality level the engine requires.

## What the Engine Needs

### On the input side

The trust engine needs to know what someone understands. The best signal for that is how they talk — what they ask, how they explain things, where they hesitate, when they self-correct, what connections they make unprompted. All of this is unstructured natural language.

Before LLMs, there was no way to extract structured trust signals from a sentence like: *"oh, so TCP's retransmission is basically the same idea as write-ahead logging, right?"*

That sentence reveals transfer-level understanding across two domains — networking and databases. It demonstrates the person has abstracted a principle (acknowledgment-based reliability) and recognized it in a novel context. A rule-based system can't parse that. An LLM can.

### On the output side

The system needs to generate explanations at the right depth, questions along the right difficulty axis, annotations calibrated to what the person already knows, and threshold prompts that feel like conversation rather than UI.

All of this requires generating natural language that is contextually aware of the person's specific state. Before LLMs, you'd need to pre-write thousands of explanations and questions for every concept at every depth for every possible state. With an LLM, you describe what you need — "generate a transfer question about TCP reliability for someone who understands acknowledgments but hasn't seen congestion control" — and get it.

### In the middle

The implicit signal extraction is what makes conversation the primary interface rather than a wrapper around structured modes. The `extractImplicitSignals` API — detecting that someone casually used a concept correctly, or asked a question that reveals a hidden gap — is only possible because LLMs can understand the semantic content of natural conversation.

Similarly, claim extraction — parsing "I think I understand this" or "I'm not sure about that part" as structured claim events distinct from verification evidence — requires semantic understanding of self-assessment language.

This is what makes every conversation turn both a verification moment and a calibration moment. Without it, verification only happens during explicit tests and claims only happen through forms. With it, the trust model updates continuously from the richest possible signal source.

## What LLMs Make Possible

Three things that were previously impossible:

**1. Conversation as the real interface.** Not a chatbot skin over a structured app, but conversation as the actual medium through which the trust model is built and maintained. The person talks naturally. The system understands.

**2. Continuous implicit verification and claim capture.** Every utterance is a potential trust signal or self-assessment, not just explicit test moments. The person doesn't have to stop to be tested or to formally declare what they know. Observation, interaction, and calibration happen simultaneously.

**3. Contextually generated interactions.** Explanations, questions, annotations, and prompts that are calibrated to this specific person's specific state at this specific moment. Not pre-written. Not templated. Generated for the context.

## What Exists Without LLMs

Without LLMs, you could still build the trust graph, the decay function, the propagation rules, the verification loop. The engine core's logic is deterministic and doesn't require an LLM.

But you'd have to feed it through rigid interfaces — multiple choice questions, structured input forms, pre-written content, predefined interaction patterns. The person would have to translate their thinking into the system's language. The system would never see the richest signals — integrated use of concepts, natural self-corrections, cross-domain connections, self-assessment embedded in conversation. The person would be interacting with a system, not having a conversation.

The engine core can work without an LLM — with manual input of verification and claim events. But it would be like using an OS through raw system calls instead of a natural interface. Technically possible. Practically unusable for most people.

## Architectural Implication

This is why the architecture has three layers: engine core, engine services, and applications.

- **The engine core** is the source of truth. It owns the trust model, the propagation rules, the decay function, the event log. It is deterministic, auditable, and has zero LLM dependencies.
- **The engine services** are the LLM-powered adapters. They translate between natural human interaction and the core's structured operations. They observe, extract, interpret, and generate. They sit between the core and applications.
- **Applications** orchestrate the experience — conversation, modes, maps, thresholds — using both core and services.

The core/services separation matters because:

- The core's integrity must not depend on any specific model or provider. Models change. The trust math shouldn't.
- LLMs are probabilistic. The core's operations must be deterministic. The boundary between them must be explicit.
- The core can run fully encrypted client-side. The services layer is where plaintext meets the LLM. Separating them makes the encryption tension manageable.
- Different deployment models (cloud vs. self-hosted) may use different LLM providers. Different application contexts (learning vs. hiring vs. certification) may use different service configurations. The core doesn't care.

The coupling matters because:

- Without the services, the core is a database with a good schema. Correct but inert.
- Without the core, the LLM is a chatbot with no memory and no epistemic integrity. Fluent but unreliable.
- Together, they produce something neither can produce alone: a system that has a natural conversation while silently building an honest, structured, auditable model of what someone actually knows.
