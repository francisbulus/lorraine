# Lorraine — Why LLMs

**Version:** 0.2<br>
**Last Updated:** February 23, 2026

---

## The Core Loop

The framework's richest operation is:

**Observe natural human behavior → Extract structured meaning → Generate natural human interaction**

This is what LLMs do. No other technology makes this loop possible at the quality level the framework requires.

## What the Framework Needs

### On the input side

The framework needs to know what someone understands. The best signal for that is how they talk — what they ask, how they explain things, where they hesitate, when they self-correct, what connections they make unprompted. All of this is unstructured natural language.

Before LLMs, there was no way to extract structured trust signals from a sentence like: *"oh wait, database replication is basically the same consistency problem as distributed caching, right?"*

That sentence reveals transfer-level understanding across two domains. It demonstrates the person has abstracted a principle (consistency guarantees across replicated state) and recognized it in a novel context. A rule-based system can't parse that. An LLM can.

### On the output side

Applications built on the framework need to generate explanations at the right depth, questions along the right difficulty axis, annotations calibrated to what the person already knows, and prompts that feel like conversation rather than UI.

All of this requires generating natural language that is contextually aware of the person's specific state. Before LLMs, you'd need to pre-write thousands of explanations and questions for every concept at every depth for every possible state. With an LLM, you describe what you need — "generate a transfer question about container orchestration for someone who understands process isolation but hasn't seen service discovery" — and get it.

### In the middle

Implicit signal extraction is what makes conversation a viable verification surface rather than a wrapper around structured tests. The `extractImplicitSignals` service — detecting that someone casually used a concept correctly, or asked a question that reveals a hidden gap — is only possible because LLMs can understand the semantic content of natural conversation.

Similarly, claim extraction — parsing "I think I've got the hang of this" or "honestly I'm still shaky on that part" as structured claim events distinct from verification evidence — requires semantic understanding of self-assessment language.

This is what makes every conversation turn both a verification moment and a calibration moment. Without it, verification only happens during explicit tests and claims only happen through forms. With it, the trust model updates continuously from the richest possible signal source.

## What LLMs Make Possible

Three things that were previously impossible:

**1. Conversation as a real verification surface.** Not a chatbot skin over a structured app, but conversation as an actual medium through which the trust model is built and maintained. The person talks naturally. The framework understands.

**2. Continuous implicit verification and claim capture.** Every utterance is a potential trust signal or self-assessment, not just explicit test moments. The person doesn't have to stop to be tested or to formally declare what they know. Observation, interaction, and calibration happen simultaneously.

**3. Contextually generated interactions.** Explanations, questions, annotations, and prompts that are calibrated to this specific person's specific state at this specific moment. Not pre-written. Not templated. Generated for the context.

## What Exists Without LLMs

Without LLMs, you can still build the full framework — the schema, the data layer, the computation rules, the query layer. The four layers are deterministic and have zero LLM dependencies.

You can feed verification events through structured interfaces — multiple choice questions, code execution results, CI/CD pipeline events, exam scores, external observation events. A hiring manager could manually record "candidate demonstrated understanding of incident response during live exercise." An onboarding system could ingest deploy events as verification signals. The framework handles all of this without an LLM touching anything.

But you'd lose the richest signals — integrated use of concepts in natural reasoning, spontaneous self-corrections, cross-domain connections, self-assessment embedded in conversation. The person would be interacting with forms, not having a conversation.

The framework works without LLMs. It works better with them.

## Architectural Implication

This is why the framework separates cleanly into layers:

**The four framework layers** (schema, data, computation, query) are deterministic. No LLM dependency. No probabilistic behavior. The trust math is the trust math regardless of how events arrive. The framework can run fully encrypted client-side. It can process events from a script, a CI/CD pipeline, or a form — no natural language involved.

**Services** (built on top of the framework) are where LLMs live. They translate between natural human interaction and the framework's structured operations. They observe, extract, interpret, and generate. They are optional, pluggable, and replaceable.

This separation matters because:

- The framework's integrity must not depend on any specific model or provider. Models change. The trust math shouldn't.
- LLMs are probabilistic. The framework's computation is deterministic. The boundary between them must be explicit.
- Different applications may use different LLM providers, or no LLM at all. The framework doesn't care.
- The framework can run encrypted. The services layer is where plaintext meets the LLM. Separating them makes the security model clean.

The coupling matters because:

- Without services, the framework is an honest database with good opinions. Correct but limited to structured input.
- Without the framework, an LLM is a chatbot with no memory and no epistemic integrity. Fluent but unreliable.
- Together, they produce something neither can produce alone: a system that has a natural conversation while silently building an honest, structured, auditable model of what someone actually knows.
